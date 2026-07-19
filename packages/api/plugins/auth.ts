import fp from "fastify-plugin";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyRequest, FastifyReply } from "fastify";

export interface UserPayload {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
}

// Extend TypeScript typings for Fastify instance and request
declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: UserPayload;
        user: UserPayload;
    }
}

declare module "fastify" {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

export default fp(async (fastify) => {
    const jwtSecret = process.env.JWT_SECRET || "super-secret-dev-key-change-in-production";

    // Register cookie parser
    await fastify.register(cookie);

    // Register JWT plugin
    await fastify.register(jwt, {
        secret: jwtSecret,
    });

    // Authentication decorator
    fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const token = request.cookies.session_token;
            if (!token) {
                return reply.status(401).send({ error: "Unauthorized: Missing session token" });
            }

            // Verify the JWT manually since it is stored in a cookie rather than Authorization header
            const decoded = fastify.jwt.verify<UserPayload>(token);
            request.user = decoded;
        } catch (err) {
            fastify.log.warn(err, "JWT verification failed");
            return reply.status(401).send({ error: "Unauthorized: Invalid or expired session token" });
        }
    });
});
