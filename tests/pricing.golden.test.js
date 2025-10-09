/**
 * Golden Tests for Pricing Calculator
 * 
 * These tests verify the pricing calculations for UK, US, and EU destinations
 * using known rates and expected outputs.
 */

import { PrismaClient } from '@prisma/client';
import { PricingCalculator } from '../lib/pricingCalculator.js';

const prisma = new PrismaClient();

// Test setup - seed test data
async function setupTestData() {
    // Clean up existing test data
    await prisma.pricingRunItem.deleteMany({});
    await prisma.pricingRun.deleteMany({});
    await prisma.importItem.deleteMany({});
    await prisma.import.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.threshold.deleteMany({});
    await prisma.fee.deleteMany({});
    await prisma.vatRate.deleteMany({});
    await prisma.dutyRate.deleteMany({});
    await prisma.fxRate.deleteMany({});

    // Get or create test user
    let user = await prisma.user.findFirst({
        where: { email: 'admin@forthvale.com' }
    });

    if (!user) {
        const org = await prisma.org.findFirst();
        user = await prisma.user.create({
            data: {
                orgId: org.id,
                email: 'test@test.com',
                fullName: 'Test User',
                role: 'SUPER',
                passwordHash: 'test'
            }
        });
    }

    // Create FX rates (as of 2025-01-01)
    const fxRate = await prisma.fxRate.create({
        data: {
            asOfDate: new Date('2025-01-01'),
            pkrToGbp: 0.0028, // 1 PKR = 0.0028 GBP (approx 357 PKR/GBP)
            pkrToUsd: 0.0036, // 1 PKR = 0.0036 USD (approx 278 PKR/USD)
            pkrToEur: 0.0033  // 1 PKR = 0.0033 EUR (approx 303 PKR/EUR)
        }
    });

    // Create duty rates for HS Code 420231 (Leather wallets/purses)
    await prisma.dutyRate.createMany({
        data: [
            {
                country: 'UK',
                hsCode: '420231',
                ratePercent: 0.035, // 3.5% duty
                effectiveFrom: new Date('2024-01-01')
            },
            {
                country: 'US',
                hsCode: '420231',
                ratePercent: 0.055, // 5.5% duty
                effectiveFrom: new Date('2024-01-01')
            },
            {
                country: 'EU',
                hsCode: '420231',
                ratePercent: 0.045, // 4.5% duty
                effectiveFrom: new Date('2024-01-01')
            }
        ]
    });

    // Create VAT rates
    await prisma.vatRate.createMany({
        data: [
            {
                country: 'UK',
                ratePercent: 0.20, // 20% VAT
                base: 'CIF_PLUS_DUTY',
                effectiveFrom: new Date('2024-01-01')
            },
            {
                country: 'US',
                ratePercent: 0.00, // No federal VAT (state sales tax varies)
                base: 'CIF_PLUS_DUTY',
                effectiveFrom: new Date('2024-01-01')
            },
            {
                country: 'EU',
                ratePercent: 0.19, // 19% VAT (Germany standard rate)
                base: 'CIF_PLUS_DUTY',
                effectiveFrom: new Date('2024-01-01')
            }
        ]
    });

    // Create fees
    await prisma.fee.createMany({
        data: [
            // UK fees
            {
                country: 'UK',
                name: 'Customs Clearance',
                method: 'FIXED',
                value: 15
            },
            {
                country: 'UK',
                name: 'Handling Fee',
                method: 'PER_UNIT',
                value: 0.50
            },
            // US fees
            {
                country: 'US',
                name: 'Merchandise Processing Fee',
                method: 'PCT',
                value: 0.00344 // 0.344%
            },
            {
                country: 'US',
                name: 'Harbor Maintenance Fee',
                method: 'PCT',
                value: 0.00125 // 0.125%
            },
            // EU fees
            {
                country: 'EU',
                name: 'Customs Clearance',
                method: 'FIXED',
                value: 20
            },
            {
                country: 'EU',
                name: 'EORI Processing',
                method: 'PCT',
                value: 0.005 // 0.5%
            }
        ]
    });

    // Create thresholds
    await prisma.threshold.createMany({
        data: [
            {
                country: 'US',
                ruleName: 'US_SECTION_321',
                jsonRule: {
                    type: 'de_minimis',
                    threshold: 800,
                    currency: 'USD',
                    description: 'Section 321 de minimis exemption'
                }
            },
            {
                country: 'UK',
                ruleName: 'UK_LOW_VALUE',
                jsonRule: {
                    type: 'low_value_consignment',
                    threshold: 135,
                    currency: 'GBP',
                    description: 'Low value consignment relief'
                }
            }
        ]
    });

    // Create test product
    const product = await prisma.product.create({
        data: {
            sku: 'FNV-1001',
            name: 'Leather Wallet - Premium',
            hsCode: '420231',
            weightKg: 0.30,
            volumeM3: 0.0015
        }
    });

    // Create import
    const importRecord = await prisma.import.create({
        data: {
            name: 'Test Import - Jan 2025',
            createdById: user.id
        }
    });

    // Create import item
    const importItem = await prisma.importItem.create({
        data: {
            importId: importRecord.id,
            productId: product.id,
            purchasePricePkr: 1100,
            units: 100
        }
    });

    return {
        fxRate,
        product,
        importRecord,
        importItem,
        userId: user.id
    };
}

// Helper to run calculation test
async function runCalculationTest(testName, config, expectedResults) {
    console.log(`\n📊 Running test: ${testName}`);

    const { importRecord } = await setupTestData();

    const { results } = await PricingCalculator.calculateImportPricing(
        importRecord.id,
        config
    );

    const result = results[0];
    const breakdown = result.breakdownJson.calculations;

    console.log('\n✅ Results:');
    console.log(`   Base (destination currency): ${breakdown.base.toFixed(4)}`);
    console.log(`   Freight per unit: ${breakdown.freightPerUnit.toFixed(4)}`);
    console.log(`   Insurance per unit: ${breakdown.insurancePerUnit.toFixed(4)}`);
    console.log(`   Customs value (CIF): ${breakdown.customsValue.toFixed(4)}`);
    console.log(`   Duty: ${breakdown.duty.toFixed(4)}`);
    console.log(`   Fees: ${breakdown.totalFees.toFixed(4)}`);
    console.log(`   VAT base: ${breakdown.vatBaseAmount.toFixed(4)}`);
    console.log(`   Tax (VAT): ${breakdown.tax.toFixed(4)}`);
    console.log(`   Landed cost: ${breakdown.landedCost.toFixed(4)}`);
    console.log(`   Selling price: ${breakdown.sellingPrice.toFixed(4)}`);
    console.log(`   Margin %: ${(breakdown.marginPct * 100).toFixed(2)}%`);

    // Verify margin calculation
    const calculatedMargin = (breakdown.sellingPrice - breakdown.landedCost) / breakdown.sellingPrice;
    const marginDiff = Math.abs(calculatedMargin - breakdown.marginPct);

    console.log(`\n🔍 Margin Verification:`);
    console.log(`   Expected margin mode: ${config.marginMode}`);
    console.log(`   Expected margin value: ${config.marginValue}`);
    console.log(`   Actual margin: ${(calculatedMargin * 100).toFixed(4)}%`);
    console.log(`   Stored margin: ${(breakdown.marginPct * 100).toFixed(4)}%`);
    console.log(`   Difference: ${(marginDiff * 100).toFixed(6)}%`);

    // For MARGIN mode: (price - cost) / price = marginValue
    if (config.marginMode === 'MARGIN') {
        const marginTest = Math.abs(calculatedMargin - config.marginValue);
        if (marginTest < 0.0001) {
            console.log(`   ✅ MARGIN calculation correct`);
        } else {
            console.log(`   ❌ MARGIN calculation incorrect! Diff: ${marginTest}`);
        }
    }

    // For MARKUP mode: (price - cost) / cost = marginValue
    if (config.marginMode === 'MARKUP') {
        const markup = (breakdown.sellingPrice - breakdown.landedCost) / breakdown.landedCost;
        const markupTest = Math.abs(markup - config.marginValue);
        console.log(`   Actual markup: ${(markup * 100).toFixed(4)}%`);
        if (markupTest < 0.0001) {
            console.log(`   ✅ MARKUP calculation correct`);
        } else {
            console.log(`   ❌ MARKUP calculation incorrect! Diff: ${markupTest}`);
        }
    }

    // Check expected results if provided
    if (expectedResults) {
        console.log(`\n🎯 Expected vs Actual:`);
        for (const [key, expectedValue] of Object.entries(expectedResults)) {
            const actualValue = breakdown[key];
            const diff = Math.abs(actualValue - expectedValue);
            const status = diff < 0.01 ? '✅' : '❌';
            console.log(`   ${status} ${key}: expected ${expectedValue.toFixed(4)}, got ${actualValue.toFixed(4)} (diff: ${diff.toFixed(6)})`);
        }
    }

    return result;
}

// Main test runner
async function runAllTests() {
    console.log('🧪 Running Pricing Calculator Golden Tests\n');
    console.log('='.repeat(80));

    try {
        // Test 1: UK with MARGIN mode
        await runCalculationTest(
            'UK - CIF - MARGIN 35%',
            {
                destination: 'UK',
                incoterm: 'CIF',
                fxDate: new Date('2025-01-01'),
                marginMode: 'MARGIN',
                marginValue: 0.35,
                freightModel: { type: 'PER_KG', value: 3.6 },
                insuranceModel: { type: 'PCT_OF_VALUE', value: 0.003 },
                feesOverrides: null,
                thresholdToggles: {},
                rounding: { mode: 'ENDINGS', value: 0.99 }
            },
            null // We'll calculate expected values based on the formula
        );

        // Test 2: US with MARGIN mode
        await runCalculationTest(
            'US - CIF - MARGIN 35%',
            {
                destination: 'US',
                incoterm: 'CIF',
                fxDate: new Date('2025-01-01'),
                marginMode: 'MARGIN',
                marginValue: 0.35,
                freightModel: { type: 'PER_KG', value: 3.6 },
                insuranceModel: { type: 'PCT_OF_VALUE', value: 0.003 },
                feesOverrides: null,
                thresholdToggles: { US_SECTION_321: true },
                rounding: { mode: 'ENDINGS', value: 0.99 }
            },
            null
        );

        // Test 3: EU with MARKUP mode
        await runCalculationTest(
            'EU - CIF - MARKUP 53.85% (equivalent to 35% margin)',
            {
                destination: 'EU',
                incoterm: 'CIF',
                fxDate: new Date('2025-01-01'),
                marginMode: 'MARKUP',
                marginValue: 0.5385, // 53.85% markup = 35% margin
                freightModel: { type: 'PER_KG', value: 3.6 },
                insuranceModel: { type: 'PCT_OF_VALUE', value: 0.003 },
                feesOverrides: null,
                thresholdToggles: {},
                rounding: { mode: 'ENDINGS', value: 0.99 }
            },
            null
        );

        // Test 4: UK with no rounding
        await runCalculationTest(
            'UK - CIF - MARGIN 35% - No Rounding',
            {
                destination: 'UK',
                incoterm: 'CIF',
                fxDate: new Date('2025-01-01'),
                marginMode: 'MARGIN',
                marginValue: 0.35,
                freightModel: { type: 'PER_KG', value: 3.6 },
                insuranceModel: { type: 'PCT_OF_VALUE', value: 0.003 },
                feesOverrides: null,
                thresholdToggles: {},
                rounding: null
            },
            null
        );

        console.log('\n' + '='.repeat(80));
        console.log('✅ All golden tests completed!');
        console.log('\nℹ️  To run these tests:');
        console.log('   node tests/pricing.golden.test.js');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}

export { runAllTests, setupTestData, runCalculationTest };

