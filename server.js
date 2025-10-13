import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import multer from 'multer';
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
import {
    parseExcelFile,
    calculatePriorityScore,
    getPriorityLevel,
    generateActionDetails
} from './lib/excelProcessor.js';
import { parsePricingExcel, validatePricingImport } from './lib/pricingExcelParser.js';
import { PricingCalculator } from './lib/pricingCalculator.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8787;

// Configure multer for file uploads (store in memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Accept only Excel files
        const allowedMimes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/octet-stream'
        ];

        if (allowedMimes.includes(file.mimetype) ||
            file.originalname.endsWith('.xlsx') ||
            file.originalname.endsWith('.xls')) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
        }
    }
});

// Middleware - CORS Configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'https://backoffice.forthandvale.com',           // Production frontend
            'http://backoffice.forthandvale.com',            // Production frontend (http)
            'http://localhost:3000',                         // Local frontend development
            'https://localhost:3000',                        // Local frontend development (https)
            /^https:\/\/.*\.vercel\.app$/,                   // All Vercel preview deployments
            /^http:\/\/localhost:\d+$/,                      // All other localhost ports (development)
            /^https:\/\/localhost:\d+$/,                     // All other localhost ports (https)
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
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

// Excel Upload Endpoint - Upload Excel file and auto-generate priority actions
app.post('/api/leads/upload-excel', upload.single('file'), async (req, res) => {
    try {
        // Validate file upload
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`📊 Processing Excel file: ${req.file.originalname}`);

        // Parse Excel file
        const parseResult = parseExcelFile(req.file.buffer);

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Failed to parse Excel file',
                details: parseResult.error
            });
        }

        const { leads } = parseResult;

        if (leads.length === 0) {
            return res.status(400).json({ error: 'No valid leads found in Excel file' });
        }

        // Get organization (use default for now)
        const org = await prisma.org.findFirst({
            where: { slug: 'default' }
        });

        if (!org) {
            return res.status(500).json({ error: 'Organization not found' });
        }

        // Track processing results
        const results = {
            processed: leads.length,
            leadsCreated: 0,
            leadsUpdated: 0,
            actionsCreated: 0,
            errors: [],
            priorityBreakdown: {
                URGENT: 0,
                HIGH: 0,
                MEDIUM: 0,
                LOW: 0
            }
        };

        // Process each lead
        for (const leadData of leads) {
            try {
                // Check if lead already exists (by company name)
                const existingLead = await prisma.lead.findFirst({
                    where: {
                        orgId: org.id,
                        company: leadData.company
                    }
                });

                let lead;

                if (existingLead) {
                    // Update existing lead
                    lead = await prisma.lead.update({
                        where: { id: existingLead.id },
                        data: {
                            contactName: leadData.contacts[0]?.name || existingLead.contactName,
                            contactEmail: existingLead.contactEmail || `contact@${leadData.company.toLowerCase().replace(/\s+/g, '')}.com`,
                            tags: leadData.buyerRoles,
                            notes: `Visitor Count: ${leadData.visitorCount}\nLinkedIn: ${leadData.linkedinCompany}\nWebsite: ${leadData.website}`,
                            status: 'NEW'
                        }
                    });
                    results.leadsUpdated++;
                } else {
                    // Create new lead
                    lead = await prisma.lead.create({
                        data: {
                            orgId: org.id,
                            title: `${leadData.company} - ${leadData.visitorCount} visits`,
                            company: leadData.company,
                            contactName: leadData.contacts[0]?.name || 'Unknown',
                            contactEmail: `contact@${leadData.company.toLowerCase().replace(/\s+/g, '')}.com`,
                            contactPhone: null,
                            source: 'Excel Import',
                            tags: leadData.buyerRoles,
                            priority: leadData.visitorCount >= 6 ? 5 : leadData.visitorCount >= 4 ? 4 : 3,
                            status: 'NEW',
                            notes: `Visitor Count: ${leadData.visitorCount}\nLinkedIn: ${leadData.linkedinCompany}\nWebsite: ${leadData.website}`
                        }
                    });
                    results.leadsCreated++;
                }

                // Calculate priority score
                const score = calculatePriorityScore(leadData);
                const priorityInfo = getPriorityLevel(score);
                const { title, description } = generateActionDetails(leadData, score, priorityInfo);

                // Calculate due date
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + priorityInfo.daysUntilDue);

                // Create priority action
                const action = await prisma.priorityAction.create({
                    data: {
                        orgId: org.id,
                        leadId: lead.id,
                        type: priorityInfo.actionType,
                        priority: priorityInfo.priority,
                        title,
                        description,
                        dueDate,
                        status: 'PENDING',
                        metadata: {
                            visitorCount: leadData.visitorCount,
                            score,
                            source: 'Excel Import',
                            contacts: leadData.contacts,
                            buyerRoles: leadData.buyerRoles
                        }
                    }
                });

                results.actionsCreated++;
                results.priorityBreakdown[priorityInfo.priority]++;

                console.log(`✅ Created action for ${leadData.company} (Score: ${score}, Priority: ${priorityInfo.priority})`);

            } catch (error) {
                console.error(`❌ Error processing lead ${leadData.company}:`, error);
                results.errors.push({
                    company: leadData.company,
                    error: error.message
                });
            }
        }

        // Return summary
        res.json({
            success: true,
            message: `Processed ${results.processed} leads from Excel file`,
            results
        });

    } catch (error) {
        console.error('Excel upload error:', error);
        res.status(500).json({
            error: 'Failed to process Excel file',
            details: error.message
        });
    }
});

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

// ==================== PRICING MODULE API ====================

// Middleware to check RBAC for rate management
const requireSuper = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user || user.role !== 'SUPER') {
        return res.status(403).json({ error: 'Super User access required' });
    }

    req.user = user;
    next();
};

// Upload and parse pricing Excel
app.post('/api/pricing/imports', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'User ID required' });
        }

        const importName = req.body.name || `Import ${new Date().toISOString()}`;

        console.log(`📊 Processing pricing Excel: ${req.file.originalname}`);

        // Parse Excel
        const parseResult = parsePricingExcel(req.file.buffer);

        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Failed to parse Excel file',
                details: parseResult.error
            });
        }

        const { items, errors } = parseResult;

        if (items.length === 0) {
            return res.status(400).json({
                error: 'No valid items found in Excel file',
                errors
            });
        }

        // Validate items
        const validation = validatePricingImport(items);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Validation failed',
                errors: validation.errors,
                warnings: validation.warnings
            });
        }

        // Create import record
        const importRecord = await prisma.import.create({
            data: {
                name: importName,
                createdById: userId
            }
        });

        // Process items - upsert products and create import items
        const createdItems = [];
        for (const item of items) {
            // Upsert product
            const product = await prisma.product.upsert({
                where: { sku: item.sku },
                update: {
                    name: item.name,
                    hsCode: item.hsCode,
                    weightKg: item.weightKg,
                    volumeM3: item.volumeM3
                },
                create: {
                    sku: item.sku,
                    name: item.name,
                    hsCode: item.hsCode,
                    weightKg: item.weightKg,
                    volumeM3: item.volumeM3
                }
            });

            // Create import item
            const importItem = await prisma.importItem.create({
                data: {
                    importId: importRecord.id,
                    productId: product.id,
                    purchasePricePkr: item.purchasePricePkr,
                    units: item.units
                }
            });

            createdItems.push(importItem);
        }

        res.json({
            success: true,
            import: {
                id: importRecord.id,
                name: importRecord.name,
                createdAt: importRecord.createdAt,
                itemsCount: createdItems.length
            },
            validation: {
                totalRows: parseResult.totalRows,
                validRows: parseResult.validRows,
                invalidRows: parseResult.invalidRows,
                warnings: validation.warnings
            }
        });

    } catch (error) {
        console.error('Pricing import error:', error);
        res.status(500).json({
            error: 'Failed to process pricing import',
            details: error.message
        });
    }
});

// Get all imports
app.get('/api/pricing/imports', async (req, res) => {
    try {
        const imports = await prisma.import.findMany({
            include: {
                createdBy: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                _count: {
                    select: {
                        items: true,
                        pricingRuns: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(imports);
    } catch (error) {
        console.error('Error fetching imports:', error);
        res.status(500).json({ error: 'Failed to fetch imports' });
    }
});

// Get single import with items
app.get('/api/pricing/imports/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const importRecord = await prisma.import.findUnique({
            where: { id },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!importRecord) {
            return res.status(404).json({ error: 'Import not found' });
        }

        res.json(importRecord);
    } catch (error) {
        console.error('Error fetching import:', error);
        res.status(500).json({ error: 'Failed to fetch import' });
    }
});

// Create pricing run
app.post('/api/pricing/runs', async (req, res) => {
    try {
        const {
            importId,
            destination,
            incoterm,
            fxDate,
            marginMode,
            marginValue,
            freightModel,
            insuranceModel,
            feesOverrides,
            thresholdToggles,
            rounding
        } = req.body;

        // Validate required fields
        if (!importId || !destination || !incoterm || !marginMode || marginValue === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify import exists
        const importRecord = await prisma.import.findUnique({
            where: { id: importId }
        });

        if (!importRecord) {
            return res.status(404).json({ error: 'Import not found' });
        }

        // Create pricing run with placeholder snapshot (will be updated after calculation)
        const pricingRun = await prisma.pricingRun.create({
            data: {
                importId,
                destination,
                incoterm,
                fxDate: fxDate === 'latest' ? new Date() : new Date(fxDate),
                marginMode,
                marginValue,
                freightModel,
                insuranceModel,
                feesOverrides: feesOverrides || {},
                thresholdToggles: thresholdToggles || {},
                rounding: rounding || {},
                snapshotRates: {} // Will be updated by calculate
            }
        });

        res.status(201).json({
            success: true,
            pricingRun: {
                id: pricingRun.id,
                importId: pricingRun.importId,
                destination: pricingRun.destination,
                incoterm: pricingRun.incoterm,
                createdAt: pricingRun.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating pricing run:', error);
        res.status(500).json({
            error: 'Failed to create pricing run',
            details: error.message
        });
    }
});

// Calculate pricing for a run
app.post('/api/pricing/runs/:id/calculate', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Get pricing run
        const pricingRun = await prisma.pricingRun.findUnique({
            where: { id }
        });

        if (!pricingRun) {
            return res.status(404).json({ error: 'Pricing run not found' });
        }

        // Prepare run config
        const runConfig = {
            destination: pricingRun.destination,
            incoterm: pricingRun.incoterm,
            fxDate: pricingRun.fxDate,
            marginMode: pricingRun.marginMode,
            marginValue: parseFloat(pricingRun.marginValue),
            freightModel: pricingRun.freightModel,
            insuranceModel: pricingRun.insuranceModel,
            feesOverrides: pricingRun.feesOverrides,
            thresholdToggles: pricingRun.thresholdToggles,
            rounding: pricingRun.rounding
        };

        // Calculate pricing
        const { results, snapshotRates } = await PricingCalculator.calculateImportPricing(
            pricingRun.importId,
            runConfig
        );

        // Delete existing items for this run
        await prisma.pricingRunItem.deleteMany({
            where: { pricingRunId: id }
        });

        // Create pricing run items
        for (const result of results) {
            await prisma.pricingRunItem.create({
                data: {
                    pricingRunId: id,
                    importItemId: result.importItemId,
                    breakdownJson: result.breakdownJson,
                    basePkr: result.basePkr,
                    sellingPrice: result.sellingPrice,
                    landedCost: result.landedCost,
                    marginPct: result.marginPct
                }
            });
        }

        // Update pricing run with snapshot
        await prisma.pricingRun.update({
            where: { id },
            data: {
                snapshotRates
            }
        });

        // Get paginated results
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const items = await prisma.pricingRunItem.findMany({
            where: { pricingRunId: id },
            include: {
                importItem: {
                    include: {
                        product: true
                    }
                }
            },
            skip,
            take: parseInt(limit),
            orderBy: { createdAt: 'asc' }
        });

        const totalItems = results.length;

        // Calculate totals
        const totals = results.reduce((acc, item) => {
            acc.totalBasePkr += parseFloat(item.basePkr);
            acc.totalLandedCost += parseFloat(item.landedCost);
            acc.totalSellingPrice += parseFloat(item.sellingPrice);
            return acc;
        }, {
            totalBasePkr: 0,
            totalLandedCost: 0,
            totalSellingPrice: 0
        });

        totals.averageMarginPct = (totals.totalSellingPrice - totals.totalLandedCost) / totals.totalSellingPrice;

        res.json({
            success: true,
            pricingRunId: id,
            items,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalItems,
                pages: Math.ceil(totalItems / parseInt(limit))
            },
            totals,
            snapshotRates
        });

    } catch (error) {
        console.error('Error calculating pricing:', error);
        res.status(500).json({
            error: 'Failed to calculate pricing',
            details: error.message
        });
    }
});

// Get pricing run results
app.get('/api/pricing/runs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const pricingRun = await prisma.pricingRun.findUnique({
            where: { id },
            include: {
                import: {
                    include: {
                        createdBy: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        if (!pricingRun) {
            return res.status(404).json({ error: 'Pricing run not found' });
        }

        // Get paginated items
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const items = await prisma.pricingRunItem.findMany({
            where: { pricingRunId: id },
            include: {
                importItem: {
                    include: {
                        product: true
                    }
                }
            },
            skip,
            take: parseInt(limit),
            orderBy: { createdAt: 'asc' }
        });

        const totalItems = await prisma.pricingRunItem.count({
            where: { pricingRunId: id }
        });

        // Calculate totals
        const allItems = await prisma.pricingRunItem.findMany({
            where: { pricingRunId: id }
        });

        const totals = allItems.reduce((acc, item) => {
            acc.totalBasePkr += parseFloat(item.basePkr);
            acc.totalLandedCost += parseFloat(item.landedCost);
            acc.totalSellingPrice += parseFloat(item.sellingPrice);
            return acc;
        }, {
            totalBasePkr: 0,
            totalLandedCost: 0,
            totalSellingPrice: 0
        });

        totals.averageMarginPct = totalItems > 0 ?
            (totals.totalSellingPrice - totals.totalLandedCost) / totals.totalSellingPrice : 0;

        res.json({
            pricingRun,
            items,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalItems,
                pages: Math.ceil(totalItems / parseInt(limit))
            },
            totals
        });

    } catch (error) {
        console.error('Error fetching pricing run:', error);
        res.status(500).json({ error: 'Failed to fetch pricing run' });
    }
});

// Get all pricing runs
app.get('/api/pricing/runs', async (req, res) => {
    try {
        const runs = await prisma.pricingRun.findMany({
            include: {
                import: {
                    select: {
                        id: true,
                        name: true,
                        createdAt: true
                    }
                },
                _count: {
                    select: {
                        items: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(runs);
    } catch (error) {
        console.error('Error fetching pricing runs:', error);
        res.status(500).json({ error: 'Failed to fetch pricing runs' });
    }
});

// Update pricing run (e.g., save name)
app.patch('/api/pricing/runs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const pricingRun = await prisma.pricingRun.update({
            where: { id },
            data: { name }
        });

        res.json({ success: true, pricingRun });
    } catch (error) {
        console.error('Error updating pricing run:', error);
        res.status(500).json({ error: 'Failed to update pricing run' });
    }
});

// Duplicate pricing run
app.post('/api/pricing/runs/:id/duplicate', async (req, res) => {
    try {
        const { id } = req.params;

        // Get original pricing run
        const originalRun = await prisma.pricingRun.findUnique({
            where: { id },
            include: {
                items: true
            }
        });

        if (!originalRun) {
            return res.status(404).json({ error: 'Pricing run not found' });
        }

        // Create new pricing run with same config
        const newRun = await prisma.pricingRun.create({
            data: {
                name: originalRun.name ? `${originalRun.name} (Copy)` : null,
                importId: originalRun.importId,
                destination: originalRun.destination,
                incoterm: originalRun.incoterm,
                fxDate: originalRun.fxDate,
                marginMode: originalRun.marginMode,
                marginValue: originalRun.marginValue,
                freightModel: originalRun.freightModel,
                insuranceModel: originalRun.insuranceModel,
                feesOverrides: originalRun.feesOverrides,
                thresholdToggles: originalRun.thresholdToggles,
                rounding: originalRun.rounding,
                snapshotRates: originalRun.snapshotRates
            }
        });

        // Copy all pricing run items
        for (const item of originalRun.items) {
            await prisma.pricingRunItem.create({
                data: {
                    pricingRunId: newRun.id,
                    importItemId: item.importItemId,
                    breakdownJson: item.breakdownJson,
                    basePkr: item.basePkr,
                    sellingPrice: item.sellingPrice,
                    landedCost: item.landedCost,
                    marginPct: item.marginPct
                }
            });
        }

        res.status(201).json({
            runId: newRun.id,
            status: 'completed', // Already has items copied
            createdAt: newRun.createdAt
        });
    } catch (error) {
        console.error('Error duplicating pricing run:', error);
        res.status(500).json({ error: 'Failed to duplicate pricing run' });
    }
});

// Export pricing run results as CSV
app.get('/api/pricing/runs/:id/export', async (req, res) => {
    try {
        const { id } = req.params;
        const { format = 'csv' } = req.query;

        if (format !== 'csv') {
            return res.status(400).json({ error: 'Only CSV format is supported' });
        }

        // Get pricing run with all items
        const pricingRun = await prisma.pricingRun.findUnique({
            where: { id },
            include: {
                import: {
                    select: {
                        name: true
                    }
                },
                items: {
                    include: {
                        importItem: {
                            include: {
                                product: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!pricingRun) {
            return res.status(404).json({ error: 'Pricing run not found' });
        }

        // Build CSV
        const csvRows = [];

        // Header row
        csvRows.push([
            'SKU',
            'Product Name',
            'HS Code',
            'Units',
            'Weight (kg)',
            'Volume (m³)',
            'Base PKR',
            'FX Rate',
            'Base (Dest)',
            'Freight',
            'Insurance',
            'CIF',
            'Duty',
            'Fees',
            'Tax',
            'Landed Cost',
            'Sell Price',
            'Margin %',
            'Currency'
        ].join(','));

        // Get currency from destination
        const currencyMap = { UK: 'GBP', US: 'USD', EU: 'EUR' };
        const currency = currencyMap[pricingRun.destination] || 'GBP';

        // Get FX rate from snapshot
        const fxRateField = pricingRun.destination === 'UK' ? 'pkrToGbp' :
            pricingRun.destination === 'US' ? 'pkrToUsd' : 'pkrToEur';
        const fxRate = pricingRun.snapshotRates?.fxRate?.[fxRateField] || 0;

        // Data rows
        for (const item of pricingRun.items) {
            const product = item.importItem.product;
            const breakdown = item.breakdownJson;

            csvRows.push([
                product.sku,
                `"${product.name.replace(/"/g, '""')}"`, // Escape quotes
                product.hsCode,
                item.importItem.units,
                parseFloat(product.weightKg).toFixed(3),
                parseFloat(product.volumeM3).toFixed(6),
                parseFloat(item.basePkr).toFixed(2),
                fxRate.toFixed(6),
                breakdown.calculations?.base?.toFixed(2) || '0.00',
                breakdown.calculations?.freightPerUnit?.toFixed(2) || '0.00',
                breakdown.calculations?.insurancePerUnit?.toFixed(2) || '0.00',
                breakdown.calculations?.customsValue?.toFixed(2) || '0.00',
                breakdown.calculations?.duty?.toFixed(2) || '0.00',
                breakdown.calculations?.totalFees?.toFixed(2) || '0.00',
                breakdown.calculations?.tax?.toFixed(2) || '0.00',
                parseFloat(item.landedCost).toFixed(2),
                parseFloat(item.sellingPrice).toFixed(2),
                (parseFloat(item.marginPct) * 100).toFixed(2),
                currency
            ].join(','));
        }

        const csv = csvRows.join('\n');

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="pricing-run-${id}.csv"`);
        res.send(csv);

    } catch (error) {
        console.error('Error exporting pricing run:', error);
        res.status(500).json({ error: 'Failed to export pricing run' });
    }
});

// ==================== RATE MANAGEMENT (RBAC: Super User Only) ====================

// Get FX rate with optional date parameter (backward compatible)
app.get('/api/fx-rates', async (req, res) => {
    try {
        const { source, target, date } = req.query;

        if (!source || !target) {
            return res.status(400).json({ error: 'source and target currencies are required' });
        }

        // Get FX rate (latest if no date, or closest to date)
        let fxRate;
        if (date) {
            const targetDate = new Date(date);
            fxRate = await prisma.fxRate.findFirst({
                where: {
                    asOfDate: {
                        lte: targetDate
                    }
                },
                orderBy: { asOfDate: 'desc' }
            });
        } else {
            fxRate = await prisma.fxRate.findFirst({
                orderBy: { asOfDate: 'desc' }
            });
        }

        if (!fxRate) {
            return res.status(404).json({ error: 'No FX rates found' });
        }

        // Map currency pair to rate
        const rateField = `${source.toLowerCase()}To${target.charAt(0).toUpperCase() + target.slice(1).toLowerCase()}`;
        const rate = fxRate[rateField];

        if (rate === undefined) {
            return res.status(400).json({
                error: `Currency pair ${source}/${target} not supported`,
                supportedPairs: ['PKR/GBP', 'PKR/USD', 'PKR/EUR']
            });
        }

        res.json({
            date: fxRate.asOfDate.toISOString().split('T')[0],
            rate: parseFloat(rate),
            sourceCurrency: source.toUpperCase(),
            targetCurrency: target.toUpperCase()
        });
    } catch (error) {
        console.error('Error fetching FX rate:', error);
        res.status(500).json({ error: 'Failed to fetch FX rate' });
    }
});

// Get latest FX rate for specific currency pair (frontend-friendly)
app.get('/api/fx-rates/latest', async (req, res) => {
    try {
        const { source, target } = req.query;

        if (!source || !target) {
            return res.status(400).json({ error: 'source and target currencies are required' });
        }

        // Get latest FX rate
        const fxRate = await prisma.fxRate.findFirst({
            orderBy: { asOfDate: 'desc' }
        });

        if (!fxRate) {
            return res.status(404).json({ error: 'No FX rates found' });
        }

        // Map currency pair to rate
        const rateField = `${source.toLowerCase()}To${target.charAt(0).toUpperCase() + target.slice(1).toLowerCase()}`;
        const rate = fxRate[rateField];

        if (rate === undefined) {
            return res.status(400).json({
                error: `Currency pair ${source}/${target} not supported`,
                supportedPairs: ['PKR/GBP', 'PKR/USD', 'PKR/EUR']
            });
        }

        res.json({
            date: fxRate.asOfDate.toISOString().split('T')[0],
            rate: parseFloat(rate),
            sourceCurrency: source.toUpperCase(),
            targetCurrency: target.toUpperCase()
        });
    } catch (error) {
        console.error('Error fetching latest FX rate:', error);
        res.status(500).json({ error: 'Failed to fetch FX rate' });
    }
});

// FX Rates (all rates - management interface)
app.get('/api/pricing/fx-rates', async (req, res) => {
    try {
        const fxRates = await prisma.fxRate.findMany({
            orderBy: { asOfDate: 'desc' }
        });
        res.json(fxRates);
    } catch (error) {
        console.error('Error fetching FX rates:', error);
        res.status(500).json({ error: 'Failed to fetch FX rates' });
    }
});

app.post('/api/pricing/fx-rates', requireSuper, async (req, res) => {
    try {
        const { asOfDate, pkrToGbp, pkrToUsd, pkrToEur } = req.body;

        const fxRate = await prisma.fxRate.create({
            data: {
                asOfDate: new Date(asOfDate),
                pkrToGbp,
                pkrToUsd,
                pkrToEur
            }
        });

        res.status(201).json(fxRate);
    } catch (error) {
        console.error('Error creating FX rate:', error);
        res.status(500).json({
            error: 'Failed to create FX rate',
            details: error.message
        });
    }
});

app.put('/api/pricing/fx-rates/:id', requireSuper, async (req, res) => {
    try {
        const { id } = req.params;
        const { pkrToGbp, pkrToUsd, pkrToEur } = req.body;

        const fxRate = await prisma.fxRate.update({
            where: { id },
            data: {
                pkrToGbp,
                pkrToUsd,
                pkrToEur
            }
        });

        res.json(fxRate);
    } catch (error) {
        console.error('Error updating FX rate:', error);
        res.status(500).json({ error: 'Failed to update FX rate' });
    }
});

app.delete('/api/pricing/fx-rates/:id', requireSuper, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.fxRate.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting FX rate:', error);
        res.status(500).json({ error: 'Failed to delete FX rate' });
    }
});

// Duty Rates
app.get('/api/pricing/duty-rates', async (req, res) => {
    try {
        const { country, hsCode } = req.query;
        const where = {};
        if (country) where.country = country;
        if (hsCode) where.hsCode = hsCode;

        const dutyRates = await prisma.dutyRate.findMany({
            where,
            orderBy: [{ country: 'asc' }, { hsCode: 'asc' }, { effectiveFrom: 'desc' }]
        });

        res.json(dutyRates);
    } catch (error) {
        console.error('Error fetching duty rates:', error);
        res.status(500).json({ error: 'Failed to fetch duty rates' });
    }
});

app.post('/api/pricing/duty-rates', requireSuper, async (req, res) => {
    try {
        const { country, hsCode, ratePercent, effectiveFrom, effectiveTo } = req.body;

        const dutyRate = await prisma.dutyRate.create({
            data: {
                country,
                hsCode,
                ratePercent,
                effectiveFrom: new Date(effectiveFrom),
                effectiveTo: effectiveTo ? new Date(effectiveTo) : null
            }
        });

        res.status(201).json(dutyRate);
    } catch (error) {
        console.error('Error creating duty rate:', error);
        res.status(500).json({
            error: 'Failed to create duty rate',
            details: error.message
        });
    }
});

app.put('/api/pricing/duty-rates/:id', requireSuper, async (req, res) => {
    try {
        const { id } = req.params;
        const { ratePercent, effectiveTo } = req.body;

        const dutyRate = await prisma.dutyRate.update({
            where: { id },
            data: {
                ratePercent,
                effectiveTo: effectiveTo ? new Date(effectiveTo) : null
            }
        });

        res.json(dutyRate);
    } catch (error) {
        console.error('Error updating duty rate:', error);
        res.status(500).json({ error: 'Failed to update duty rate' });
    }
});

app.delete('/api/pricing/duty-rates/:id', requireSuper, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.dutyRate.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting duty rate:', error);
        res.status(500).json({ error: 'Failed to delete duty rate' });
    }
});

// VAT Rates
app.get('/api/pricing/vat-rates', async (req, res) => {
    try {
        const { country } = req.query;
        const where = {};
        if (country) where.country = country;

        const vatRates = await prisma.vatRate.findMany({
            where,
            orderBy: [{ country: 'asc' }, { base: 'asc' }, { effectiveFrom: 'desc' }]
        });

        res.json(vatRates);
    } catch (error) {
        console.error('Error fetching VAT rates:', error);
        res.status(500).json({ error: 'Failed to fetch VAT rates' });
    }
});

app.post('/api/pricing/vat-rates', requireSuper, async (req, res) => {
    try {
        const { country, ratePercent, base, effectiveFrom, effectiveTo } = req.body;

        const vatRate = await prisma.vatRate.create({
            data: {
                country,
                ratePercent,
                base,
                effectiveFrom: new Date(effectiveFrom),
                effectiveTo: effectiveTo ? new Date(effectiveTo) : null
            }
        });

        res.status(201).json(vatRate);
    } catch (error) {
        console.error('Error creating VAT rate:', error);
        res.status(500).json({
            error: 'Failed to create VAT rate',
            details: error.message
        });
    }
});

app.put('/api/pricing/vat-rates/:id', requireSuper, async (req, res) => {
    try {
        const { id } = req.params;
        const { ratePercent, effectiveTo } = req.body;

        const vatRate = await prisma.vatRate.update({
            where: { id },
            data: {
                ratePercent,
                effectiveTo: effectiveTo ? new Date(effectiveTo) : null
            }
        });

        res.json(vatRate);
    } catch (error) {
        console.error('Error updating VAT rate:', error);
        res.status(500).json({ error: 'Failed to update VAT rate' });
    }
});

app.delete('/api/pricing/vat-rates/:id', requireSuper, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.vatRate.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting VAT rate:', error);
        res.status(500).json({ error: 'Failed to delete VAT rate' });
    }
});

// Fees
app.get('/api/pricing/fees', async (req, res) => {
    try {
        const { country } = req.query;
        const where = {};
        if (country) where.country = country;

        const fees = await prisma.fee.findMany({
            where,
            orderBy: [{ country: 'asc' }, { name: 'asc' }]
        });

        res.json(fees);
    } catch (error) {
        console.error('Error fetching fees:', error);
        res.status(500).json({ error: 'Failed to fetch fees' });
    }
});

app.post('/api/pricing/fees', requireSuper, async (req, res) => {
    try {
        const { country, name, method, value } = req.body;

        const fee = await prisma.fee.create({
            data: {
                country,
                name,
                method,
                value
            }
        });

        res.status(201).json(fee);
    } catch (error) {
        console.error('Error creating fee:', error);
        res.status(500).json({
            error: 'Failed to create fee',
            details: error.message
        });
    }
});

app.put('/api/pricing/fees/:id', requireSuper, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, method, value } = req.body;

        const fee = await prisma.fee.update({
            where: { id },
            data: {
                name,
                method,
                value
            }
        });

        res.json(fee);
    } catch (error) {
        console.error('Error updating fee:', error);
        res.status(500).json({ error: 'Failed to update fee' });
    }
});

app.delete('/api/pricing/fees/:id', requireSuper, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.fee.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting fee:', error);
        res.status(500).json({ error: 'Failed to delete fee' });
    }
});

// Thresholds
app.get('/api/pricing/thresholds', async (req, res) => {
    try {
        const { country } = req.query;
        const where = {};
        if (country) where.country = country;

        const thresholds = await prisma.threshold.findMany({
            where,
            orderBy: [{ country: 'asc' }, { ruleName: 'asc' }]
        });

        res.json(thresholds);
    } catch (error) {
        console.error('Error fetching thresholds:', error);
        res.status(500).json({ error: 'Failed to fetch thresholds' });
    }
});

app.post('/api/pricing/thresholds', requireSuper, async (req, res) => {
    try {
        const { country, ruleName, jsonRule } = req.body;

        const threshold = await prisma.threshold.create({
            data: {
                country,
                ruleName,
                jsonRule
            }
        });

        res.status(201).json(threshold);
    } catch (error) {
        console.error('Error creating threshold:', error);
        res.status(500).json({
            error: 'Failed to create threshold',
            details: error.message
        });
    }
});

app.put('/api/pricing/thresholds/:id', requireSuper, async (req, res) => {
    try {
        const { id } = req.params;
        const { jsonRule } = req.body;

        const threshold = await prisma.threshold.update({
            where: { id },
            data: {
                jsonRule
            }
        });

        res.json(threshold);
    } catch (error) {
        console.error('Error updating threshold:', error);
        res.status(500).json({ error: 'Failed to update threshold' });
    }
});

app.delete('/api/pricing/thresholds/:id', requireSuper, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.threshold.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting threshold:', error);
        res.status(500).json({ error: 'Failed to delete threshold' });
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

// Fix unhashed passwords endpoint (temporary - remove after use)
app.post('/api/fix-passwords', async (req, res) => {
    try {
        const usersToFix = await prisma.user.findMany();
        const fixed = [];
        const skipped = [];

        for (const user of usersToFix) {
            // Check if password is already hashed (bcrypt hashes start with $2b$)
            if (user.passwordHash.startsWith('$2b$') || user.passwordHash.startsWith('$2a$')) {
                skipped.push({ email: user.email, reason: 'Already hashed' });
                continue;
            }

            // Hash the plain text password
            const hashedPassword = await bcrypt.hash(user.passwordHash, 10);

            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hashedPassword }
            });

            fixed.push({ email: user.email, status: 'Fixed' });
        }

        res.json({
            success: true,
            message: `Fixed ${fixed.length} users, skipped ${skipped.length} users`,
            fixed,
            skipped
        });
    } catch (error) {
        console.error('Fix passwords error:', error);
        res.status(500).json({ error: 'Failed to fix passwords', details: error.message });
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
