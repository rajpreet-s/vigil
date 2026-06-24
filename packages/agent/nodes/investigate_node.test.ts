import { describe, it, expect, vi, beforeEach } from 'vitest';
import { investigate_node } from './investigate_node.js';
import { AgentStateSchema } from '../agentStateSchema.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AIMessage } from '@langchain/core/messages';

// 1. Mock the Google GenAI module
vi.mock('@langchain/google-genai', () => {
    const mockBindTools = vi.fn();
    const mockInvoke = vi.fn();

    class MockChatGoogleGenerativeAI {
        bindTools = mockBindTools;
        invoke = mockInvoke;
        constructor() {
            this.bindTools.mockReturnValue(this);
        }
    }

    return {
        ChatGoogleGenerativeAI: MockChatGoogleGenerativeAI,
    };
});

// 2. Mock downstream tools to prevent actual HTTP/Database queries
vi.mock('../tools/investigationTools.js', () => {
    return {
        queryPrometheusRangeTool: { name: 'query_prometheus_range', invoke: vi.fn().mockResolvedValue('range metric data') },
        queryRelatedMetricsTool: { name: 'query_related_metrics', invoke: vi.fn().mockResolvedValue('related metrics data') },
        getMetricBaselineTool: { name: 'get_metric_baseline', invoke: vi.fn().mockResolvedValue('baseline details') },
        getRecentDeploymentsTool: { name: 'get_recent_deployments', invoke: vi.fn().mockResolvedValue('recent deploy data') },
        makeGetBlastRadiusTool: () => ({ name: 'get_blast_radius', invoke: vi.fn().mockResolvedValue('blast radius results') }),
    };
});

describe('investigate_node', () => {
    let mockLlmInstance: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockLlmInstance = new ChatGoogleGenerativeAI({} as any);
    });

    it('should successfully extract findings when the model returns a final text without tool calls', async () => {
        // Mock Gemini response: No tool calls, returns final findings directly
        const mockResponse = new AIMessage({
            content: `[INVESTIGATION FINDINGS]
  Root cause assessment: payment-service — DB pool exhaustion
  Cause type: resource exhaustion
  Evidence:
    - Database latency spiked to 20s.
  Deploy involved: no`,
        });
        mockLlmInstance.invoke.mockResolvedValue(mockResponse);

        const initialState = {
            incidentId: 'test-incident-uuid',
            rawAnomalies: [
                {
                    id: 'anom-1',
                    service_name: 'payment-service',
                    metric_name: 'db_connections',
                    detected_at: new Date('2024-01-01T10:00:00Z'),
                }
            ],
            causalTimeline: [],
            rootCauseCandidate: null,
            confidence: 'LOW',
            deployCorrelation: null,
            topology: null,
        } as unknown as typeof AgentStateSchema.State;

        const result = await investigate_node(initialState);

        expect(mockLlmInstance.invoke).toHaveBeenCalledTimes(1);
        expect(result.investigationFindings).toContain('[INVESTIGATION FINDINGS]');
        expect(result.investigationFindings).toContain('DB pool exhaustion');
    });

    it('should iterate through tool-calling phases and terminate when done', async () => {
        // Round 1: Model requests a tool call to query_prometheus_range
        const mockResponseRound1 = new AIMessage({
            content: '',
            tool_calls: [
                {
                    name: 'query_prometheus_range',
                    args: { metric: 'http_errors_total', service: 'web', windowMinutes: 30 },
                    id: 'call-1',
                    type: 'tool_call'
                }
            ]
        });

        // Round 2: Model reads the tool result and outputs final text findings
        const mockResponseRound2 = new AIMessage({
            content: `[INVESTIGATION FINDINGS]\nRoot cause assessment: web-service crashed.`,
        });

        mockLlmInstance.invoke
            .mockResolvedValueOnce(mockResponseRound1)
            .mockResolvedValueOnce(mockResponseRound2);

        const initialState = {
            incidentId: 'test-incident-uuid',
            rawAnomalies: [],
            causalTimeline: [],
            rootCauseCandidate: null,
            confidence: 'LOW',
            deployCorrelation: null,
            topology: null,
        } as unknown as typeof AgentStateSchema.State;

        const result = await investigate_node(initialState);

        // Gemini should be invoked twice (Round 1: Request tool, Round 2: Read output & generate findings)
        expect(mockLlmInstance.invoke).toHaveBeenCalledTimes(2);
        expect(result.investigationFindings).toBe('[INVESTIGATION FINDINGS]\nRoot cause assessment: web-service crashed.');
    });

    it('should trigger fallback safety block if MAX_ITERATIONS (5) is exceeded', async () => {
        // Mock Gemini to persistently request tools indefinitely
        const loopToolCall = new AIMessage({
            content: '',
            tool_calls: [
                {
                    name: 'query_prometheus_range',
                    args: { metric: 'test_metric', service: 'test_service', windowMinutes: 10 },
                    id: 'loop-call-id',
                    type: 'tool_call'
                }
            ]
        });
        mockLlmInstance.invoke.mockResolvedValue(loopToolCall);

        const initialState = {
            incidentId: 'test-incident-uuid',
            rawAnomalies: [],
            causalTimeline: [],
            rootCauseCandidate: null,
            confidence: 'LOW',
            deployCorrelation: null,
            topology: null,
        } as unknown as typeof AgentStateSchema.State;

        const result = await investigate_node(initialState);

        // The node should limit iteration to MAX_ITERATIONS (5) and return partial evidence
        expect(mockLlmInstance.invoke).toHaveBeenCalledTimes(5);
        expect(result.investigationFindings).toContain('[INVESTIGATION FINDINGS — PARTIAL');
        expect(result.investigationFindings).toContain('insufficient evidence gathered');
    });
});
