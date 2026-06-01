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
                const signature = request.headers["x-hub-signature-256"] as string;
                if (!signature) {
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

                const secret = process.env.GITHUB_WEBHOOK_SECRET || "development_secret";
                const hmac = crypto.createHmac("sha256", secret);
                const digest = "sha256=" + hmac.update(rawBodyStr).digest("hex");

                let isValid: boolean;
                try {
                    isValid = crypto.timingSafeEqual(
                        Buffer.from(signature),
                        Buffer.from(digest)
                    );
                } catch {
                    isValid = false;
                }

                if (!isValid) {
                    request.log.warn("Invalid GitHub HMAC signature.");
                    reply.status(403).send({ success: false, message: "Invalid signature." });
                    throw new Error("Invalid signature.");
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