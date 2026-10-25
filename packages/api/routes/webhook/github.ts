import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Readable } from "node:stream";
import crypto from "node:crypto";
import { handleGithubWebhook } from "./handler.js";
import { githubWebhookSchema } from "./schemas.js";
import type { GitHubPushPayload } from "../../types/webhook.js";

/**
 * Fastify route registration plugin for GitHub deployment webhooks.
 * Due to the @fastify/autoload directory structure configuration, this route
 * is mounted under: POST /api/webhook/github
 */
export default async function githubWebhookRoutes(fastify: FastifyInstance) {
    fastify.post<{ Body: GitHubPushPayload }>(
        "/github",
        {
            schema: githubWebhookSchema,
            preParsing: async (request: FastifyRequest, reply: FastifyReply, payload: Readable) => {
                const urlObj = new URL(request.url, "http://localhost");
                const apiKey = (request.query as any)?.api_key || urlObj.searchParams.get("api_key") || (request.headers["x-api-key"] as string);
                const orgIdQuery = (request.query as any)?.org_id || urlObj.searchParams.get("org_id");

                let targetOrg: any = null;
                if (apiKey) {
                    targetOrg = await fastify.prisma.organization.findUnique({ where: { api_key: String(apiKey) } });
                } else if (orgIdQuery) {
                    targetOrg = await fastify.prisma.organization.findUnique({ where: { id: String(orgIdQuery) } });
                }

                if (!targetOrg) {
                    targetOrg = (await fastify.prisma.organization.findFirst({
                        where: { slug: 'vigil-demo' },
                    })) || (await fastify.prisma.organization.findFirst({
                        orderBy: { created_at: 'asc' },
                    }));
                }

                (request as any).targetOrgId = targetOrg?.id || null;

                const signature = request.headers["x-hub-signature-256"] as string;
                const isProduction = process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_LOGIN !== 'true';

                if (!signature && isProduction) {
                    request.log.warn("Missing x-hub-signature-256 header on GitHub webhook request.");
                    reply.status(401).send({ success: false, message: "Missing signature header." });
                    throw new Error("Missing signature header.");
                }

                // Consuming payload stream safely
                const chunks: Buffer[] = [];
                for await (const chunk of payload) {
                    chunks.push(chunk as Buffer);
                }
                const rawBuffer = Buffer.concat(chunks);
                const rawBodyStr = rawBuffer.toString("utf-8");

                if (signature) {
                    const secretCandidates: string[] = [
                        targetOrg?.github_webhook_secret,
                        targetOrg?.api_key ? `whsec_${targetOrg.api_key.slice(0, 16)}` : null,
                        process.env.GITHUB_WEBHOOK_SECRET,
                        "development_secret",
                    ].filter((s): s is string => !!s && s.length > 0);

                    let isValid = false;
                    for (const sec of secretCandidates) {
                        const hmac = crypto.createHmac("sha256", sec);
                        const digest = "sha256=" + hmac.update(rawBodyStr).digest("hex");
                        try {
                            if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
                                isValid = true;
                                break;
                            }
                        } catch {
                            // length mismatch or invalid buffer
                        }
                    }

                    if (!isValid) {
                        request.log.warn("Invalid GitHub HMAC signature.");
                        reply.status(403).send({ success: false, message: "Invalid signature." });
                        throw new Error("Invalid signature.");
                    }
                }

                // Creating a new readable stream so fastify's downstream JSON parser can parse the body
                const newStream = new Readable();
                newStream.push(rawBuffer);
                newStream.push(null);
                return newStream;
            },
            preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
                // Short-circuit the standard GitHub 'ping' event to prevent schema validation failures
                if (request.headers["x-github-event"] === "ping") {
                    request.log.info("Received GitHub ping event. Responding with 200 OK.");
                    return reply.status(200).send({ success: true, message: "pong" });
                }
            }
        },
        handleGithubWebhook
    );
}