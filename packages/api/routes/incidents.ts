import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';

interface IncidentsQuery {
    cursor?: string;
    limit?: string;
    status?: string;
    severity?: string;
}

const incidentsRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /api/incidents - Fetch paginated incidents scoped to current user's org
    fastify.get(
        '/incidents',
        {
            preHandler: [fastify.authenticate],
            schema: {
                description:
                    'Returns a cursor-paginated list of incidents scoped to the authenticated user\'s organization. Supports infinite scroll pagination and filtering by severity and status.',
                tags: ['Incidents'],
                querystring: {
                    type: 'object',
                    properties: {
                        cursor: { type: 'string', description: 'Base64 encoded pagination cursor from nextCursor' },
                        limit: { type: 'string', description: 'Number of items to fetch (default: 20, max: 50)' },
                        status: { type: 'string', description: 'Filter by incident status (OPEN, PENDING_REVIEW, APPROVED, DISMISSED, PROCESSING, FAILED)' },
                        severity: { type: 'string', description: 'Filter by severity (CRITICAL, WARNING, INFO)' },
                    },
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            data: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        thread_id: { type: 'string' },
                                        status: { type: 'string' },
                                        services_affected: { type: 'array', items: { type: 'string' } },
                                        root_cause_service: { type: 'string', nullable: true },
                                        rca_summary: { type: 'string', nullable: true },
                                        confidence: { type: 'string', nullable: true },
                                        started_at: { type: 'string' },
                                        updated_at: { type: 'string' },
                                        resolved_at: { type: 'string', nullable: true },
                                        anomaly_count: { type: 'number' },
                                    },
                                },
                            },
                            nextCursor: { type: 'string', nullable: true },
                            hasMore: { type: 'boolean' },
                            total: { type: 'number' },
                        },
                    },
                    401: {
                        type: 'object',
                        properties: { error: { type: 'string' } },
                    },
                    500: {
                        type: 'object',
                        properties: { error: { type: 'string' } },
                    },
                },
            },
        },
        async (request, reply) => {
            const orgId = request.user.org_id;

            const { cursor, limit: limitStr, status, severity } = request.query as IncidentsQuery;
            const limit = Math.min(Math.max(parseInt(limitStr || '20', 10), 1), 50);

            // Construct Prisma WHERE clause with mandatory org_id scoping if org_id is available
            const whereClause: Prisma.IncidentWhereInput = {};
            if (orgId) {
                whereClause.org_id = orgId;
            }

            if (status) {
                whereClause.status = status as any;
            }

            if (severity) {
                whereClause.anomalies = {
                    some: {
                        severity: severity.toUpperCase() as any,
                    },
                };
            }

            // Decode cursor if provided
            if (cursor) {
                try {
                    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
                    if (decoded.started_at && decoded.id) {
                        whereClause.OR = [
                            {
                                started_at: {
                                    lt: new Date(decoded.started_at),
                                },
                            },
                            {
                                started_at: new Date(decoded.started_at),
                                id: {
                                    lt: decoded.id,
                                },
                            },
                        ];
                    }
                } catch (err) {
                    fastify.log.warn({ err }, 'Invalid pagination cursor passed');
                }
            }

            try {
                // Fetch page + 1 extra item to accurately calculate hasMore
                const incidents = await fastify.prisma.incident.findMany({
                    where: whereClause,
                    take: limit + 1,
                    orderBy: [
                        { started_at: 'desc' },
                        { id: 'desc' },
                    ],
                    include: {
                        _count: {
                            select: { anomalies: true },
                        },
                    },
                });

                const totalCount = await fastify.prisma.incident.count({
                    where: orgId ? { org_id: orgId } : {},
                });

                const hasMore = incidents.length > limit;
                const items = hasMore ? incidents.slice(0, limit) : incidents;

                let nextCursor: string | null = null;
                if (hasMore && items.length > 0) {
                    const lastItem = items[items.length - 1];
                    if (lastItem) {
                        const cursorPayload = {
                            started_at: lastItem.started_at.toISOString(),
                            id: lastItem.id,
                        };
                        nextCursor = Buffer.from(JSON.stringify(cursorPayload)).toString('base64');
                    }
                }

                const formattedData = items.map((inc) => ({
                    id: inc.id,
                    thread_id: inc.thread_id,
                    status: inc.status,
                    services_affected: inc.services_affected,
                    root_cause_service: inc.root_cause_service,
                    rca_summary: inc.rca_summary,
                    confidence: inc.confidence,
                    started_at: inc.started_at.toISOString(),
                    updated_at: inc.updated_at.toISOString(),
                    resolved_at: inc.resolved_at ? inc.resolved_at.toISOString() : null,
                    anomaly_count: inc._count.anomalies,
                }));

                return reply.send({
                    data: formattedData,
                    nextCursor,
                    hasMore,
                    total: totalCount,
                });
            } catch (err) {
                fastify.log.error(err, 'Failed to fetch incidents list');
                return reply.status(500).send({ error: 'Failed to retrieve incidents list' });
            }
        }
    );

    // GET /api/incidents/:id - Fetch single incident details
    fastify.get(
        '/incidents/:id',
        {
            preHandler: [fastify.authenticate],
            schema: {
                description: 'Fetch detailed diagnostic information for a specific incident by ID.',
                tags: ['Incidents'],
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                    },
                    required: ['id'],
                },
            },
        },
        async (request, reply) => {
            const orgId = request.user.org_id;
            const { id } = request.params as { id: string };

            try {
                const incident = await fastify.prisma.incident.findFirst({
                    where: {
                        id,
                        ...(orgId ? { org_id: orgId } : {}),
                    },
                    include: {
                        anomalies: {
                            select: {
                                id: true,
                                metric_name: true,
                                service_name: true,
                                severity: true,
                                detected_at: true,
                                raw_payload: true,
                            },
                            orderBy: { detected_at: 'asc' },
                        },
                        _count: {
                            select: { anomalies: true },
                        },
                    },
                });

                if (!incident) {
                    return reply.status(404).send({ error: 'Incident not found' });
                }

                // Construct timeline if not stored explicitly
                let timeline = Array.isArray(incident.timeline) ? (incident.timeline as any[]) : [];
                if (timeline.length === 0 && incident.anomalies.length > 0) {
                    timeline = incident.anomalies.map((anom) => ({
                        time: new Date(anom.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        event: `${anom.metric_name} alert triggered on ${anom.service_name}`,
                        status: anom.severity === 'CRITICAL' ? 'error' : anom.severity === 'WARNING' ? 'warning' : 'info',
                    }));

                    if (incident.rca_summary) {
                        timeline.push({
                            time: new Date(incident.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                            event: 'Vigil Agent grouped alerts and finalized RCA report',
                            status: 'info',
                        });
                    }
                }

                const titleLine = incident.rca_summary ? incident.rca_summary.split('\n')[0] : null;
                const title = titleLine
                    ? titleLine.replace(/^#+\s*/, '')
                    : `Outage on ${incident.services_affected.join(', ') || 'Service'}`;

                const firstService = incident.services_affected.length > 0 ? incident.services_affected[0] : 'unknown-service';

                return reply.send({
                    id: incident.id,
                    thread_id: incident.thread_id,
                    title,
                    status: incident.status.toLowerCase(),
                    severity: 'critical',
                    source: incident.root_cause_service || firstService,
                    services_affected: incident.services_affected,
                    root_cause_service: incident.root_cause_service,
                    root_cause_metric: incident.root_cause_metric,
                    rca_summary: incident.rca_summary,
                    confidence: incident.confidence ? parseInt(incident.confidence.replace(/[^0-9]/g, '') || '90', 10) : 90,
                    started_at: incident.started_at.toISOString(),
                    updated_at: incident.updated_at.toISOString(),
                    resolved_at: incident.resolved_at ? incident.resolved_at.toISOString() : null,
                    alertsCount: incident._count.anomalies,
                    timeline,
                    anomalies: incident.anomalies,
                });
            } catch (err) {
                fastify.log.error(err, `Failed to fetch details for incident ${id}`);
                return reply.status(500).send({ error: 'Failed to retrieve incident details' });
            }
        }
    );

    // PATCH /api/incidents/:id - Update incident status (e.g. resolve or dismiss) or RCA summary
    fastify.patch(
        '/incidents/:id',
        {
            preHandler: [fastify.authenticate],
            schema: {
                description: 'Update incident status (APPROVED/resolved, DISMISSED, etc.) or RCA report draft.',
                tags: ['Incidents'],
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                    },
                    required: ['id'],
                },
                body: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        rca_summary: { type: 'string' },
                    },
                },
            },
        },
        async (request, reply) => {
            const orgId = request.user.org_id;
            const { id } = request.params as { id: string };
            const { status, rca_summary } = request.body as { status?: string; rca_summary?: string };

            try {
                const existing = await fastify.prisma.incident.findFirst({
                    where: {
                        id,
                        ...(orgId ? { org_id: orgId } : {}),
                    },
                });

                if (!existing) {
                    return reply.status(404).send({ error: 'Incident not found' });
                }

                const updateData: any = {};
                if (status) {
                    const upperStatus = status.toUpperCase();
                    if (['OPEN', 'PENDING_REVIEW', 'APPROVED', 'DISMISSED', 'PROCESSING', 'FAILED'].includes(upperStatus)) {
                        updateData.status = upperStatus as any;
                        if (upperStatus === 'APPROVED' || upperStatus === 'DISMISSED') {
                            updateData.resolved_at = new Date();
                        }
                    }
                }
                if (rca_summary !== undefined) {
                    updateData.rca_summary = rca_summary;
                }

                const updated = await fastify.prisma.incident.update({
                    where: { id },
                    data: updateData,
                });

                return reply.send({
                    success: true,
                    incident: {
                        id: updated.id,
                        status: updated.status.toLowerCase(),
                        rca_summary: updated.rca_summary,
                        resolved_at: updated.resolved_at ? updated.resolved_at.toISOString() : null,
                    },
                });
            } catch (err) {
                fastify.log.error(err, `Failed to update incident ${id}`);
                return reply.status(500).send({ error: 'Failed to update incident' });
            }
        }
    );
};

export default incidentsRoutes;
