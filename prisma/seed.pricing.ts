/**
 * Pricing Module Seed Data
 * 
 * Seeds the database with realistic pricing rates for UK, US, and EU
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPricingRates() {
  console.log('🌱 Seeding pricing rates...');

  // Clean existing pricing data (optional - comment out for production)
  // await prisma.threshold.deleteMany({});
  // await prisma.fee.deleteMany({});
  // await prisma.vatRate.deleteMany({});
  // await prisma.dutyRate.deleteMany({});
  // await prisma.fxRate.deleteMany({});

  // Seed FX Rates (Recent rates as of Jan 2025)
  console.log('💱 Creating FX rates...');
  
  const fxRates = [
    {
      asOfDate: new Date('2025-01-01'),
      pkrToGbp: 0.0028,  // ~357 PKR/GBP
      pkrToUsd: 0.0036,  // ~278 PKR/USD
      pkrToEur: 0.0033   // ~303 PKR/EUR
    },
    {
      asOfDate: new Date('2024-12-01'),
      pkrToGbp: 0.0027,
      pkrToUsd: 0.0035,
      pkrToEur: 0.0032
    }
  ];

  for (const rate of fxRates) {
    await prisma.fxRate.upsert({
      where: { asOfDate: rate.asOfDate },
      update: rate,
      create: rate
    });
  }

  console.log(`✅ Created ${fxRates.length} FX rates`);

  // Seed Duty Rates for common leather goods HS codes
  console.log('📦 Creating duty rates...');

  const dutyRates = [
    // HS 420231 - Wallets, purses, key-cases, cigarette-cases, tobacco-pouches
    { country: 'UK', hsCode: '420231', ratePercent: 0.035, effectiveFrom: new Date('2024-01-01') },
    { country: 'US', hsCode: '420231', ratePercent: 0.055, effectiveFrom: new Date('2024-01-01') },
    { country: 'EU', hsCode: '420231', ratePercent: 0.045, effectiveFrom: new Date('2024-01-01') },
    
    // HS 420232 - Articles normally carried in the pocket or in the handbag
    { country: 'UK', hsCode: '420232', ratePercent: 0.035, effectiveFrom: new Date('2024-01-01') },
    { country: 'US', hsCode: '420232', ratePercent: 0.055, effectiveFrom: new Date('2024-01-01') },
    { country: 'EU', hsCode: '420232', ratePercent: 0.045, effectiveFrom: new Date('2024-01-01') },
    
    // HS 420221 - Handbags with outer surface of leather
    { country: 'UK', hsCode: '420221', ratePercent: 0.035, effectiveFrom: new Date('2024-01-01') },
    { country: 'US', hsCode: '420221', ratePercent: 0.06, effectiveFrom: new Date('2024-01-01') },
    { country: 'EU', hsCode: '420221', ratePercent: 0.045, effectiveFrom: new Date('2024-01-01') },
    
    // HS 420222 - Handbags with outer surface of plastic sheeting or textile
    { country: 'UK', hsCode: '420222', ratePercent: 0.025, effectiveFrom: new Date('2024-01-01') },
    { country: 'US', hsCode: '420222', ratePercent: 0.045, effectiveFrom: new Date('2024-01-01') },
    { country: 'EU', hsCode: '420222', ratePercent: 0.035, effectiveFrom: new Date('2024-01-01') },
    
    // HS 420310 - Articles of apparel of leather or composition leather
    { country: 'UK', hsCode: '420310', ratePercent: 0.08, effectiveFrom: new Date('2024-01-01') },
    { country: 'US', hsCode: '420310', ratePercent: 0.125, effectiveFrom: new Date('2024-01-01') },
    { country: 'EU', hsCode: '420310', ratePercent: 0.04, effectiveFrom: new Date('2024-01-01') },
  ];

  for (const rate of dutyRates) {
    await prisma.dutyRate.upsert({
      where: {
        country_hsCode_effectiveFrom: {
          country: rate.country as any,
          hsCode: rate.hsCode,
          effectiveFrom: rate.effectiveFrom
        }
      },
      update: { ratePercent: rate.ratePercent },
      create: rate as any
    });
  }

  console.log(`✅ Created ${dutyRates.length} duty rates`);

  // Seed VAT Rates
  console.log('💰 Creating VAT rates...');

  const vatRates = [
    // UK VAT (20%)
    { country: 'UK', ratePercent: 0.20, base: 'CIF_PLUS_DUTY', effectiveFrom: new Date('2024-01-01') },
    
    // US has no federal VAT (state sales tax varies, not included here)
    { country: 'US', ratePercent: 0.00, base: 'CIF_PLUS_DUTY', effectiveFrom: new Date('2024-01-01') },
    
    // EU VAT (using Germany's 19% as standard)
    { country: 'EU', ratePercent: 0.19, base: 'CIF_PLUS_DUTY', effectiveFrom: new Date('2024-01-01') },
  ];

  for (const rate of vatRates) {
    await prisma.vatRate.upsert({
      where: {
        country_base_effectiveFrom: {
          country: rate.country as any,
          base: rate.base as any,
          effectiveFrom: rate.effectiveFrom
        }
      },
      update: { ratePercent: rate.ratePercent },
      create: rate as any
    });
  }

  console.log(`✅ Created ${vatRates.length} VAT rates`);

  // Seed Fees
  console.log('💵 Creating fees...');

  const fees = [
    // UK Fees
    { country: 'UK', name: 'Customs Clearance', method: 'FIXED', value: 15 },
    { country: 'UK', name: 'Handling Fee', method: 'PER_UNIT', value: 0.50 },
    
    // US Fees
    { country: 'US', name: 'Merchandise Processing Fee (MPF)', method: 'PCT', value: 0.00344 }, // 0.344%
    { country: 'US', name: 'Harbor Maintenance Fee (HMF)', method: 'PCT', value: 0.00125 }, // 0.125%
    { country: 'US', name: 'Customs Broker Fee', method: 'FIXED', value: 75 },
    
    // EU Fees
    { country: 'EU', name: 'Customs Clearance', method: 'FIXED', value: 20 },
    { country: 'EU', name: 'EORI Processing', method: 'PCT', value: 0.005 }, // 0.5%
    { country: 'EU', name: 'Import Processing Fee', method: 'FIXED', value: 12 },
  ];

  let feeCount = 0;
  for (const fee of fees) {
    try {
      await prisma.fee.create({
        data: fee as any
      });
      feeCount++;
    } catch (e) {
      // Fee might already exist, skip
    }
  }

  console.log(`✅ Created ${feeCount} fees`);

  // Seed Thresholds
  console.log('🎯 Creating thresholds...');

  const thresholds = [
    {
      country: 'US',
      ruleName: 'US_SECTION_321',
      jsonRule: {
        type: 'de_minimis',
        threshold: 800,
        currency: 'USD',
        description: 'Section 321 de minimis exemption - shipments under $800 are exempt from duty and taxes',
        applies_to: 'order_value'
      }
    },
    {
      country: 'UK',
      ruleName: 'UK_LOW_VALUE',
      jsonRule: {
        type: 'low_value_consignment',
        threshold: 135,
        currency: 'GBP',
        description: 'Low value consignment relief - orders under £135 have simplified VAT treatment',
        applies_to: 'order_value'
      }
    },
    {
      country: 'EU',
      ruleName: 'EU_LOW_VALUE',
      jsonRule: {
        type: 'low_value_consignment',
        threshold: 150,
        currency: 'EUR',
        description: 'EU low value goods - goods under €150 may have simplified customs procedures',
        applies_to: 'order_value'
      }
    },
    {
      country: 'UK',
      ruleName: 'UK_GIFT_EXEMPTION',
      jsonRule: {
        type: 'gift_exemption',
        threshold: 39,
        currency: 'GBP',
        description: 'Gift exemption - genuine gifts under £39 are exempt from duty and VAT',
        applies_to: 'gift_value'
      }
    }
  ];

  for (const threshold of thresholds) {
    await prisma.threshold.upsert({
      where: {
        country_ruleName: {
          country: threshold.country as any,
          ruleName: threshold.ruleName
        }
      },
      update: { jsonRule: threshold.jsonRule },
      create: threshold as any
    });
  }

  console.log(`✅ Created ${thresholds.length} thresholds`);

  console.log('✅ Pricing rates seeded successfully!');
}

async function main() {
  try {
    await seedPricingRates();
  } catch (error) {
    console.error('❌ Error seeding pricing rates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

