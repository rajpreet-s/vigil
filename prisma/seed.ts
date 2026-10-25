import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, IncidentStatus, Severity, OrgRole } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString =
    process.env.DATABASE_URL || 'postgresql://docker:admin@localhost:5433/vigil?schema=public';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    console.log('🌱 Starting Vigil database seed...');

    const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@vigil.internal';
    const demoName = process.env.DEMO_USER_NAME || 'Demo SRE (Local Dev)';
    const googleId = 'vigil-demo-account-id';
    const geminiKey = process.env.GEMINI_API_KEY || null;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const slackUrl = process.env.SLACK_WEBHOOK_URL || null;

    // 1. Upsert Demo User
    const user = await prisma.user.upsert({
        where: { email: demoEmail },
        update: {
            name: demoName,
            googleId,
        },
        create: {
            googleId,
            email: demoEmail,
            name: demoName,
        },
    });
    console.log(`👤 Demo User ready: ${user.email} (${user.id})`);

    // 2. Upsert Demo Organization
    const demoOrg = await prisma.organization.upsert({
        where: { slug: 'vigil-demo' },
        update: {
            name: 'Demo Organization',
            gemini_api_key: geminiKey,
            gemini_model: geminiModel,
            slack_webhook_url: slackUrl,
        },
        create: {
            name: 'Demo Organization',
            slug: 'vigil-demo',
            api_key: 'vgl_live_demo_f7c8c42ea242555d9fb37423acccf6cde2c0c10b',
            invite_code: 'vigil_inv_demo_d0a5310f0835',
            gemini_api_key: geminiKey,
            gemini_model: geminiModel,
            slack_webhook_url: slackUrl,
        },
    });
    console.log(`🏢 Demo Organization ready: ${demoOrg.name} (${demoOrg.id})`);

    // 3. Upsert Owner Membership
    await prisma.organizationMember.upsert({
        where: {
            org_id_user_id: {
                org_id: demoOrg.id,
                user_id: user.id,
            },
        },
        update: { role: OrgRole.OWNER },
        create: {
            org_id: demoOrg.id,
            user_id: user.id,
            role: OrgRole.OWNER,
        },
    });

    // 4. Seed Standard Microservices & Dependency Graph (Topology)
    const presetEdges = [
        {
            upstream: 'api-gateway',
            downstream: 'auth-service',
            description: 'User authentication & JWT validation',
        },
        {
            upstream: 'api-gateway',
            downstream: 'order-service',
            description: 'Order placement & checkout traffic',
        },
        {
            upstream: 'api-gateway',
            downstream: 'payment-service',
            description: 'Transaction and billing requests',
        },
        {
            upstream: 'order-service',
            downstream: 'payment-service',
            description: 'Synchronous payment authorization RPC',
        },
        {
            upstream: 'auth-service',
            downstream: 'postgres-db',
            description: 'User accounts & credentials storage',
        },
        {
            upstream: 'order-service',
            downstream: 'postgres-db',
            description: 'Order records & ledger persistence',
        },
        {
            upstream: 'payment-service',
            downstream: 'stripe-gateway',
            description: 'Outbound third-party payment processing',
        },
        {
            upstream: 'api-gateway',
            downstream: 'redis-cache',
            description: 'Rate-limiting & session cache',
        },
    ];

    for (const edge of presetEdges) {
        await prisma.service.upsert({
            where: { name: edge.upstream },
            update: { org_id: demoOrg.id },
            create: {
                name: edge.upstream,
                display_name: edge.upstream,
                org_id: demoOrg.id,
            },
        });
        await prisma.service.upsert({
            where: { name: edge.downstream },
            update: { org_id: demoOrg.id },
            create: {
                name: edge.downstream,
                display_name: edge.downstream,
                org_id: demoOrg.id,
            },
        });
        await prisma.topology.upsert({
            where: {
                upstream_service_downstream_service: {
                    upstream_service: edge.upstream,
                    downstream_service: edge.downstream,
                },
            },
            update: {
                description: edge.description,
                org_id: demoOrg.id,
            },
            create: {
                upstream_service: edge.upstream,
                downstream_service: edge.downstream,
                description: edge.description,
                org_id: demoOrg.id,
            },
        });
    }
    console.log(`🌐 Seeded ${presetEdges.length} service topology edges for Demo Organization`);

    // 5. Seed SRE Runbooks from user-files/runbooks
    const runbooksDir = path.resolve(__dirname, '../user-files/runbooks');
    if (fs.existsSync(runbooksDir)) {
        const mdFiles = fs.readdirSync(runbooksDir).filter((f) => f.endsWith('.md'));
        for (const file of mdFiles) {
            const filePath = path.join(runbooksDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const nameWithoutExt = path.basename(file, '.md');
            const chromaId = `runbook-${nameWithoutExt.replace(/_/g, '-')}`;

            const titleMatch = content.match(/^#\s+(.+)$/m);
            let title = nameWithoutExt.replace(/_/g, ' ').toUpperCase();
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].replace(/^(?:SRE\s+)?Runbook:\s*/i, '').trim();
            }

            let serviceName: string | null = null;
            if (file.includes('postgres') || file.includes('db')) serviceName = 'postgres-db';
            else if (file.includes('redis')) serviceName = 'redis-cache';
            else if (file.includes('traffic') || file.includes('cpu')) serviceName = 'api-gateway';
            else if (file.includes('memory') || file.includes('disk')) serviceName = 'order-service';

            await prisma.runbook.upsert({
                where: { chroma_id: chromaId },
                update: {
                    title,
                    service_name: serviceName,
                    file_path: file,
                    org_id: demoOrg.id,
                },
                create: {
                    chroma_id: chromaId,
                    title,
                    service_name: serviceName,
                    file_path: file,
                    org_id: demoOrg.id,
                },
            });
        }
        console.log(`📚 Seeded ${mdFiles.length} operational runbooks in PostgreSQL`);
    }

    // 6. Seed an Initial Demo Incident with Real Diagnostics
    const demoIncidentId = 'b0b09572-cef6-4569-bc0f-2c18c255a607';
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const twelveMinutesAgo = new Date(now.getTime() - 12 * 60 * 1000);

    // Create anomaly on postgres-db
    const anomaly1 = await prisma.anomaly.upsert({
        where: {
            metric_name_service_name_detected_at: {
                metric_name: 'pg_stat_activity_connections_high',
                service_name: 'postgres-db',
                detected_at: twelveMinutesAgo,
            },
        },
        update: {
            processed: true,
            incident_id: demoIncidentId,
            org_id: demoOrg.id,
        },
        create: {
            metric_name: 'pg_stat_activity_connections_high',
            service_name: 'postgres-db',
            severity: Severity.CRITICAL,
            detected_at: twelveMinutesAgo,
            raw_payload: {
                summary: 'PostgreSQL connection pool exhausted (100/100 active)',
                value: 100,
                threshold: 90,
            },
            processed: true,
            incident_id: undefined,
            org_id: demoOrg.id,
        },
    });

    // Create anomaly on payment-service (cascade)
    const anomaly2 = await prisma.anomaly.upsert({
        where: {
            metric_name_service_name_detected_at: {
                metric_name: 'High5xxRate',
                service_name: 'payment-service',
                detected_at: tenMinutesAgo,
            },
        },
        update: {
            processed: true,
            incident_id: demoIncidentId,
            org_id: demoOrg.id,
        },
        create: {
            metric_name: 'High5xxRate',
            service_name: 'payment-service',
            severity: Severity.CRITICAL,
            detected_at: tenMinutesAgo,
            raw_payload: {
                summary: 'Elevated 504 Gateway Timeout rate on /v1/charges',
                error_rate: '28.4%',
            },
            processed: true,
            incident_id: undefined,
            org_id: demoOrg.id,
        },
    });

    const rcaSummary = `## RCA: PostgreSQL Connection Pool Exhaustion Cascade

### Q1: What broke?
At ${twelveMinutesAgo.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, client connection acquisition times on **postgres-db** surged from 2ms to 4,800ms due to connection pool saturation (100/100 connections held). This immediately caused synchronous RPC timeouts on downstream **payment-service** and **order-service**, escalating to an elevated 5xx error rate at **api-gateway**.

### Q2: What caused it?
Root cause isolated to **postgres-db** metric \`pg_stat_activity_connections_high\`. A long-running unindexed batch query held idle transaction locks, preventing connection reuse by transaction pools.

### Q3: Did we cause it?
[NO DEPLOY] No production deployment events detected within the 30-minute window prior to the incident start.

### Q4: What do I do?
1. Check active database connections using: \`SELECT count(*), state FROM pg_stat_activity GROUP BY state;\`
2. Terminate idle-in-transaction connections holding locks: \`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < now() - interval '5 minutes';\`
3. Scale max_connections pool size and review application connection pool settings.`;

    const sampleIncident = await prisma.incident.upsert({
        where: { id: demoIncidentId },
        update: {
            status: IncidentStatus.PENDING_REVIEW,
            services_affected: ['postgres-db', 'payment-service', 'order-service', 'api-gateway'],
            root_cause_service: 'postgres-db',
            confidence: 'HIGH',
            rca_summary: rcaSummary,
            org_id: demoOrg.id,
            fix_steps: [
                'Inspect pg_stat_activity for idle-in-transaction locks holding connection slots.',
                'Terminate orphaned transaction locks via pg_terminate_backend(pid).',
                'Increase pgBouncer / application replica connection pool ceilings.',
            ],
            causal_chain: [
                {
                    from: 'postgres-db',
                    to: 'payment-service',
                    reason: 'Synchronous payment ledger commit timeout',
                },
                {
                    from: 'payment-service',
                    to: 'order-service',
                    reason: 'RPC dependency failed with HTTP 504 Gateway Timeout',
                },
                {
                    from: 'order-service',
                    to: 'api-gateway',
                    reason: 'Inbound checkout request dropped due to upstream failure',
                },
            ],
            blast_radius: ['postgres-db', 'payment-service', 'order-service', 'api-gateway'],
            ruled_out: [
                {
                    service: 'redis-cache',
                    reason: 'Redis hit ratio normal (98.4%) with sub-millisecond p99 latency',
                },
                {
                    service: 'stripe-gateway',
                    reason: 'External Stripe endpoint returned HTTP 200 on all outbound handshakes',
                },
            ],
            root_cause_metric: {
                metric: 'pg_stat_activity_connections_high',
                service: 'postgres-db',
                severity: 'CRITICAL',
                value: 100,
                unit: 'connections',
            },
        },
        create: {
            id: demoIncidentId,
            thread_id: demoIncidentId,
            status: IncidentStatus.PENDING_REVIEW,
            services_affected: ['postgres-db', 'payment-service', 'order-service', 'api-gateway'],
            root_cause_service: 'postgres-db',
            confidence: 'HIGH',
            rca_summary: rcaSummary,
            org_id: demoOrg.id,
            started_at: twelveMinutesAgo,
            fix_steps: [
                'Inspect pg_stat_activity for idle-in-transaction locks holding connection slots.',
                'Terminate orphaned transaction locks via pg_terminate_backend(pid).',
                'Increase pgBouncer / application replica connection pool ceilings.',
            ],
            causal_chain: [
                {
                    from: 'postgres-db',
                    to: 'payment-service',
                    reason: 'Synchronous payment ledger commit timeout',
                },
                {
                    from: 'payment-service',
                    to: 'order-service',
                    reason: 'RPC dependency failed with HTTP 504 Gateway Timeout',
                },
                {
                    from: 'order-service',
                    to: 'api-gateway',
                    reason: 'Inbound checkout request dropped due to upstream failure',
                },
            ],
            blast_radius: ['postgres-db', 'payment-service', 'order-service', 'api-gateway'],
            ruled_out: [
                {
                    service: 'redis-cache',
                    reason: 'Redis hit ratio normal (98.4%) with sub-millisecond p99 latency',
                },
                {
                    service: 'stripe-gateway',
                    reason: 'External Stripe endpoint returned HTTP 200 on all outbound handshakes',
                },
            ],
            root_cause_metric: {
                metric: 'pg_stat_activity_connections_high',
                service: 'postgres-db',
                severity: 'CRITICAL',
                value: 100,
                unit: 'connections',
            },
        },
    });

    // Link anomalies to incident
    await prisma.anomaly.update({
        where: { id: anomaly1.id },
        data: { incident_id: sampleIncident.id },
    });
    await prisma.anomaly.update({
        where: { id: anomaly2.id },
        data: { incident_id: sampleIncident.id },
    });

    console.log(`🔥 Seeded Live Demo Incident #${sampleIncident.id.slice(0, 8)} with real anomalies`);
    console.log('✅ Vigil database successfully seeded with complete setup!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
