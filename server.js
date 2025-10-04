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

// Middleware - CORS Configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'https://backoffice.forthandvale.com',           // Production frontend
            'http://backoffice.forthandvale.com',            // Production frontend (http)
            /^https:\/\/.*\.vercel\.app$/,                   // All Vercel preview deployments
            /^http:\/\/localhost:\d+$/,                      // All localhost ports (development)
        ];

        // Check if origin matches any allowed pattern
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed instanceof RegExp) {
                return allowed.test(origin);
            }
            return allowed === origin;
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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

        // Validate required fields
        if (!email || !fullName || !role || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get the first organization (for now)
        const org = await prisma.org.findFirst();
        if (!org) {
            return res.status(500).json({ error: 'No organization found' });
        }

        // Hash the password before storing
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                orgId: org.id,
                email,
                fullName,
                role: role.toUpperCase(),
                passwordHash,
            }
        });

        const formattedUser = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role.toLowerCase(),
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
        const updates = { ...req.body };

        // Hash password if it's being updated
        if (updates.password) {
            updates.passwordHash = await bcrypt.hash(updates.password, 10);
            delete updates.password; // Remove plain password from updates
        }

        // Convert role to uppercase if provided
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

// Database connection test endpoint
app.get('/api/db-test', async (req, res) => {
    try {
        // Test database connection with a simple query
        await prisma.$queryRaw`SELECT 1`;

        // Check environment variables (masked)
        const dbUrl = process.env.DATABASE_URL || 'NOT SET';
        const directUrl = process.env.DIRECT_URL || 'NOT SET';

        res.json({
            success: true,
            message: 'Database connection successful',
            env: {
                DATABASE_URL: dbUrl ? `${dbUrl.substring(0, 30)}...` : 'NOT SET',
                DIRECT_URL: directUrl ? `${directUrl.substring(0, 30)}...` : 'NOT SET',
                NODE_ENV: process.env.NODE_ENV || 'NOT SET'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database connection failed',
            details: error.message,
            env: {
                DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
                DIRECT_URL: process.env.DIRECT_URL ? 'SET' : 'NOT SET',
                NODE_ENV: process.env.NODE_ENV || 'NOT SET'
            }
        });
    }
});

// Seed endpoint (for initial setup only - remove after use)
app.post('/api/seed', async (req, res) => {
    try {
        // Clear existing data
        await prisma.auditLog.deleteMany();
        await prisma.attachment.deleteMany();
        await prisma.shipment.deleteMany();
        await prisma.orderLine.deleteMany();
        await prisma.order.deleteMany();
        await prisma.quoteLine.deleteMany();
        await prisma.quote.deleteMany();
        await prisma.sample.deleteMany();
        await prisma.leadEvent.deleteMany();
        await prisma.priorityAction.deleteMany();
        await prisma.lead.deleteMany();
        await prisma.user.deleteMany();
        await prisma.org.deleteMany();

        // Create organization
        const org = await prisma.org.create({
            data: {
                name: 'Forth & Vale Leather',
                slug: 'default',
            },
        });

        // Create users
        const superUser = await prisma.user.create({
            data: {
                orgId: org.id,
                email: 'admin@forthvale.com',
                fullName: 'System Administrator',
                role: 'SUPER',
                passwordHash: await bcrypt.hash('admin123', 10),
            },
        });

        const managerUser = await prisma.user.create({
            data: {
                orgId: org.id,
                email: 'manager@forthvale.com',
                fullName: 'Operations Manager',
                role: 'USER',
                passwordHash: await bcrypt.hash('manager123', 10),
            },
        });

        const viewerUser = await prisma.user.create({
            data: {
                orgId: org.id,
                email: 'viewer@forthvale.com',
                fullName: 'Dashboard Viewer',
                role: 'MINI',
                passwordHash: await bcrypt.hash('viewer123', 10),
            },
        });

        res.json({
            success: true,
            message: 'Database seeded successfully',
            data: {
                org: { id: org.id, name: org.name, slug: org.slug },
                users: [
                    { email: superUser.email, role: superUser.role },
                    { email: managerUser.email, role: managerUser.role },
                    { email: viewerUser.email, role: viewerUser.role },
                ],
            },
        });
    } catch (error) {
        console.error('Seed error:', error);
        res.status(500).json({ error: 'Failed to seed database', details: error.message });
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
