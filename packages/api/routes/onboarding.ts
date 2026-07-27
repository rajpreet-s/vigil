import type { FastifyPluginAsync } from 'fastify';
import { WebClient } from '@slack/web-api';

const onboardingRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /api/onboarding/status - Check onboarding status & metrics
    fastify.get(
        '/onboarding/status',
        {
            schema: {
                description: 'Returns configuration status of Slack, Webhooks, Topology, and Runbooks.',
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

                const hasSlack = !!botToken;
                const hasTopology = topologyCount > 0;
                const hasRunbooks = runbooksCount > 0;
                const hasWebhooks = anomalyCount > 0;

                const isComplete = hasTopology && hasRunbooks;

                return reply.send({
                    status: 'OK',
                    isComplete,
                    integrations: {
                        slack: {
                            configured: hasSlack,
                            env: {
                                botToken: botToken ? `${botToken.slice(0, 15)}...` : null,
                                incidentsChannel: incidentsChannel || null,
                                oncallUserId: oncallUserId || null,
                                signingSecret: signingSecret ? 'configured' : null,
                            },
                        },
                        prometheus: { configured: hasWebhooks, endpoint: '/api/webhook/alertmanager', anomalyCount },
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

    // POST /api/onboarding/test-slack - Authenticate Slack Bot Token and send test message
    fastify.post(
        '/onboarding/test-slack',
        {
            schema: {
                description: 'Tests Slack Bot authentication via WebClient (auth.test) and sends a verification message.',
                tags: ['Onboarding'],
                body: {
                    type: 'object',
                    properties: {
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
            const token = body.botToken || process.env.SLACK_BOT_TOKEN;
            const targetChannel = body.incidentsChannel || process.env.SLACK_INCIDENTS_CHANNEL || process.env.SLACK_ONCALL_USER_ID;

            if (!token) {
                return reply.status(400).send({
                    success: false,
                    error: 'Missing SLACK_BOT_TOKEN (starts with xoxb-). Provide a valid token in request or .env file.',
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

    // POST /api/onboarding/test-webhook - Test alertmanager webhook ingestion
    fastify.post(
        '/onboarding/test-webhook',
        {
            schema: {
                description: 'Triggers a synthetic Alertmanager alert to verify the webhook receiver.',
                tags: ['Onboarding'],
            },
        },
        async (request, reply) => {
            try {
                const sampleAlert = {
                    receiver: 'vigil-webhook',
                    status: 'firing',
                    alerts: [
                        {
                            status: 'firing',
                            labels: {
                                alertname: 'OnboardingTestAlert',
                                service: 'payment-service',
                                severity: 'warning',
                            },
                            annotations: {
                                summary: 'Verification ping from Vigil Onboarding Wizard',
                            },
                            startsAt: new Date().toISOString(),
                        },
                    ],
                };

                return reply.send({
                    success: true,
                    message: 'Synthetic Alertmanager ping processed successfully!',
                    alert: sampleAlert.alerts[0],
                });
            } catch (err: any) {
                return reply.status(500).send({ success: false, error: err.message });
            }
        }
    );

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
};

export default onboardingRoutes;
