import crypto from 'node:crypto';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import type { UserPayload } from '../plugins/auth.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/auth/google/callback';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';

    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    // GET /api/auth/google
    fastify.get(
        '/auth/google',
        {
            schema: {
                description:
                    'Initiates the Google OAuth2 sign-in flow. Generates a secure CSRF state cookie and redirects the user to the Google Consent Screen.',
                tags: ['Authentication'],
                response: {
                    302: {
                        type: 'null',
                        description: 'Redirects browser to Google account consent page.',
                    },
                    500: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                },
            },
        },
        async (request, reply) => {
        if (!clientId || !clientSecret) {
            fastify.log.error('Google OAuth client configuration missing on server.');
            return reply.status(500).send({
                error: 'Authentication service not configured. Please define GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
            });
        }

        // Generate a random cryptographically secure state parameter to prevent CSRF
        const state = crypto.randomBytes(16).toString('hex');

        reply.setCookie('oauth_state', state, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600, // 10 minutes
        });

        // Generate authorization URL pointing to Google's consent screen
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['openid', 'profile', 'email'],
            state: state,
            prompt: 'select_account',
        });

        return reply.redirect(authUrl);
    });

    // GET /api/auth/google/callback
    fastify.get(
        '/auth/google/callback',
        {
            schema: {
                description:
                    'Callback handler for Google OAuth2. Validates CSRF state, exchanges the auth code for a profile token, upserts the User database record, signs a session JWT, sets it in a secure HttpOnly cookie, and redirects to frontend.',
                tags: ['Authentication'],
                querystring: {
                    type: 'object',
                    properties: {
                        code: { type: 'string', description: 'Google authorization code' },
                        state: { type: 'string', description: 'Anti-forgery state verification token' },
                    },
                    required: ['state'],
                },
                response: {
                    302: {
                        type: 'null',
                        description: 'Redirects to local frontend home page.',
                    },
                    400: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                    500: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                },
            },
        },
        async (request, reply) => {
        const { code, state } = request.query as {
            code?: string;
            state?: string;
        };
        const cookieState = request.cookies.oauth_state;

        // Verify CSRF state matching
        if (!state || !cookieState || state !== cookieState) {
            return reply.status(400).send({
                error: 'Security check failed: State verification mismatch. Possible CSRF attack.',
            });
        }

        // Clear the state cookie immediately
        reply.clearCookie('oauth_state', { path: '/' });

        if (!code) {
            return reply.status(400).send({ error: 'Authorization code missing from redirect' });
        }

        try {
            // Exchange code for ID/access tokens
            const { tokens } = await oauth2Client.getToken(code);
            const idToken = tokens.id_token;

            if (!idToken) {
                return reply.status(400).send({ error: 'Failed to fetch id_token from Google' });
            }

            // Securely verify ID token
            const ticket = (await oauth2Client.verifyIdToken({
                idToken: idToken,
                audience: clientId!,
            })) as any;

            const payload = ticket.getPayload();
            if (!payload) {
                return reply
                    .status(400)
                    .send({ error: 'Invalid token signature or payload metadata' });
            }

            const { sub: googleId, email, name, picture } = payload;
            if (!email) {
                return reply
                    .status(400)
                    .send({ error: 'Google account does not expose email profile scope' });
            }

            // Upsert User profile inside PostgreSQL
            const user = await fastify.prisma.user.upsert({
                where: { googleId },
                update: {
                    email,
                    name: name || null,
                    picture: picture || null,
                },
                create: {
                    googleId,
                    email,
                    name: name || null,
                    picture: picture || null,
                },
            });

            // Check if user has an existing Organization membership
            let membership = await fastify.prisma.organizationMember.findFirst({
                where: { user_id: user.id },
                include: { org: true }
            });

            // If user has no organization yet, auto-provision a default Organization for them
            if (!membership) {
                const orgName = user.name ? `${user.name}'s Org` : `${user.email.split('@')[0]}'s Org`;
                const slug = `${user.email.split('@')[0]}-${crypto.randomBytes(4).toString('hex')}`;
                const apiKey = `vgl_live_${crypto.randomBytes(24).toString('hex')}`;

                const inviteCode = `vigil_inv_${crypto.randomBytes(12).toString('hex')}`;

                const newOrg = await fastify.prisma.organization.create({
                    data: {
                        name: orgName,
                        slug: slug,
                        api_key: apiKey,
                        invite_code: inviteCode,
                    }
                });

                membership = await fastify.prisma.organizationMember.create({
                    data: {
                        org_id: newOrg.id,
                        user_id: user.id,
                        role: 'OWNER',
                    },
                    include: { org: true }
                });
            }

            // Create JWT session
            const sessionPayload: UserPayload = {
                id: user.id,
                email: user.email,
                name: user.name,
                picture: user.picture,
                org_id: membership.org_id,
                org_role: membership.role,
            };

            const token = fastify.jwt.sign(sessionPayload, { expiresIn: '7d' });

            // Set JWT inside HttpOnly cookie
            reply.setCookie('session_token', token, {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60, // 7 days
            });

            return reply.redirect(frontendUrl);
        } catch (err) {
            fastify.log.error(err, 'Google OAuth authentication failed');
            return reply.status(500).send({ error: 'Failed to verify credentials and log in' });
        }
    });

    // GET /api/auth/me
    fastify.get(
        '/auth/me',
        {
            preHandler: [fastify.authenticate],
            schema: {
                description:
                    'Returns session details for the currently logged-in user. Requires valid session_token HttpOnly cookie.',
                tags: ['Authentication'],
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            authenticated: { type: 'boolean' },
                            user: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    email: { type: 'string', format: 'email' },
                                    name: { type: 'string', nullable: true },
                                    picture: { type: 'string', nullable: true },
                                    org_id: { type: 'string', nullable: true },
                                    org_role: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                    401: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                },
            },
        },
        async (request, reply) => {
        return reply.send({
            authenticated: true,
            user: request.user,
        });
    });

    // POST /api/auth/logout
    fastify.post(
        '/auth/logout',
        {
            schema: {
                description:
                    'Logs out the user and clears the secure session cookie.',
                tags: ['Authentication'],
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                        },
                    },
                },
            },
        },
        async (request, reply) => {
        reply.clearCookie('session_token', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
        return reply.send({ success: true });
    });
};

export default authRoutes;
