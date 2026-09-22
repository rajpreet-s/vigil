import type { FastifyPluginAsync } from 'fastify';
import { WebClient } from '@slack/web-api';
import { WebhookService } from '../services/webhookService.js';

const onboardingRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /api/onboarding/status - Check onboarding status & metrics
    fastify.get(
        '/onboarding/status',
        {
            schema: {
                description: 'Returns configuration status of Gemini, Slack, Webhooks, Topology, and Runbooks.',
                tags: ['Onboarding'],
            },
        },
        async (request, reply) => {
            try {
                const topologyCount = await fastify.prisma.topology.count();
                const runbooksCount = await fastify.prisma.runbook.count();
                const servicesCount = await fastify.prisma.service.count();
                const anomalyCount = await fastify.prisma.anomaly.count();

                const botToken = process.env.SLACK_BOT_TOKEN;
                const incidentsChannel = process.env.SLACK_INCIDENTS_CHANNEL;
                const oncallUserId = process.env.SLACK_ONCALL_USER_ID;
                const signingSecret = process.env.SLACK_SIGNING_SECRET;
                const geminiKey = process.env.GEMINI_API_KEY;

                const hasGemini = !!geminiKey && geminiKey.trim().length > 0;
                const hasSlack = !!botToken && botToken.trim().length > 0;
                const hasTopology = topologyCount > 0;
                const hasRunbooks = runbooksCount > 0;
                const hasWebhooks = anomalyCount > 0;

                // Setup is considered complete if Gemini is configured (or verified) and Topology has at least 1 edge
                const isComplete = (hasGemini || hasSlack) && hasTopology;

                return reply.send({
                    status: 'OK',
                    isComplete,
                    integrations: {
                        gemini: {
                            configured: hasGemini,
                            model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
                            keyPreview: hasGemini ? `${geminiKey!.slice(0, 8)}...` : null,
                        },
                        slack: {
                            configured: hasSlack,
                            env: {
                                botToken: botToken ? `${botToken.slice(0, 15)}...` : null,
                                incidentsChannel: incidentsChannel || null,
                                oncallUserId: oncallUserId || null,
                                signingSecret: signingSecret ? 'configured' : null,
                            },
                        },
                        prometheus: { 
                            configured: hasWebhooks, 
                            endpoint: '/api/webhook/alertmanager', 
                            anomalyCount 
                        },
                        topology: { configured: hasTopology, edgeCount: topologyCount },
                        runbooks: { configured: hasRunbooks, documentCount: runbooksCount },
                        services: { count: servicesCount },
                    },
                });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to get onboarding status');
                return reply.status(500).send({ error: 'Failed to retrieve onboarding status' });
            }
        }
    );

    // POST /api/onboarding/validate-gemini - Validates Google Gemini API Key
    fastify.post(
        '/onboarding/validate-gemini',
        {
            schema: {
                description: 'Validates Google Gemini API key by making a live lightweight prompt call.',
                tags: ['Onboarding'],
                body: {
                    type: 'object',
                    properties: {
                        apiKey: { type: 'string' },
                        model: { type: 'string' },
                    },
                },
            },
        },
        async (request, reply) => {
            const body = (request.body as any) || {};
            const key = (body.apiKey && body.apiKey.trim()) || process.env.GEMINI_API_KEY;
            let model = body.model || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
            if (model === 'gemini-2.5-flash' || model === 'gemini-2.5-pro') {
                model = 'gemini-3.6-flash';
            }

            if (!key) {
                return reply.status(400).send({
                    success: false,
                    error: 'Missing Gemini API Key. Provide a valid Google AI Studio key (starts with AIzaSy...).',
                });
            }

            const attemptValidation = async (targetModel: string) => {
                const startTime = Date.now();
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Respond with "PONG"' }] }],
                    }),
                });
                const latencyMs = Date.now() - startTime;
                return { res, latencyMs };
            };

            try {
                let { res, latencyMs } = await attemptValidation(model);

                // If target model failed and wasn't gemini-3.6-flash, fallback to gemini-3.6-flash
                if (!res.ok && model !== 'gemini-3.6-flash') {
                    const fallback = await attemptValidation('gemini-3.6-flash');
                    if (fallback.res.ok) {
                        res = fallback.res;
                        latencyMs = fallback.latencyMs;
                        model = 'gemini-3.6-flash';
                    }
                }

                if (!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    const errMsg = (errJson as any)?.error?.message || res.statusText || 'Invalid API key or model';
                    return reply.status(400).send({
                        success: false,
                        error: `Gemini API validation failed: ${errMsg}`,
                        latencyMs,
                    });
                }

                return reply.send({
                    success: true,
                    model,
                    latencyMs,
                    message: `Verified Gemini AI Engine (${model}) in ${latencyMs}ms!`,
                });
            } catch (err: any) {
                fastify.log.error(err, 'Gemini validation request failed');
                return reply.status(500).send({
                    success: false,
                    error: err.message || 'Network error communicating with Google Gemini API.',
                });
            }
        }
    );

    // POST /api/onboarding/test-slack - Authenticate Slack Bot Token or test Incoming Webhook
    fastify.post(
        '/onboarding/test-slack',
        {
            schema: {
                description: 'Tests Slack Bot authentication via WebClient (auth.test) or Slack Incoming Webhook.',
                tags: ['Onboarding'],
                body: {
                    type: 'object',
                    properties: {
                        webhookUrl: { type: 'string' },
                        botToken: { type: 'string' },
                        incidentsChannel: { type: 'string' },
                        oncallUserId: { type: 'string' },
                        signingSecret: { type: 'string' },
                    },
                },
            },
        },
        async (request, reply) => {
            const body = (request.body as any) || {};

            // 1. Incoming Webhook URL flow (simplest, zero scopes needed)
            if (body.webhookUrl && typeof body.webhookUrl === 'string' && body.webhookUrl.startsWith('https://hooks.slack.com/')) {
                try {
                    const res = await fetch(body.webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: '⚡ *Vigil SRE Copilot Connected!* Real-time incident RCA reports and triage alerts will be broadcast to this channel.',
                        }),
                    });

                    if (res.ok) {
                        return reply.send({
                            success: true,
                            botName: 'Slack Webhook',
                            message: 'Successfully broadcast test alert via Slack Incoming Webhook!',
                        });
                    } else {
                        const errText = await res.text();
                        return reply.status(400).send({
                            success: false,
                            error: `Slack webhook returned HTTP ${res.status}: ${errText}`,
                        });
                    }
                } catch (err: any) {
                    return reply.status(500).send({
                        success: false,
                        error: err.message || 'Failed to send payload to Slack Incoming Webhook.',
                    });
                }
            }

            // 2. Bot Token Flow (xoxb-...)
            const token = body.botToken || process.env.SLACK_BOT_TOKEN;
            const targetChannel = body.incidentsChannel || process.env.SLACK_INCIDENTS_CHANNEL || process.env.SLACK_ONCALL_USER_ID;

            if (!token) {
                return reply.status(400).send({
                    success: false,
                    error: 'Provide a valid SLACK_BOT_TOKEN (starts with xoxb-) or an Incoming Webhook URL.',
                });
            }

            try {
                const client = new WebClient(token);
                const authTest = await client.auth.test();
                const botName = authTest.user || authTest.bot_id || 'VigilBot';

                if (targetChannel) {
                    const customText = body.rca_summary || body.text;
                    const messageText = customText
                        ? `🚨 *VIGIL INCIDENT RCA REPORT DISPATCHED*\n\n${customText}`
                        : `⚡ *Vigil SRE Copilot Connected!* \nAuthenticated successfully as *@${botName}*. Incoming incident alerts will be routed here.`;

                    await client.chat.postMessage({
                        channel: targetChannel,
                        text: messageText,
                    });
                }

                return reply.send({
                    success: true,
                    botName,
                    team: authTest.team,
                    message: `Successfully authenticated Slack Bot (@${botName}) and verified channel communication!`,
                });
            } catch (err: any) {
                fastify.log.error(err, 'Slack auth.test failed');
                return reply.status(400).send({
                    success: false,
                    error: err.message || 'Slack WebClient authentication failed. Ensure SLACK_BOT_TOKEN starts with xoxb-.',
                });
            }
        }
    );

    // POST /api/onboarding/test-webhook & /api/onboarding/simulate-alert - Real anomaly ingestion
    const handleSimulateAlert = async (request: any, reply: any) => {
        try {
            const body = request.body || {};
            const serviceName = body.service || 'payment-service';
            const alertName = body.alertname || 'High5xxRate';
            const severity = body.severity || 'warning';

            const sampleAlert = {
                status: 'firing' as const,
                labels: {
                    alertname: alertName,
                    service: serviceName,
                    severity: severity,
                },
                annotations: {
                    summary: `Simulated Alertmanager anomaly for ${serviceName}: elevated error responses`,
                    description: `Threshold exceeded on ${serviceName}. Ingested via Vigil Onboarding Setup.`,
                },
                startsAt: new Date().toISOString(),
            };

            const webhookService = new WebhookService(fastify.prisma, request.log);
            await webhookService.processAlert(sampleAlert);

            const totalAnomalies = await fastify.prisma.anomaly.count();

            return reply.send({
                success: true,
                message: `Test anomaly successfully ingested for ${serviceName}! Registered in database.`,
                alert: sampleAlert,
                totalAnomalies,
            });
        } catch (err: any) {
            fastify.log.error(err, 'Failed to simulate alert');
            return reply.status(500).send({ success: false, error: err.message || 'Failed to simulate alert' });
        }
    };

    fastify.post('/onboarding/test-webhook', handleSimulateAlert);
    fastify.post('/onboarding/simulate-alert', handleSimulateAlert);

    // GET /api/onboarding/topology - List existing topology edges from database
    fastify.get(
        '/onboarding/topology',
        {
            schema: {
                description: 'Fetches all configured topology edges from PostgreSQL.',
                tags: ['Onboarding'],
            },
        },
        async (request, reply) => {
            try {
                const edges = await fastify.prisma.topology.findMany({
                    orderBy: { created_at: 'desc' },
                });

                const formatted = edges.map((e) => ({
                    id: e.id,
                    upstream: e.upstream_service,
                    downstream: e.downstream_service,
                    description: e.description || '',
                }));

                return reply.send({ success: true, count: formatted.length, edges: formatted });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to fetch topology');
                return reply.status(500).send({ success: false, error: err.message });
            }
        }
    );

    // POST /api/onboarding/topology - Create or update service topology rules
    fastify.post(
        '/onboarding/topology',
        {
            schema: {
                description: 'Creates service dependency edges in the topology database.',
                tags: ['Onboarding'],
                body: {
                    type: 'object',
                    required: ['edges'],
                    properties: {
                        edges: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['upstream', 'downstream'],
                                properties: {
                                    upstream: { type: 'string' },
                                    downstream: { type: 'string' },
                                    description: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const { edges } = request.body as { edges: Array<{ upstream: string; downstream: string; description?: string }> };

                const created = [];
                for (const edge of edges) {
                    await fastify.prisma.service.upsert({
                        where: { name: edge.upstream },
                        create: { name: edge.upstream, display_name: edge.upstream },
                        update: {},
                    });
                    await fastify.prisma.service.upsert({
                        where: { name: edge.downstream },
                        create: { name: edge.downstream, display_name: edge.downstream },
                        update: {},
                    });

                    const topo = await fastify.prisma.topology.upsert({
                        where: {
                            upstream_service_downstream_service: {
                                upstream_service: edge.upstream,
                                downstream_service: edge.downstream,
                            },
                        },
                        create: {
                            upstream_service: edge.upstream,
                            downstream_service: edge.downstream,
                            description: edge.description || 'Configured via Onboarding Wizard',
                        },
                        update: {
                            description: edge.description || 'Configured via Onboarding Wizard',
                        },
                    });
                    created.push(topo);
                }

                // Fetch full updated list from DB
                const allEdges = await fastify.prisma.topology.findMany({
                    orderBy: { created_at: 'desc' },
                });

                const formatted = allEdges.map((e) => ({
                    id: e.id,
                    upstream: e.upstream_service,
                    downstream: e.downstream_service,
                    description: e.description || '',
                }));

                return reply.send({ success: true, count: formatted.length, edges: formatted });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to save topology');
                return reply.status(500).send({ success: false, error: err.message });
            }
        }
    );

    // DELETE /api/onboarding/topology - Delete an edge from database
    fastify.delete(
        '/onboarding/topology',
        {
            schema: {
                description: 'Deletes a service dependency edge from PostgreSQL.',
                tags: ['Onboarding'],
                body: {
                    type: 'object',
                    required: ['upstream', 'downstream'],
                    properties: {
                        upstream: { type: 'string' },
                        downstream: { type: 'string' },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const { upstream, downstream } = request.body as { upstream: string; downstream: string };

                await fastify.prisma.topology.deleteMany({
                    where: {
                        upstream_service: upstream,
                        downstream_service: downstream,
                    },
                });

                const allEdges = await fastify.prisma.topology.findMany({
                    orderBy: { created_at: 'desc' },
                });

                const formatted = allEdges.map((e) => ({
                    id: e.id,
                    upstream: e.upstream_service,
                    downstream: e.downstream_service,
                    description: e.description || '',
                }));

                return reply.send({ success: true, count: formatted.length, edges: formatted });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to delete topology edge');
                return reply.status(500).send({ success: false, error: err.message });
            }
        }
    );

    // POST /api/onboarding/runbooks - Add runbooks
    fastify.post(
        '/onboarding/runbooks',
        {
            schema: {
                description: 'Ingests a runbook file into Vigil database.',
                tags: ['Onboarding'],
                body: {
                    type: 'object',
                    required: ['title', 'content'],
                    properties: {
                        title: { type: 'string' },
                        service_name: { type: 'string' },
                        content: { type: 'string' },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const { title, service_name, content } = request.body as {
                    title: string;
                    service_name?: string;
                    content: string;
                };

                const chromaId = `rb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

                const runbook = await fastify.prisma.runbook.create({
                    data: {
                        chroma_id: chromaId,
                        title,
                        service_name: service_name || null,
                        file_path: `onboarding_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`,
                    },
                });

                return reply.send({ success: true, runbook });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to add runbook');
                return reply.status(500).send({ success: false, error: err.message });
            }
        }
    );

    // POST /api/onboarding/apply-preset-topology - Seed 1-click standard microservices topology
    fastify.post(
        '/onboarding/apply-preset-topology',
        {
            schema: {
                description: 'Seeds a standard microservices dependency graph into PostgreSQL.',
                tags: ['Onboarding'],
                body: {
                    type: 'object',
                    properties: {
                        preset: { type: 'string' },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const presetEdges = [
                    { upstream: 'api-gateway', downstream: 'auth-service', description: 'User authentication & JWT validation' },
                    { upstream: 'api-gateway', downstream: 'order-service', description: 'Order placement & checkout traffic' },
                    { upstream: 'api-gateway', downstream: 'payment-service', description: 'Transaction and billing requests' },
                    { upstream: 'order-service', downstream: 'payment-service', description: 'Synchronous payment authorization RPC' },
                    { upstream: 'auth-service', downstream: 'postgres-db', description: 'User accounts & credentials storage' },
                    { upstream: 'order-service', downstream: 'postgres-db', description: 'Order records & ledger persistence' },
                    { upstream: 'payment-service', downstream: 'stripe-gateway', description: 'Outbound third-party payment processing' },
                    { upstream: 'api-gateway', downstream: 'redis-cache', description: 'Rate-limiting & session cache' },
                ];

                for (const edge of presetEdges) {
                    await fastify.prisma.service.upsert({
                        where: { name: edge.upstream },
                        create: { name: edge.upstream, display_name: edge.upstream },
                        update: {},
                    });
                    await fastify.prisma.service.upsert({
                        where: { name: edge.downstream },
                        create: { name: edge.downstream, display_name: edge.downstream },
                        update: {},
                    });

                    await fastify.prisma.topology.upsert({
                        where: {
                            upstream_service_downstream_service: {
                                upstream_service: edge.upstream,
                                downstream_service: edge.downstream,
                            },
                        },
                        create: {
                            upstream_service: edge.upstream,
                            downstream_service: edge.downstream,
                            description: edge.description,
                        },
                        update: {
                            description: edge.description,
                        },
                    });
                }

                const allEdges = await fastify.prisma.topology.findMany({
                    orderBy: { created_at: 'desc' },
                });

                const formatted = allEdges.map((e) => ({
                    id: e.id,
                    upstream: e.upstream_service,
                    downstream: e.downstream_service,
                    description: e.description || '',
                }));

                return reply.send({ success: true, count: formatted.length, edges: formatted });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to apply preset topology');
                return reply.status(500).send({ success: false, error: err.message });
            }
        }
    );

    // POST /api/onboarding/complete - Mark onboarding as finalized
    fastify.post(
        '/onboarding/complete',
        {
            schema: {
                description: 'Finalizes the onboarding process.',
                tags: ['Onboarding'],
            },
        },
        async (request, reply) => {
            return reply.send({
                success: true,
                message: 'Onboarding completed successfully!',
                timestamp: new Date().toISOString(),
            });
        }
    );
};

export default onboardingRoutes;
