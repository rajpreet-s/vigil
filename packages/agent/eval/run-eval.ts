import * as fs from 'fs/promises';
import * as path from 'path';
import { runTestCase, TestCase, TestCaseResult } from './harness.js';
import { prisma, pool } from '../prisma.js';

async function main() {
    process.env.AGENT_EVAL = 'true';
    console.log('==================================================');
    console.log('            VIGIL AGENT EVALUATION SUITE          ');
    console.log('==================================================');

    const testCasesDir = path.resolve(process.cwd(), 'packages', 'agent', 'eval', 'test-cases');
    
    let files: string[];
    try {
        files = await fs.readdir(testCasesDir);
    } catch (err) {
        console.error(`Failed to read test cases directory at ${testCasesDir}:`, err);
        process.exit(1);
    }

    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    if (jsonFiles.length === 0) {
        console.log('No JSON test cases found.');
        process.exit(0);
    }

    console.log(`Found ${jsonFiles.length} test cases to execute.`);

    const results: TestCaseResult[] = [];

    for (const file of jsonFiles) {
        const filePath = path.join(testCasesDir, file);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const testCase: TestCase = JSON.parse(content);
            const result = await runTestCase(testCase);
            results.push(result);
        } catch (err: any) {
            console.error(`Error processing test case file ${file}:`, err);
            results.push({
                testCaseId: file,
                scenario: 'unknown',
                description: `Failed to load file: ${file}`,
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
            });
        }
    }

    // Disconnect Prisma and close the connection pool after all tests finish
    await prisma.$disconnect();
    await pool.end();

    // Generate evaluation report
    console.log('\n==================================================');
    console.log('              EVALUATION REPORT                   ');
    console.log('==================================================');
    
    let totalScore = 0;
    let totalCorrectRootCause = 0;
    let totalCalibrated = 0;
    let totalNoHallucinations = 0;
    let totalPassed = 0;

    console.log(
        String('Test Case').padEnd(20) + ' | ' +
        String('Scenario').padEnd(16) + ' | ' +
        String('RCA OK').padEnd(6) + ' | ' +
        String('Score').padEnd(5) + ' | ' +
        String('Status')
    );
    console.log('-'.repeat(60));

    for (const r of results) {
        const rcaStatus = r.scores.rootCauseCorrect ? 'PASS' : 'FAIL';
        const overallScoreStr = r.scores.overallScore.toFixed(2);
        const statusStr = r.success ? '✅ PASS' : '❌ FAIL';

        console.log(
            r.testCaseId.padEnd(20) + ' | ' +
            r.scenario.padEnd(16) + ' | ' +
            rcaStatus.padEnd(6) + ' | ' +
            overallScoreStr.padEnd(5) + ' | ' +
            statusStr
        );

        totalScore += r.scores.overallScore;
        if (r.scores.rootCauseCorrect) totalCorrectRootCause++;
        if (r.scores.confidenceCalibrated) totalCalibrated++;
        if (!r.scores.hallucinationDetected) totalNoHallucinations++;
        if (r.success) totalPassed++;
    }

    const count = results.length;
    const avgScore = totalScore / count;
    const rcaAccuracy = (totalCorrectRootCause / count) * 100;
    const calibrationRate = (totalCalibrated / count) * 100;
    const cleanRate = (totalNoHallucinations / count) * 100;

    console.log('-'.repeat(60));
    console.log(`Executed:             ${count} total test cases`);
    console.log(`Overall Pass Rate:    ${((totalPassed / count) * 100).toFixed(1)}% (${totalPassed}/${count})`);
    console.log(`Average Score:        ${avgScore.toFixed(2)} / 1.00`);
    console.log(`RCA Accuracy:         ${rcaAccuracy.toFixed(1)}%`);
    console.log(`Confidence Calibr.:   ${calibrationRate.toFixed(1)}%`);
    console.log(`No Hallucination:     ${cleanRate.toFixed(1)}%`);
    console.log('==================================================');

    if (totalPassed < count) {
        console.log('⚠️ Some evaluation tests failed. Check above logs for details.');
        process.exit(1);
    } else {
        console.log('🎉 All evaluation tests passed successfully!');
        process.exit(0);
    }
}

main().catch((err) => {
    console.error('Fatal error running evaluation suite:', err);
    process.exit(1);
});
