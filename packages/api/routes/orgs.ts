import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import type { UserPayload } from '../plugins/auth.js';

const orgRoutes: FastifyPluginAsync = async (fastify) => {
    // Helper function to issue session token cookie with updated org context
    const setSessionCookie = (reply: any, payload: UserPayload) => {
        const token = fastify.jwt.sign(payload, { expiresIn: '7d' });
        reply.setCookie('session_token', token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });
        return token;
    };

    // GET /api/orgs - List all organizations current user belongs to
    fastify.get(
        '/orgs',
        {
            preHandler: [fastify.authenticate],
            schema: {
                description: 'Lists all organizations the current authenticated user belongs to.',
                tags: ['Organization'],
            },
        },
        async (request, reply) => {
            try {
                const userId = request.user.id;

                const memberships = await fastify.prisma.organizationMember.findMany({
                    where: { user_id: userId },
                    include: {
                        org: {
                            include: {
                                _count: {
                                    select: { members: true },
                                },
                            },
                        },
                    },
                    orderBy: { joined_at: 'asc' },
                });

                const formatted = await Promise.all(
                    memberships.map(async (m) => {
                        let inviteCode = m.org.invite_code;
                        if (!inviteCode) {
                            inviteCode = `vigil_inv_${crypto.randomBytes(12).toString('hex')}`;
                            try {
                                await fastify.prisma.organization.update({
                                    where: { id: m.org.id },
                                    data: { invite_code: inviteCode },
                                });
                            } catch (e) {
                                // Fallback to slug if update fails
                                inviteCode = m.org.slug;
                            }
                        }

                        return {
                            id: m.org.id,
                            name: m.org.name,
                            slug: m.org.slug,
                            role: m.role,
                            joined_at: m.joined_at,
                            api_key: m.org.api_key,
                            invite_code: inviteCode,
                            member_count: m.org._count.members,
                            is_active: m.org.id === request.user.org_id,
                        };
                    })
                );

                return reply.send({
                    success: true,
                    active_org_id: request.user.org_id,
                    organizations: formatted,
                });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to list organizations');
                return reply.status(500).send({ error: 'Failed to retrieve user organizations' });
            }
        }
    );

    // GET /api/orgs/active - Get details of currently active organization
    fastify.get(
        '/orgs/active',
        {
            preHandler: [fastify.authenticate],
            schema: {
                description: 'Retrieves details, members, and invite code of the active organization.',
                tags: ['Organization'],
            },
        },
        async (request, reply) => {
            try {
                const orgId = request.user.org_id;
                if (!orgId) {
                    return reply.status(404).send({ error: 'No active organization selected' });
                }

                const org = await fastify.prisma.organization.findUnique({
                    where: { id: orgId },
                    include: {
                        members: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        name: true,
                                        picture: true,
                                    },
                                },
                            },
                            orderBy: { joined_at: 'asc' },
                        },
                    },
                });

                if (!org) {
                    return reply.status(404).send({ error: 'Active organization not found' });
                }

                // If org doesn't have an invite code yet, generate one
                let inviteCode = org.invite_code;
                if (!inviteCode) {
                    inviteCode = `vigil_inv_${crypto.randomBytes(12).toString('hex')}`;
                    await fastify.prisma.organization.update({
                        where: { id: org.id },
                        data: { invite_code: inviteCode },
                    });
                }

                return reply.send({
                    success: true,
                    organization: {
                        id: org.id,
                        name: org.name,
                        slug: org.slug,
                        api_key: org.api_key,
                        invite_code: inviteCode,
                        created_at: org.created_at,
                        members: org.members.map((m) => ({
                            id: m.id,
                            user_id: m.user_id,
                            role: m.role,
                            joined_at: m.joined_at,
                            user: m.user,
                        })),
                        current_user_role: request.user.org_role,
                    },
                });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to fetch active organization');
                return reply.status(500).send({ error: 'Failed to retrieve active organization details' });
            }
        }
    );

    // POST /api/orgs - Create a new Organization
    fastify.post(
        '/orgs',
        {
            preHandler: [fastify.authenticate],
            schema: {
                description: 'Creates a new organization and sets it as active in user session.',
                tags: ['Organization'],
                body: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        name: { type: 'string', minLength: 2 },
                        slug: { type: 'string' },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const { name, slug: customSlug } = request.body as { name: string; slug?: string };
                const userId = request.user.id;

                const baseSlug = customSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const slug = `${baseSlug}-${crypto.randomBytes(4).toString('hex')}`;
                const apiKey = `vgl_live_${crypto.randomBytes(24).toString('hex')}`;
                const inviteCode = `vigil_inv_${crypto.randomBytes(12).toString('hex')}`;

                const newOrg = await fastify.prisma.organization.create({
                    data: {
                        name,
                        slug,
                        api_key: apiKey,
                        invite_code: inviteCode,
                    },
                });

                const membership = await fastify.prisma.organizationMember.create({
                    data: {
                        org_id: newOrg.id,
                        user_id: userId,
                        role: 'OWNER',
                    },
                });

                // Update session context to newly created org
                const sessionPayload: UserPayload = {
                    ...request.user,
                    org_id: newOrg.id,
                    org_role: 'OWNER',
                };
                setSessionCookie(reply, sessionPayload);

                return reply.send({
                    success: true,
                    organization: {
                        id: newOrg.id,
                        name: newOrg.name,
                        slug: newOrg.slug,
                        api_key: newOrg.api_key,
                        invite_code: newOrg.invite_code,
                        role: 'OWNER',
                    },
                });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to create organization');
                return reply.status(500).send({ error: err.message || 'Failed to create organization' });
            }
        }
    );

    // POST /api/orgs/switch - Switch active organization context
    fastify.post(
        '/orgs/switch',
        {
            preHandler: [fastify.authenticate],
            schema: {
                description: 'Switches current session context to target organization.',
                tags: ['Organization'],
                body: {
                    type: 'object',
                    required: ['org_id'],
                    properties: {
                        org_id: { type: 'string', format: 'uuid' },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const { org_id } = request.body as { org_id: string };
                const userId = request.user.id;

                const membership = await fastify.prisma.organizationMember.findUnique({
                    where: {
                        org_id_user_id: {
                            org_id: org_id,
                            user_id: userId,
                        },
                    },
                    include: { org: true },
                });

                if (!membership) {
                    return reply.status(403).send({ error: 'You are not a member of this organization' });
                }

                // Update session JWT cookie
                const sessionPayload: UserPayload = {
                    ...request.user,
                    org_id: membership.org_id,
                    org_role: membership.role,
                };
                setSessionCookie(reply, sessionPayload);

                return reply.send({
                    success: true,
                    active_org: {
                        id: membership.org.id,
                        name: membership.org.name,
                        slug: membership.org.slug,
                        role: membership.role,
                    },
                });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to switch organization');
                return reply.status(500).send({ error: 'Failed to switch organization context' });
            }
        }
    );

    // POST /api/orgs/join - Join an organization using an invite code or API key
    fastify.post(
        '/orgs/join',
        {
            preHandler: [fastify.authenticate],
            schema: {
                description: 'Joins an organization using an invite code, slug, or API key.',
                tags: ['Organization'],
                body: {
                    type: 'object',
                    required: ['invite_code'],
                    properties: {
                        invite_code: { type: 'string' },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const { invite_code } = request.body as { invite_code: string };
                const userId = request.user.id;
                const cleanCode = invite_code.trim();

                if (!cleanCode) {
                    return reply.status(400).send({ error: 'Invite code is required' });
                }

                // Match against invite_code, api_key, or slug
                const org = await fastify.prisma.organization.findFirst({
                    where: {
                        OR: [
                            { invite_code: cleanCode },
                            { api_key: cleanCode },
                            { slug: cleanCode },
                        ],
                    },
                });

                if (!org) {
                    return reply.status(404).send({ error: 'Invalid invite code or organization identifier' });
                }

                // Check if user is already a member
                let membership = await fastify.prisma.organizationMember.findUnique({
                    where: {
                        org_id_user_id: {
                            org_id: org.id,
                            user_id: userId,
                        },
                    },
                });

                if (!membership) {
                    membership = await fastify.prisma.organizationMember.create({
                        data: {
                            org_id: org.id,
                            user_id: userId,
                            role: 'MEMBER',
                        },
                    });
                }

                // Switch active session context to joined org
                const sessionPayload: UserPayload = {
                    ...request.user,
                    org_id: org.id,
                    org_role: membership.role,
                };
                setSessionCookie(reply, sessionPayload);

                return reply.send({
                    success: true,
                    organization: {
                        id: org.id,
                        name: org.name,
                        slug: org.slug,
                        role: membership.role,
                    },
                    message: `Successfully joined ${org.name}!`,
                });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to join organization');
                return reply.status(500).send({ error: err.message || 'Failed to join organization' });
            }
        }
    );

    // POST /api/orgs/invite - Refresh or generate invite code for active org
    fastify.post(
        '/orgs/invite',
        {
            preHandler: [fastify.authenticate],
            schema: {
                description: 'Generates or refreshes the invite code for the active organization.',
                tags: ['Organization'],
            },
        },
        async (request, reply) => {
            try {
                const orgId = request.user.org_id;
                const role = request.user.org_role;

                if (!orgId) {
                    return reply.status(400).send({ error: 'No active organization' });
                }

                if (role !== 'OWNER' && role !== 'ADMIN') {
                    return reply.status(403).send({ error: 'Only OWNER or ADMIN can refresh invite codes' });
                }

                const newInviteCode = `vigil_inv_${crypto.randomBytes(12).toString('hex')}`;
                const updated = await fastify.prisma.organization.update({
                    where: { id: orgId },
                    data: { invite_code: newInviteCode },
                });

                return reply.send({
                    success: true,
                    invite_code: updated.invite_code,
                });
            } catch (err: any) {
                fastify.log.error(err, 'Failed to generate invite code');
                return reply.status(500).send({ error: 'Failed to update organization invite code' });
            }
        }
    );
};

export default orgRoutes;
