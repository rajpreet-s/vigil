import { prisma } from '../prisma.js';
import { runIncidentAnalysis } from '../graph.js';
import { Severity, IncidentStatus } from '@prisma/client';
import { scoreIncident, GroundTruth, ScoreResult } from './scorer.js';
import { v4 as uuidv4 } from 'uuid';

export interface AnomalyInput {
    metric_name: string;
    service_name: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    offset_seconds: number;
    raw_payload: Record<string, any>;
}

export interface DeploymentInput {
    service_name: string;
    pr_title: string;
    branch: string;
    author: string;
    commit_sha: string;
    files_changed: string[];
    offset_seconds: number;
}

export interface TestCase {
    id: string;
    scenario: string;
    description: string;
    anomalies: AnomalyInput[];
    deployments: DeploymentInput[];
    ground_truth: GroundTruth;
}

export interface TestCaseResult {
    testCaseId: string;
    scenario: string;
    description: string;
    success: boolean;
    scores: ScoreResult;
    error?: string;
    actualRootCause?: string;
    actualConfidence?: string;
    actualFixSteps?: string[];
}

/**
 * Runs a single test case by inserting mocks, executing the agent, scoring, and cleaning up.
 */
export async function runTestCase(testCase: TestCase): Promise<TestCaseResult> {
    const incidentId = uuidv4();
    const baselineTime = new Date();

    console.log(`\n--------------------------------------------------`);
    console.log(`[EVAL] Starting Test Case: ${testCase.id} (${testCase.scenario})`);
    console.log(`[EVAL] Description: ${testCase.description}`);

    const createdAnomalyIds: string[] = [];
    const createdDeployIds: string[] = [];

    try {
        // 1. Ensure all services referenced in test case exist in DB
        const uniqueServices = new Set<string>([
            ...testCase.anomalies.map((a) => a.service_name),
            ...testCase.deployments.map((d) => d.service_name),
        ]);

        for (const serviceName of uniqueServices) {
            await prisma.service.upsert({
                where: { name: serviceName },
                update: {},
                create: {
                    name: serviceName,
                    display_name: serviceName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                },
            });
        }

        // Extract unique service names from anomalies to populate services_affected
        const affectedServicesList = [...new Set(testCase.anomalies.map((a) => a.service_name))];

        // 2. Create the Incident row
        const incident = await prisma.incident.create({
            data: {
                id: incidentId,
                thread_id: incidentId,
                status: IncidentStatus.OPEN,
                services_affected: affectedServicesList,
                started_at: baselineTime,
                updated_at: baselineTime,
            },
        });

        // 3. Create Deployments relative to baselineTime
        for (const dep of testCase.deployments) {
            const deployedAt = new Date(baselineTime.getTime() + dep.offset_seconds * 1000);
            const deployEvent = await prisma.deployEvent.create({
                data: {
                    service_name: dep.service_name,
                    pr_title: dep.pr_title,
                    branch: dep.branch,
                    author: dep.author,
                    commit_sha: dep.commit_sha,
                    files_changed: dep.files_changed as any,
                    deployed_at: deployedAt,
                },
            });
            createdDeployIds.push(deployEvent.id);
        }

        // 4. Create Anomalies relative to baselineTime
        for (const anomaly of testCase.anomalies) {
            const detectedAt = new Date(baselineTime.getTime() + anomaly.offset_seconds * 1000);
            const rawPayloadWithTime = {
                ...anomaly.raw_payload,
                startsAt: detectedAt.toISOString(),
                labels: {
                    service: anomaly.service_name,
                    severity: anomaly.severity.toLowerCase(),
                    alertname: anomaly.raw_payload.alertname || anomaly.metric_name,
                },
            };

            const createdAnomaly = await prisma.anomaly.create({
                data: {
                    metric_name: anomaly.metric_name,
                    service_name: anomaly.service_name,
                    severity: anomaly.severity as Severity,
                    detected_at: detectedAt,
                    raw_payload: rawPayloadWithTime as any,
                    incident_id: incidentId,
                    processed: false,
                },
            });
            createdAnomalyIds.push(createdAnomaly.id);
        }

        console.log(`[EVAL] Provisioned ${createdAnomalyIds.length} anomalies and ${createdDeployIds.length} deployments.`);

        // 5. Run the Agent Graph
        await runIncidentAnalysis(incidentId);

        // 6. Query the resulting Incident
        const finishedIncident = await prisma.incident.findUnique({
            where: { id: incidentId },
        });

        if (!finishedIncident) {
            throw new Error(`Incident ${incidentId} was not found in DB after run.`);
        }

        // 7. Score the results
        const scores = scoreIncident(testCase.ground_truth, finishedIncident);

        console.log(`[EVAL] Results for ${testCase.id}:`);
        console.log(`  - Root Cause Service: ${finishedIncident.root_cause_service} (Expected: ${testCase.ground_truth.root_cause_service}) -> ${scores.rootCauseCorrect ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  - Affected Services: [${finishedIncident.services_affected?.join(', ')}] -> ${scores.cascadeCompleteness * 100}% completeness`);
        console.log(`  - Confidence: ${finishedIncident.confidence} -> calibrated: ${scores.confidenceCalibrated ? '✅ YES' : '❌ NO'}`);
        console.log(`  - Fix Step Relevance: ${Math.round(scores.fixStepRelevance * 100)}%`);
        console.log(`  - Hallucination: ${scores.hallucinationDetected ? '❌ DETECTED' : '✅ NONE'}`);
        console.log(`  - Overall Weighted Score: ${scores.overallScore.toFixed(2)}`);

        return {
            testCaseId: testCase.id,
            scenario: testCase.scenario,
            description: testCase.description,
            success: scores.rootCauseCorrect && scores.overallScore >= 0.70,
            scores,
            actualRootCause: finishedIncident.root_cause_service ?? undefined,
            actualConfidence: finishedIncident.confidence ?? undefined,
            actualFixSteps: (finishedIncident.fix_steps as string[]) ?? undefined,
        };

    } catch (err: any) {
        console.error(`[EVAL] Test Case ${testCase.id} failed with error:`, err);
        return {
            testCaseId: testCase.id,
            scenario: testCase.scenario,
            description: testCase.description,
            success: false,
            scores: {
                rootCauseCorrect: false,
                cascadeCompleteness: 0,
                confidenceCalibrated: false,
                fixStepRelevance: 0,
                hallucinationDetected: false,
                overallScore: 0,
            },
            error: err.message || String(err),
        };

    } finally {
        // 8. DB Cleanup to maintain isolation
        console.log(`[EVAL] Cleaning up database records for this run...`);
        try {
            if (createdAnomalyIds.length > 0) {
                await prisma.anomaly.deleteMany({
                    where: { id: { in: createdAnomalyIds } },
                });
            }
            if (createdDeployIds.length > 0) {
                await prisma.deployEvent.deleteMany({
                    where: { id: { in: createdDeployIds } },
                });
            }
            await prisma.incident.deleteMany({
                where: { id: incidentId },
            });
            console.log(`[EVAL] Cleanup completed.`);
        } catch (cleanupErr) {
            console.error(`[EVAL] DB Cleanup failed:`, cleanupErr);
        }
    }
}
