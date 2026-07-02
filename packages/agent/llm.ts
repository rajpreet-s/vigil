import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseMessage, AIMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { logger } from '../shared/logger.js';

const llmLogger = logger.child({ context: 'llm_client' });

interface InvokeOptions {
    temperature?: number;
    tools?: StructuredToolInterface[];
    responseMimeType?: "application/json" | "text/plain";
}

/**
 * Invokes Gemini LLM with exponential backoff and fallback models
 * (gemini-3.5-flash -> gemini-2.5-flash -> gemini-3.1-flash-lite) to handle transient 503 errors.
 */
export async function invokeLlmWithRetryAndFallback(
    messages: BaseMessage[],
    options: InvokeOptions = {}
): Promise<AIMessage> {
    const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
    const { temperature = 0, tools, responseMimeType } = options;
    let lastError: any = null;

    for (const model of models) {
        let attempts = 0;
        const maxAttempts = 3;
        let delay = 1000;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                llmLogger.info({ model, attempt: attempts }, 'Invoking LLM');
                let llm: any = new ChatGoogleGenerativeAI({
                    model,
                    apiKey: process.env.GEMINI_API_KEY,
                    temperature,
                    maxRetries: 1,
                    maxOutputTokens: 2048,
                    json: responseMimeType === 'application/json' ? true : undefined,
                });

                if (tools && tools.length > 0) {
                    llm = llm.bindTools(tools);
                }

                return await llm.invoke(messages);
            } catch (err: any) {
                lastError = err;
                llmLogger.warn(
                    { model, attempt: attempts, error: err.message || String(err) },
                    'LLM invocation attempt failed'
                );

                if (attempts < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    delay *= 2;
                }
            }
        }
    }

    throw lastError;
}
