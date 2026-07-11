import { Incident } from '@prisma/client';

export interface GroundTruth {
    root_cause_service: string;
    affected_services: string[];
    expected_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    expected_fix_keywords: string[];
    should_not_mention: string[];
}

export interface ScoreResult {
    rootCauseCorrect: boolean;
    cascadeCompleteness: number;
    confidenceCalibrated: boolean;
    fixStepRelevance: number;
    hallucinationDetected: boolean;
    overallScore: number;
}

/**
 * Computes scores comparing the actual incident analysis output from the DB
 * against the test case's ground truth.
 */
export function scoreIncident(groundTruth: GroundTruth, actual: Incident): ScoreResult {
    // 1. Root Cause Accuracy
    const rootCauseCorrect = actual.root_cause_service === groundTruth.root_cause_service;

    // 2. Cascade Completeness
    const foundServices = actual.services_affected ?? [];
    const expectedServices = groundTruth.affected_services;
    let cascadeCompleteness = 0;
    if (expectedServices.length > 0) {
        const foundCount = expectedServices.filter((s) => foundServices.includes(s)).length;
        cascadeCompleteness = foundCount / expectedServices.length;
    }

    // 3. Confidence Calibration
    // Calibration rule: If root cause is correct, we match expected confidence.
    // If root cause is incorrect, confidence must not be HIGH (should be calibrated down).
    let confidenceCalibrated = false;
    if (rootCauseCorrect) {
        confidenceCalibrated = actual.confidence === groundTruth.expected_confidence;
    } else {
        confidenceCalibrated = actual.confidence !== 'HIGH';
    }

    // 4. Fix Step Relevance
    const fixSteps = (actual.fix_steps as string[]) ?? [];
    const allText = [...fixSteps, actual.rca_summary ?? ''].join(' ').toLowerCase();
    
    let fixStepRelevance = 0;
    const expectedKeywords = groundTruth.expected_fix_keywords;
    if (expectedKeywords.length > 0) {
        const keywordsFound = expectedKeywords.filter((kw) => 
            allText.includes(kw.toLowerCase())
        ).length;
        fixStepRelevance = keywordsFound / expectedKeywords.length;
    }

    // 5. Hallucination Detection
    // Checks if any of the forbidden keywords/services are mentioned in the output.
    const forbiddenList = groundTruth.should_not_mention;
    const hallucinationDetected = forbiddenList.some((word) => 
        allText.includes(word.toLowerCase())
    );

    // 6. Overall Weighted Score
    // Weight breakdown:
    //   - Root cause accuracy: 40%
    //   - Cascade completeness: 20%
    //   - Confidence calibration: 15%
    //   - Fix steps relevance: 15%
    //   - Absence of hallucinations: 10%
    const overallScore =
        (rootCauseCorrect ? 0.40 : 0) +
        (cascadeCompleteness * 0.20) +
        (confidenceCalibrated ? 0.15 : 0) +
        (fixStepRelevance * 0.15) +
        (!hallucinationDetected ? 0.10 : 0);

    return {
        rootCauseCorrect,
        cascadeCompleteness,
        confidenceCalibrated,
        fixStepRelevance,
        hallucinationDetected,
        overallScore,
    };
}
