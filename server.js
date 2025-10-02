import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
    createPriorityAction,
    getPriorityActions,
    getTodaysPriorityActions,
    updatePriorityActionStatus,
    autoGeneratePriorityActions,
    generateLeadBasedPriorityActions,
    getPriorityActionStats
} from './lib/priorityActions.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8787;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://localhost:8082',
        'http://localhost:8080',
        'http://localhost:8081',
        'https://backoffice.forthandvale.com',
        'https://backoffice-forthandvale-27lbbpcq4-hamzas-projects-3115b06e.vercel.app'
    ],
    credentials: true
}));
app.use(express.json());

// Routes
// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password using bcrypt
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const formattedUser = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role.toLowerCase(),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        res.json(formattedUser);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' }
        });

        const formattedUsers = users.map(user => ({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role.toLowerCase(),
            password: user.passwordHash, // Include password for authentication
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }));

        res.json(formattedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.get('/api/users/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const formattedUser = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role.toLowerCase(),
            password: user.passwordHash, // Include password for authentication
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        res.json(formattedUser);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { email, fullName, role, password } = req.body;

        // Get the first organization (for now)
        const org = await prisma.org.findFirst();
        if (!org) {
            return res.status(500).json({ error: 'No organization found' });
        }

        const user = await prisma.user.create({
            data: {
                orgId: org.id,
                email,
                fullName,
                role: role.toUpperCase(),
                passwordHash: password, // In production, hash this
            }
        });

        const formattedUser = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role.toLowerCase(),
            password: user.passwordHash, // Include password for authentication
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        res.status(201).json(formattedUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.role) {
            updates.role = updates.role.toUpperCase();
        }

        const user = await prisma.user.update({
            where: { id },
            data: updates
        });

        const formattedUser = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role.toLowerCase(),
            password: user.passwordHash, // Include password for authentication
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        res.json(formattedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.user.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Helper function to resolve orgId from slug
const resolveOrgId = async (orgIdOrSlug) => {
    if (orgIdOrSlug === 'default') {
        const org = await prisma.org.findUnique({
            where: { slug: 'default' }
        });
        return org ? org.id : orgIdOrSlug;
    }
    return orgIdOrSlug;
};

// Priority Actions API Routes
app.get('/api/priority-actions', async (req, res) => {
    try {
        const { orgId = 'default' } = req.query;
        const resolvedOrgId = await resolveOrgId(orgId);
        const actions = await getPriorityActions(resolvedOrgId);
        res.json(actions);
    } catch (error) {
        console.error('Error fetching priority actions:', error);
        res.status(500).json({ error: 'Failed to fetch priority actions' });
    }
});

app.get('/api/priority-actions/today', async (req, res) => {
    try {
        const { orgId = 'default' } = req.query;
        const resolvedOrgId = await resolveOrgId(orgId);
        const actions = await getTodaysPriorityActions(resolvedOrgId);
        res.json(actions);
    } catch (error) {
        console.error('Error fetching today\'s priority actions:', error);
        res.status(500).json({ error: 'Failed to fetch today\'s priority actions' });
    }
});

app.post('/api/priority-actions', async (req, res) => {
    try {
        const actionData = req.body;
        const action = await createPriorityAction(actionData);
        res.status(201).json(action);
    } catch (error) {
        console.error('Error creating priority action:', error);
        res.status(500).json({ error: 'Failed to create priority action' });
    }
});

app.put('/api/priority-actions/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, completedBy } = req.body;

        const action = await updatePriorityActionStatus(id, status, completedBy);
        res.json(action);
    } catch (error) {
        console.error('Error updating priority action status:', error);
        res.status(500).json({ error: 'Failed to update priority action status' });
    }
});

app.post('/api/priority-actions/auto-generate', async (req, res) => {
    try {
        const { orgId = 'default' } = req.body;
        const resolvedOrgId = await resolveOrgId(orgId);
        const count = await autoGeneratePriorityActions(resolvedOrgId);
        res.json({ message: `Generated ${count} new priority actions`, count });
    } catch (error) {
        console.error('Error auto-generating priority actions:', error);
        res.status(500).json({ error: 'Failed to auto-generate priority actions' });
    }
});

app.post('/api/priority-actions/generate-lead-based', async (req, res) => {
    try {
        const { orgId = 'default' } = req.body;
        const resolvedOrgId = await resolveOrgId(orgId);
        const count = await generateLeadBasedPriorityActions(resolvedOrgId);
        res.json({
            message: `Generated ${count} new lead-based priority actions`,
            count,
            details: 'Created high-priority outreach actions for companies with high visitor counts'
        });
    } catch (error) {
        console.error('Error generating lead-based priority actions:', error);
        res.status(500).json({ error: 'Failed to generate lead-based priority actions' });
    }
});

app.get('/api/priority-actions/stats', async (req, res) => {
    try {
        const { orgId = 'default' } = req.query;
        const resolvedOrgId = await resolveOrgId(orgId);
        const stats = await getPriorityActionStats(resolvedOrgId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching priority action stats:', error);
        res.status(500).json({ error: 'Failed to fetch priority action stats' });
    }
});

// Leads API Routes
app.get('/api/leads', async (req, res) => {
    try {
        const { orgId = 'default' } = req.query;
        const resolvedOrgId = await resolveOrgId(orgId);

        const leads = await prisma.lead.findMany({
            where: { orgId: resolvedOrgId },
            include: {
                owner: true,
                quotes: {
                    select: {
                        id: true,
                        quoteNo: true,
                        status: true
                    }
                },
                samples: {
                    select: {
                        id: true,
                        status: true
                    }
                },
                orders: {
                    select: {
                        id: true,
                        orderNo: true,
                        status: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(leads);
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

app.post('/api/leads', async (req, res) => {
    try {
        const leadData = req.body;
        const resolvedOrgId = await resolveOrgId(leadData.orgId || 'default');

        const lead = await prisma.lead.create({
            data: {
                ...leadData,
                orgId: resolvedOrgId
            },
            include: {
                owner: true,
                quotes: true,
                samples: true,
                orders: true
            }
        });

        res.status(201).json(lead);
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ error: 'Failed to create lead' });
    }
});

app.put('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const lead = await prisma.lead.update({
            where: { id },
            data: updateData,
            include: {
                owner: true,
                quotes: true,
                samples: true,
                orders: true
            }
        });

        res.json(lead);
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ error: 'Failed to update lead' });
    }
});

app.delete('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.lead.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
