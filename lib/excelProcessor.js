import xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Parse Excel file and extract lead data
 * Expected columns: Company, Website, Visitor Count (MW), LinkedIn Company, Suggested Buyer Roles, Example Contacts (LinkedIn)
 */
export const parseExcelFile = (fileBuffer) => {
    try {
        // Read the Excel file from buffer
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        const rawData = xlsx.utils.sheet_to_json(worksheet);
        
        // Transform the data to our lead format
        const leads = rawData.map((row, index) => {
            // Extract visitor count (remove "MW" suffix if present)
            const visitorCountRaw = row['Visitor Count (MW)'] || row['VisitorCount'] || 0;
            const visitorCount = typeof visitorCountRaw === 'string' 
                ? parseInt(visitorCountRaw.replace(/\D/g, '')) 
                : parseInt(visitorCountRaw) || 0;
            
            // Extract company name
            const company = row['Company'] || row['company'] || `Lead ${index + 1}`;
            
            // Extract website
            const website = row['Website'] || row['website'] || '';
            
            // Extract LinkedIn company URL
            const linkedinCompany = row['LinkedIn Company'] || row['linkedinCompany'] || '';
            
            // Extract buyer roles (comma-separated string)
            const buyerRoles = row['Suggested Buyer Roles'] || row['buyerRoles'] || '';
            const buyerRolesList = buyerRoles ? buyerRoles.split(';').map(r => r.trim()).filter(Boolean) : [];
            
            // Extract example contacts
            const exampleContacts = row['Example Contacts (LinkedIn)'] || row['contacts'] || '';
            const contactsList = parseContacts(exampleContacts);
            
            return {
                company,
                website,
                visitorCount,
                linkedinCompany,
                buyerRoles: buyerRolesList,
                contacts: contactsList,
                source: 'Excel Import',
                rawData: row // Keep original row for debugging
            };
        });
        
        return {
            success: true,
            leads,
            totalRows: rawData.length
        };
    } catch (error) {
        console.error('Excel parsing error:', error);
        return {
            success: false,
            error: error.message,
            leads: []
        };
    }
};

/**
 * Parse contact information from text
 * Format: "Name1 – URL1, Name2 – URL2" or "Name1–URL1; Name2–URL2"
 */
const parseContacts = (contactsText) => {
    if (!contactsText || typeof contactsText !== 'string') return [];
    
    try {
        // Split by comma or semicolon
        const contactPairs = contactsText.split(/[,;]/).filter(Boolean);
        
        const contacts = contactPairs.map(pair => {
            // Split by dash or hyphen
            const parts = pair.split(/[–—-]/).map(p => p.trim());
            
            if (parts.length >= 2) {
                return {
                    name: parts[0].trim(),
                    linkedin: parts.slice(1).join('').trim()
                };
            }
            
            return null;
        }).filter(Boolean);
        
        return contacts;
    } catch (error) {
        console.error('Error parsing contacts:', error);
        return [];
    }
};

/**
 * Calculate priority score for a lead
 * Score is based on: visitor count (40%), contact info (30%), buyer roles (20%), company data (10%)
 */
export const calculatePriorityScore = (lead) => {
    let score = 0;
    
    // 1. Visitor Count Weight (40 points max)
    if (lead.visitorCount >= 7) {
        score += 40; // URGENT
    } else if (lead.visitorCount >= 4) {
        score += 30; // HIGH
    } else if (lead.visitorCount >= 1) {
        score += 20; // MEDIUM
    } else {
        score += 10; // LOW
    }
    
    // 2. Contact Information (30 points max)
    const hasContacts = lead.contacts && lead.contacts.length > 0;
    const hasLinkedIn = lead.linkedinCompany && lead.linkedinCompany.length > 0;
    
    if (hasContacts) score += 15;
    if (hasLinkedIn) score += 15;
    
    // 3. Buyer Role Quality (20 points max)
    if (lead.buyerRoles && lead.buyerRoles.length > 0) {
        const roles = lead.buyerRoles.join(' ').toLowerCase();
        
        // Check for C-level roles
        if (roles.includes('ceo') || roles.includes('cfo') || roles.includes('cto') || 
            roles.includes('chief') || roles.includes('director')) {
            score += 20;
        } else if (roles.includes('head') || roles.includes('manager')) {
            score += 15;
        } else if (roles.includes('procurement') || roles.includes('buying')) {
            score += 10;
        } else {
            score += 5;
        }
    }
    
    // 4. Company Information (10 points max)
    if (lead.website) score += 5;
    if (lead.linkedinCompany) score += 5;
    
    return Math.min(score, 100); // Cap at 100
};

/**
 * Determine priority level and action type based on score
 */
export const getPriorityLevel = (score) => {
    if (score >= 80) {
        return {
            priority: 'URGENT',
            level: 'URGENT',
            actionType: 'FOLLOW_UP',
            daysUntilDue: 0 // Today
        };
    } else if (score >= 60) {
        return {
            priority: 'HIGH',
            level: 'HIGH',
            actionType: 'NEW_LEAD_RESPONSE',
            daysUntilDue: 2
        };
    } else if (score >= 40) {
        return {
            priority: 'MEDIUM',
            level: 'MEDIUM',
            actionType: 'FOLLOW_UP',
            daysUntilDue: 5
        };
    } else {
        return {
            priority: 'LOW',
            level: 'LOW',
            actionType: 'FOLLOW_UP',
            daysUntilDue: 7
        };
    }
};

/**
 * Generate action title and description for a lead
 */
export const generateActionDetails = (lead, score, priorityInfo) => {
    const { company, visitorCount, contacts, buyerRoles } = lead;
    
    // Generate title
    let title = `Follow up with ${company}`;
    if (visitorCount > 0) {
        title += ` - ${visitorCount} website visits`;
    }
    
    // Generate description
    let description = `Priority action for ${company}\n\n`;
    description += `📊 Priority Score: ${score}/100\n`;
    description += `👥 Visitor Count: ${visitorCount}\n`;
    
    if (contacts && contacts.length > 0) {
        description += `\n🎯 Key Contacts:\n`;
        contacts.slice(0, 3).forEach(contact => {
            description += `  • ${contact.name}\n`;
        });
    }
    
    if (buyerRoles && buyerRoles.length > 0) {
        description += `\n💼 Buyer Roles:\n`;
        buyerRoles.slice(0, 5).forEach(role => {
            description += `  • ${role}\n`;
        });
    }
    
    if (lead.website) {
        description += `\n🌐 Website: ${lead.website}\n`;
    }
    
    if (lead.linkedinCompany) {
        description += `📱 LinkedIn: ${lead.linkedinCompany}\n`;
    }
    
    description += `\n💡 Action: Reach out and establish initial contact`;
    
    return { title, description };
};

export default {
    parseExcelFile,
    calculatePriorityScore,
    getPriorityLevel,
    generateActionDetails
};

