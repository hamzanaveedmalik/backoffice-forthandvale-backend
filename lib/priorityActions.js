import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Generate high priority actions from lead data
export const generateLeadBasedActions = async (orgId) => {
    const actions = []

    // High priority leads based on visitor count (7-6 MW)
    const highPriorityLeads = [
        {
            company: "Geiger (GeigerBTC)",
            website: "https://www.btcgroup.co.uk",
            visitorCount: 7,
            linkedin: "https://uk.linkedin.com/company/geigeruk",
            buyerRoles: ["Head of Merchandise", "Head of Procurement", "Account Director", "Corporate Gifting Lead", "Head of Sustainability"],
            contacts: [
                { name: "Vicky Kinasz", linkedin: "https://uk.linkedin.com/in/vicky-kinasz-24b7815" },
                { name: "Frank Murphy", linkedin: "https://uk.linkedin.com/in/frank-murphy-ht" }
            ]
        },
        {
            company: "Activate Branding",
            website: "https://www.activate-branding.com",
            visitorCount: 6,
            linkedin: "https://uk.linkedin.com/company/activate-branding",
            buyerRoles: ["Head of Merchandise", "Head of Procurement", "Account Director", "Head of Buying", "Head of Operations"],
            contacts: [
                { name: "Paul Green", linkedin: "https://uk.linkedin.com/in/paul-green-galpeg-network" }
            ]
        },
        {
            company: "Galpeg",
            website: "https://www.galpeg.com",
            visitorCount: 6,
            linkedin: "https://uk.linkedin.com/company/galpeg",
            buyerRoles: ["Network Manager", "Operations Lead", "Procurement Manager", "Distributor Owner"],
            contacts: [
                { name: "Paul Green", linkedin: "https://uk.linkedin.com/in/paul-green-galpeg-network" }
            ]
        },
        {
            company: "Initial Incentives",
            website: "https://www.initialincentives.com",
            visitorCount: 6,
            linkedin: "https://uk.linkedin.com/company/initial-incentives",
            buyerRoles: ["Head of Merchandise", "Head of Procurement", "Account Director", "Head of Buying", "Head of Operations"],
            contacts: [
                { name: "Nick Carter", linkedin: "https://uk.linkedin.com/in/nick-carter-7316a45" }
            ]
        },
        {
            company: "Project Merchandise",
            website: "https://www.projectmerchandise.com",
            visitorCount: 6,
            linkedin: "https://uk.linkedin.com/company/project-merchandise",
            buyerRoles: ["Head of Merchandise", "Head of Procurement", "Account Director", "Head of Buying", "Head of Operations"],
            contacts: [
                { name: "Jeremy Benson", linkedin: "https://uk.linkedin.com/in/j-benson" }
            ]
        }
    ]

    // Medium priority leads (4-5 MW)
    const mediumPriorityLeads = [
        {
            company: "Prominate UK",
            website: "https://www.prominate.co.uk",
            visitorCount: 4,
            linkedin: "https://uk.linkedin.com/company/prominate-uk",
            buyerRoles: ["Head of Merchandise", "Head of Procurement", "Account Director", "Head of Buying", "Head of Operations"],
            contacts: [
                { name: "Mike Oxley", linkedin: "https://uk.linkedin.com/in/mike-oxley-4759a39" }
            ]
        },
        {
            company: "Event Merchandising",
            website: "https://www.eventmerchandising.com",
            visitorCount: 4,
            linkedin: "https://uk.linkedin.com/company/event-merchandising",
            buyerRoles: ["Head of Merchandise", "Head of Procurement", "Account Director", "Head of Buying", "Head of Operations"],
            contacts: [
                { name: "Jeremy Goldsmith", linkedin: "https://uk.linkedin.com/in/jeremymarcgoldsmith" }
            ]
        },
        {
            company: "Orb International KMS (Orb Group)",
            website: "https://www.orbgroup.com",
            visitorCount: 4,
            linkedin: "https://uk.linkedin.com/company/orb-international-kms",
            buyerRoles: ["Head of Merchandise", "Head of Procurement", "Account Director", "Head of Buying", "Head of Operations"],
            contacts: [
                { name: "Ryan Askew", linkedin: "https://uk.linkedin.com/in/askewryan" }
            ]
        }
    ]

    // Generate URGENT actions for high priority leads (7-6 MW)
    for (const lead of highPriorityLeads) {
        // Immediate LinkedIn outreach action
        actions.push({
            orgId,
            type: 'CUSTOM',
            priority: 'URGENT',
            title: `URGENT: LinkedIn outreach to ${lead.company}`,
            description: `High-value lead (${lead.visitorCount}M visitors/week) - Connect with ${lead.contacts[0].name} on LinkedIn and send personalized message targeting ${lead.buyerRoles[0]} role`,
            dueDate: new Date(),
            metadata: {
                leadCompany: lead.company,
                leadWebsite: lead.website,
                visitorCount: lead.visitorCount,
                linkedinCompany: lead.linkedin,
                primaryContact: lead.contacts[0],
                buyerRoles: lead.buyerRoles,
                actionType: 'linkedin_outreach',
                priorityReason: 'high_visitor_count'
            }
        })

        // Research and qualification action
        actions.push({
            orgId,
            type: 'CUSTOM',
            priority: 'HIGH',
            title: `Research ${lead.company} - ${lead.visitorCount}M visitors/week`,
            description: `Research company background, recent news, current suppliers, and pain points. Check website for case studies and testimonials.`,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
            metadata: {
                leadCompany: lead.company,
                leadWebsite: lead.website,
                visitorCount: lead.visitorCount,
                linkedinCompany: lead.linkedin,
                actionType: 'research_qualification',
                priorityReason: 'high_visitor_count'
            }
        })

        // Email outreach action
        actions.push({
            orgId,
            type: 'CUSTOM',
            priority: 'HIGH',
            title: `Email outreach to ${lead.company}`,
            description: `Send personalized email to ${lead.contacts[0].name} introducing our services. Focus on ${lead.buyerRoles[0]} pain points and value proposition.`,
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            metadata: {
                leadCompany: lead.company,
                leadWebsite: lead.website,
                visitorCount: lead.visitorCount,
                primaryContact: lead.contacts[0],
                buyerRoles: lead.buyerRoles,
                actionType: 'email_outreach',
                priorityReason: 'high_visitor_count'
            }
        })
    }

    // Generate HIGH priority actions for medium priority leads (4-5 MW)
    for (const lead of mediumPriorityLeads) {
        // LinkedIn outreach action
        actions.push({
            orgId,
            type: 'CUSTOM',
            priority: 'HIGH',
            title: `LinkedIn outreach to ${lead.company}`,
            description: `Medium-value lead (${lead.visitorCount}M visitors/week) - Connect with ${lead.contacts[0].name} on LinkedIn and send personalized message`,
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            metadata: {
                leadCompany: lead.company,
                leadWebsite: lead.website,
                visitorCount: lead.visitorCount,
                linkedinCompany: lead.linkedin,
                primaryContact: lead.contacts[0],
                buyerRoles: lead.buyerRoles,
                actionType: 'linkedin_outreach',
                priorityReason: 'medium_visitor_count'
            }
        })

        // Research action
        actions.push({
            orgId,
            type: 'CUSTOM',
            priority: 'MEDIUM',
            title: `Research ${lead.company} - ${lead.visitorCount}M visitors/week`,
            description: `Research company background and identify key decision makers. Check for recent company news and growth indicators.`,
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
            metadata: {
                leadCompany: lead.company,
                leadWebsite: lead.website,
                visitorCount: lead.visitorCount,
                linkedinCompany: lead.linkedin,
                actionType: 'research_qualification',
                priorityReason: 'medium_visitor_count'
            }
        })
    }

    return actions
}

// Auto-generation rules for priority actions
export const generatePriorityActions = async (orgId) => {
    const actions = []

    // Rule 1: Follow up on leads not contacted in 3+ days
    const overdueLeads = await prisma.lead.findMany({
        where: {
            orgId,
            status: { in: ['QUALIFIED', 'CONTACTED'] },
            updatedAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
        },
        include: { owner: true }
    })

    for (const lead of overdueLeads) {
        const daysSinceUpdate = Math.floor((new Date() - lead.updatedAt) / (1000 * 60 * 60 * 24))
        const priority = lead.priority > 2 ? 'HIGH' : 'MEDIUM'

        actions.push({
            orgId,
            leadId: lead.id,
            type: 'FOLLOW_UP',
            priority,
            title: `Follow up with ${lead.company}`,
            description: `Follow up on ${lead.title} - Last contacted ${daysSinceUpdate} days ago`,
            dueDate: new Date(),
            assignedTo: lead.ownerId,
            metadata: {
                leadCompany: lead.company,
                leadContact: lead.contactName,
                leadValue: lead.priority || 0,
                daysSinceUpdate
            }
        })
    }

    // Rule 2: Sample dispatch for samples requested 2+ days ago
    const pendingSamples = await prisma.sample.findMany({
        where: {
            orgId,
            status: 'REQUESTED',
            requestedAt: { lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
        },
        include: { lead: true, requestedBy: true }
    })

    for (const sample of pendingSamples) {
        const daysSinceRequest = Math.floor((new Date() - sample.requestedAt) / (1000 * 60 * 60 * 24))

        actions.push({
            orgId,
            leadId: sample.leadId,
            type: 'SAMPLE_DISPATCH',
            priority: 'HIGH',
            title: `Dispatch sample for ${sample.lead.company}`,
            description: `Dispatch ${sample.itemName} sample - Requested ${daysSinceRequest} days ago`,
            dueDate: new Date(),
            assignedTo: sample.requestedById,
            metadata: {
                sampleItem: sample.itemName,
                sampleQuantity: sample.quantity,
                leadCompany: sample.lead.company,
                daysSinceRequest
            }
        })
    }

    // Rule 3: Quote expiring in 2 days
    const expiringQuotes = await prisma.quote.findMany({
        where: {
            orgId,
            status: 'SENT',
            validUntil: {
                gte: new Date(),
                lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            }
        },
        include: { lead: true }
    })

    for (const quote of expiringQuotes) {
        const daysUntilExpiry = Math.ceil((quote.validUntil - new Date()) / (1000 * 60 * 60 * 24))

        actions.push({
            orgId,
            leadId: quote.leadId,
            type: 'QUOTE_EXPIRING',
            priority: daysUntilExpiry <= 1 ? 'URGENT' : 'HIGH',
            title: `Quote expiring for ${quote.lead.company}`,
            description: `Quote ${quote.quoteNo} expires in ${daysUntilExpiry} days - Send reminder`,
            dueDate: new Date(),
            metadata: {
                quoteNo: quote.quoteNo,
                quoteValue: quote.total,
                leadCompany: quote.lead.company,
                daysUntilExpiry
            }
        })
    }

    // Rule 4: New lead response within 1 hour
    const newLeads = await prisma.lead.findMany({
        where: {
            orgId,
            status: 'NEW',
            createdAt: { gte: new Date(Date.now() - 1 * 60 * 60 * 1000) } // Last 1 hour
        },
        include: { owner: true }
    })

    for (const lead of newLeads) {
        const hoursSinceCreated = Math.floor((new Date() - lead.createdAt) / (1000 * 60 * 60))

        actions.push({
            orgId,
            leadId: lead.id,
            type: 'NEW_LEAD_RESPONSE',
            priority: 'URGENT',
            title: `Respond to new lead from ${lead.company}`,
            description: `New inquiry from ${lead.contactName} - Respond within 1 hour`,
            dueDate: new Date(lead.createdAt.getTime() + 60 * 60 * 1000), // 1 hour from creation
            assignedTo: lead.ownerId,
            metadata: {
                leadCompany: lead.company,
                leadContact: lead.contactName,
                leadSource: lead.source,
                hoursSinceCreated
            }
        })
    }

    // Rule 5: Sample follow-up after delivery
    const deliveredSamples = await prisma.sample.findMany({
        where: {
            orgId,
            status: 'DELIVERED',
            deliveredAt: {
                gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Last 2 days
                lt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)   // More than 1 day ago
            }
        },
        include: { lead: true, requestedBy: true }
    })

    for (const sample of deliveredSamples) {
        const daysSinceDelivery = Math.floor((new Date() - sample.deliveredAt) / (1000 * 60 * 60 * 24))

        actions.push({
            orgId,
            leadId: sample.leadId,
            type: 'SAMPLE_FOLLOW_UP',
            priority: 'MEDIUM',
            title: `Follow up on delivered sample for ${sample.lead.company}`,
            description: `Sample delivered ${daysSinceDelivery} days ago - Check satisfaction and next steps`,
            dueDate: new Date(),
            assignedTo: sample.requestedById,
            metadata: {
                sampleItem: sample.itemName,
                leadCompany: sample.lead.company,
                daysSinceDelivery
            }
        })
    }

    return actions
}

// Create priority actions
export const createPriorityAction = async (actionData) => {
    return await prisma.priorityAction.create({
        data: actionData,
        include: {
            lead: {
                include: { owner: true }
            },
            assignee: true
        }
    })
}

// Get all priority actions for an org
export const getPriorityActions = async (orgId, filters = {}) => {
    const where = {
        orgId,
        ...filters
    }

    return await prisma.priorityAction.findMany({
        where,
        include: {
            lead: {
                include: { owner: true }
            },
            assignee: true
        },
        orderBy: [
            { priority: 'desc' },
            { dueDate: 'asc' }
        ]
    })
}

// Get today's priority actions
export const getTodaysPriorityActions = async (orgId) => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    return await prisma.priorityAction.findMany({
        where: {
            orgId,
            status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
            dueDate: {
                gte: startOfDay,
                lt: endOfDay
            }
        },
        include: {
            lead: {
                include: { owner: true }
            },
            assignee: true
        },
        orderBy: [
            { priority: 'desc' },
            { dueDate: 'asc' }
        ]
    })
}

// Update priority action status
export const updatePriorityActionStatus = async (actionId, status, completedBy = null) => {
    const updateData = {
        status,
        updatedAt: new Date()
    }

    if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
    }

    return await prisma.priorityAction.update({
        where: { id: actionId },
        data: updateData,
        include: {
            lead: {
                include: { owner: true }
            },
            assignee: true
        }
    })
}

// Auto-generate and create priority actions
export const autoGeneratePriorityActions = async (orgId) => {
    const generatedActions = await generatePriorityActions(orgId)

    // Check for existing similar actions to avoid duplicates
    const existingActions = await prisma.priorityAction.findMany({
        where: {
            orgId,
            status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
    })

    const newActions = []
    for (const action of generatedActions) {
        const exists = existingActions.some(existing =>
            existing.leadId === action.leadId &&
            existing.type === action.type &&
            existing.status !== 'COMPLETED'
        )

        if (!exists) {
            newActions.push(action)
        }
    }

    if (newActions.length > 0) {
        await prisma.priorityAction.createMany({
            data: newActions
        })
    }

    return newActions.length
}

// Generate and create lead-based priority actions
export const generateLeadBasedPriorityActions = async (orgId) => {
    const generatedActions = await generateLeadBasedActions(orgId)

    // Check for existing similar actions to avoid duplicates
    const existingActions = await prisma.priorityAction.findMany({
        where: {
            orgId,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            type: 'CUSTOM'
        }
    })

    const newActions = []
    for (const action of generatedActions) {
        const exists = existingActions.some(existing =>
            existing.title === action.title &&
            existing.status !== 'COMPLETED'
        )

        if (!exists) {
            newActions.push(action)
        }
    }

    if (newActions.length > 0) {
        await prisma.priorityAction.createMany({
            data: newActions
        })
    }

    return newActions.length
}

// Get priority action statistics
export const getPriorityActionStats = async (orgId) => {
    const stats = await prisma.priorityAction.groupBy({
        by: ['priority', 'status'],
        where: { orgId },
        _count: true
    })

    const total = await prisma.priorityAction.count({
        where: { orgId }
    })

    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const todaysCount = await prisma.priorityAction.count({
        where: {
            orgId,
            dueDate: {
                gte: startOfDay,
                lt: endOfDay
            }
        }
    })

    return {
        total,
        todaysCount,
        byPriority: stats.reduce((acc, stat) => {
            if (!acc[stat.priority]) acc[stat.priority] = 0
            acc[stat.priority] += stat._count
            return acc
        }, {}),
        byStatus: stats.reduce((acc, stat) => {
            if (!acc[stat.status]) acc[stat.status] = 0
            acc[stat.status] += stat._count
            return acc
        }, {})
    }
}
