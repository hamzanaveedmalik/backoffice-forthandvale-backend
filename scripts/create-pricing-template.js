/**
 * Create Sample Pricing Excel Template
 * 
 * Generates a sample Excel file that can be used as a template
 * for uploading pricing data.
 */

import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample data
const sampleData = [
    {
        SKU: 'FNV-1001',
        Category: 'Wallets',
        'Product Name': 'Leather Wallet - Premium',
        'HS Code': '420231',
        PurchasePricePKR: 1100,
        UnitsPerOrder: 100,
        WeightKg: 0.30,
        VolumeM3: 0.0015
    },
    {
        SKU: 'FNV-1002',
        Category: 'Wallets',
        'Product Name': 'Leather Wallet - Standard',
        'HS Code': '420231',
        PurchasePricePKR: 850,
        UnitsPerOrder: 150,
        WeightKg: 0.25,
        VolumeM3: 0.0012
    },
    {
        SKU: 'FNV-2001',
        Category: 'Handbags',
        'Product Name': 'Leather Handbag - Large',
        'HS Code': '420221',
        PurchasePricePKR: 3200,
        UnitsPerOrder: 50,
        WeightKg: 0.85,
        VolumeM3: 0.0045
    },
    {
        SKU: 'FNV-2002',
        Category: 'Handbags',
        'Product Name': 'Leather Handbag - Medium',
        'HS Code': '420221',
        PurchasePricePKR: 2400,
        UnitsPerOrder: 75,
        WeightKg: 0.65,
        VolumeM3: 0.0035
    },
    {
        SKU: 'FNV-3001',
        Category: 'Accessories',
        'Product Name': 'Leather Keychain',
        'HS Code': '420231',
        PurchasePricePKR: 180,
        UnitsPerOrder: 500,
        WeightKg: 0.05,
        VolumeM3: 0.0001
    },
    {
        SKU: 'FNV-3002',
        Category: 'Accessories',
        'Product Name': 'Leather Card Holder',
        'HS Code': '420232',
        PurchasePricePKR: 420,
        UnitsPerOrder: 200,
        WeightKg: 0.08,
        VolumeM3: 0.0002
    },
    {
        SKU: 'FNV-3003',
        Category: 'Accessories',
        'Product Name': 'Leather Phone Case',
        'HS Code': '420232',
        PurchasePricePKR: 650,
        UnitsPerOrder: 120,
        WeightKg: 0.12,
        VolumeM3: 0.0003
    },
    {
        SKU: 'FNV-4001',
        Category: 'Bags',
        'Product Name': 'Leather Messenger Bag',
        'HS Code': '420222',
        PurchasePricePKR: 4500,
        UnitsPerOrder: 30,
        WeightKg: 1.20,
        VolumeM3: 0.0080
    },
    {
        SKU: 'FNV-4002',
        Category: 'Bags',
        'Product Name': 'Leather Laptop Bag',
        'HS Code': '420222',
        PurchasePricePKR: 5200,
        UnitsPerOrder: 25,
        WeightKg: 1.40,
        VolumeM3: 0.0095
    },
    {
        SKU: 'FNV-5001',
        Category: 'Belts',
        'Product Name': 'Leather Belt - Classic',
        'HS Code': '420330',
        PurchasePricePKR: 750,
        UnitsPerOrder: 100,
        WeightKg: 0.22,
        VolumeM3: 0.0005
    }
];

function createTemplate() {
    console.log('📊 Creating pricing Excel template...');

    // Create workbook
    const wb = xlsx.utils.book_new();

    // Create worksheet from data
    const ws = xlsx.utils.json_to_sheet(sampleData);

    // Set column widths
    ws['!cols'] = [
        { wch: 12 },  // SKU
        { wch: 15 },  // Category
        { wch: 30 },  // Product Name
        { wch: 10 },  // HS Code
        { wch: 18 },  // PurchasePricePKR
        { wch: 15 },  // UnitsPerOrder
        { wch: 10 },  // WeightKg
        { wch: 12 }   // VolumeM3
    ];

    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(wb, ws, 'Pricing Data');

    // Create instructions sheet
    const instructions = [
        { Field: 'SKU', Description: 'Unique product identifier', Required: 'Yes', Example: 'FNV-1001' },
        { Field: 'Category', Description: 'Product category', Required: 'No', Example: 'Wallets' },
        { Field: 'Product Name', Description: 'Full product name', Required: 'Yes', Example: 'Leather Wallet - Premium' },
        { Field: 'HS Code', Description: 'Harmonized System code for customs', Required: 'Yes', Example: '420231' },
        { Field: 'PurchasePricePKR', Description: 'Purchase price in Pakistani Rupees', Required: 'Yes', Example: '1100' },
        { Field: 'UnitsPerOrder', Description: 'Number of units per order', Required: 'Yes', Example: '100' },
        { Field: 'WeightKg', Description: 'Weight per unit in kilograms', Required: 'Yes', Example: '0.30' },
        { Field: 'VolumeM3', Description: 'Volume per unit in cubic meters', Required: 'Yes', Example: '0.0015' }
    ];

    const wsInstructions = xlsx.utils.json_to_sheet(instructions);
    wsInstructions['!cols'] = [
        { wch: 20 },
        { wch: 40 },
        { wch: 10 },
        { wch: 25 }
    ];

    xlsx.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Create HS Codes reference sheet
    const hsCodesRef = [
        { 'HS Code': '420221', Description: 'Handbags with outer surface of leather', 'Typical Duty (UK)': '3.5%', 'Typical Duty (US)': '6.0%' },
        { 'HS Code': '420222', Description: 'Handbags with outer surface of plastic/textile', 'Typical Duty (UK)': '2.5%', 'Typical Duty (US)': '4.5%' },
        { 'HS Code': '420231', Description: 'Wallets, purses, key-cases', 'Typical Duty (UK)': '3.5%', 'Typical Duty (US)': '5.5%' },
        { 'HS Code': '420232', Description: 'Articles normally carried in pocket/handbag', 'Typical Duty (UK)': '3.5%', 'Typical Duty (US)': '5.5%' },
        { 'HS Code': '420310', Description: 'Articles of apparel of leather', 'Typical Duty (UK)': '8.0%', 'Typical Duty (US)': '12.5%' },
        { 'HS Code': '420330', Description: 'Belts and bandoliers', 'Typical Duty (UK)': '2.5%', 'Typical Duty (US)': '4.0%' }
    ];

    const wsHsCodes = xlsx.utils.json_to_sheet(hsCodesRef);
    wsHsCodes['!cols'] = [
        { wch: 10 },
        { wch: 45 },
        { wch: 18 },
        { wch: 18 }
    ];

    xlsx.utils.book_append_sheet(wb, wsHsCodes, 'HS Codes Reference');

    // Write file
    const outputPath = join(__dirname, '..', 'pricing-template.xlsx');
    xlsx.writeFile(wb, outputPath);

    console.log(`✅ Template created: ${outputPath}`);
    console.log('\n📝 The template includes:');
    console.log('   - Sample pricing data with 10 products');
    console.log('   - Instructions sheet explaining each field');
    console.log('   - HS Codes reference with common leather goods codes');
    console.log('\n💡 Use this template to format your pricing data for upload.');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createTemplate();
}

export { createTemplate };

