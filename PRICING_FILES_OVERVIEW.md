# Pricing Module - Files Overview

Complete reference of all files created for the pricing module.

## 📂 Core Implementation Files

### 1. Database Schema

**File:** `prisma/schema.prisma`
**Lines:** 359-530
**Purpose:** Defines all pricing-related database models and relationships

**Models Added:**

- `Product` - Product master data
- `Import` - Import batches
- `ImportItem` - Individual import items
- `FxRate` - Exchange rates
- `DutyRate` - Customs duty rates
- `VatRate` - VAT/tax rates
- `Fee` - Additional fees
- `Threshold` - Country-specific rules
- `PricingRun` - Pricing scenarios
- `PricingRunItem` - Calculation results

**Enums Added:**

- `Country` (UK, US, EU)
- `VatBase` (CIF, CIF_PLUS_DUTY, CIF_PLUS_DUTY_FEES)
- `FeeMethod` (FIXED, PER_KG, PER_UNIT, PCT)
- `Incoterm` (FOB, CIF, DDP)
- `MarginMode` (MARGIN, MARKUP)

### 2. Pricing Calculator

**File:** `lib/pricingCalculator.js`
**Lines:** ~350
**Purpose:** Core pricing calculation engine

**Key Functions:**

- `getFxRate(asOfDate)` - Fetch FX rate for date
- `getDutyRate(hsCode, country, date)` - Fetch duty rate
- `getVatRate(country, base, date)` - Fetch VAT rate
- `getFees(country, overrides)` - Fetch fees
- `calculateFreight(model, weight, units)` - Calculate freight
- `calculateInsurance(model, base, weight, units)` - Calculate insurance
- `calculateFees(fees, value, weight, units)` - Apply fees
- `calculateVatBase(base, cif, duty, fees)` - Calculate VAT base
- `applyRounding(price, rules)` - Apply rounding
- `calculateItemPricing(item, config, rates)` - Calculate single item
- `calculateImportPricing(importId, config)` - Calculate all items

**Features:**

- Deterministic calculations
- Complete breakdown JSON
- Rate versioning
- Snapshot storage

### 3. Excel Parser

**File:** `lib/pricingExcelParser.js`
**Lines:** ~150
**Purpose:** Parse and validate Excel uploads

**Key Functions:**

- `parsePricingExcel(buffer)` - Parse Excel file
- `validatePricingImport(items)` - Validate parsed data

**Features:**

- Flexible column name matching
- Type validation
- Non-negative checks
- Duplicate detection
- Detailed error reporting

### 4. API Endpoints

**File:** `server.js`
**Lines:** 629-1486
**Purpose:** RESTful API endpoints

**Endpoints Added:**

- Import: 3 endpoints (POST, GET list, GET single)
- Pricing Runs: 4 endpoints (POST create, POST calculate, GET single, GET list)
- FX Rates: 4 endpoints (GET, POST, PUT, DELETE)
- Duty Rates: 4 endpoints (GET, POST, PUT, DELETE)
- VAT Rates: 4 endpoints (GET, POST, PUT, DELETE)
- Fees: 4 endpoints (GET, POST, PUT, DELETE)
- Thresholds: 4 endpoints (GET, POST, PUT, DELETE)

**Total:** 23 new endpoints

**Middleware:**

- `requireSuper` - RBAC for rate management

## 📚 Documentation Files

### 5. Complete Module Documentation

**File:** `PRICING_MODULE.md`
**Size:** ~500 lines
**Purpose:** Comprehensive module documentation

**Contents:**

- Feature overview
- Data model explanation
- Calculation flow with formulas
- API reference with examples
- Sample calculations
- Testing guide
- Notes on margin vs markup

### 6. Quick Start Guide

**File:** `PRICING_QUICKSTART.md`
**Size:** ~350 lines
**Purpose:** Get started quickly

**Contents:**

- Setup instructions
- Quick test workflow
- Example calculations
- Common scenarios
- Troubleshooting
- Next steps

### 7. Implementation Summary

**File:** `PRICING_IMPLEMENTATION_SUMMARY.md`
**Size:** ~600 lines
**Purpose:** Complete implementation reference

**Contents:**

- What was built
- Feature checklist
- Sample calculations
- Package updates
- Getting started
- Data flow
- Breakdown JSON structure
- Verification checklist

### 8. Deployment Checklist

**File:** `PRICING_DEPLOYMENT_CHECKLIST.md`
**Size:** ~400 lines
**Purpose:** Step-by-step deployment guide

**Contents:**

- Pre-deployment steps
- API testing checklist
- Verification checklist
- Production deployment
- Monitoring
- Troubleshooting

### 9. Files Overview (This File)

**File:** `PRICING_FILES_OVERVIEW.md`
**Size:** This document
**Purpose:** Reference all created files

## 🧪 Testing Files

### 10. Golden Tests

**File:** `tests/pricing.golden.test.js`
**Lines:** ~350
**Purpose:** Verify pricing calculations

**Test Cases:**

- UK pricing (MARGIN mode)
- US pricing (MARGIN mode)
- EU pricing (MARKUP mode)
- No rounding test
- Margin verification

**Functions:**

- `setupTestData()` - Seed test data
- `runCalculationTest(name, config, expected)` - Run single test
- `runAllTests()` - Run all tests

**Run with:** `npm run pricing:test`

## 🔧 Utility Files

### 11. Seed Script

**File:** `prisma/seed.pricing.ts`
**Lines:** ~200
**Purpose:** Seed database with initial rates

**Seeds:**

- 2 FX rates
- 15 duty rates (6 HS codes × 3 countries, some variations)
- 3 VAT rates
- 8 fees
- 4 thresholds

**Run with:** `npm run db:seed:pricing`

### 12. Template Generator

**File:** `scripts/create-pricing-template.js`
**Lines:** ~150
**Purpose:** Create Excel template

**Creates:**

- 10 sample products
- Instructions sheet
- HS codes reference

**Run with:** `npm run pricing:template`

**Output:** `pricing-template.xlsx`

## 💡 Example Files

### 13. API Examples

**File:** `examples/pricing-api-examples.sh`
**Lines:** ~350
**Purpose:** Complete API workflow examples

**Demonstrates:**

- Upload Excel
- View import
- Check rates
- Create UK/US/EU runs
- Calculate pricing
- Compare results
- Detailed breakdown
- Rate management

**Run with:** `bash examples/pricing-api-examples.sh`

## 📋 Configuration Updates

### 14. Package.json

**File:** `package.json`
**Changes:** Added 3 scripts

**Scripts Added:**

```json
{
  "db:seed:pricing": "tsx prisma/seed.pricing.ts",
  "pricing:template": "node scripts/create-pricing-template.js",
  "pricing:test": "node tests/pricing.golden.test.js"
}
```

### 15. Main README

**File:** `README.md`
**Changes:** Added pricing module section

**Updates:**

- New pricing commands
- API endpoints
- Features overview
- Documentation links

## 📊 File Statistics

### Total Files Created: 13

- Core Implementation: 4 files
- Documentation: 5 files
- Testing: 1 file
- Utilities: 2 files
- Examples: 1 file

### Total Lines of Code: ~3,000+

- TypeScript/JavaScript: ~1,500 lines
- Documentation (Markdown): ~1,500 lines
- Prisma Schema: ~170 lines

### Documentation Coverage:

- Setup Guide: ✅
- API Reference: ✅
- Calculation Examples: ✅
- Testing Guide: ✅
- Deployment Guide: ✅
- Troubleshooting: ✅

## 🗂️ Directory Structure

```
backoffice-backend/
├── prisma/
│   ├── schema.prisma          # ✨ Updated with pricing models
│   ├── seed.ts                # Existing seed
│   └── seed.pricing.ts        # ✨ NEW: Pricing rates seed
├── lib/
│   ├── excelProcessor.js      # Existing
│   ├── middleware.ts          # Existing
│   ├── priorityActions.js     # Existing
│   ├── prisma.ts              # Existing
│   ├── pricingCalculator.js   # ✨ NEW: Pricing calculator
│   └── pricingExcelParser.js  # ✨ NEW: Excel parser
├── scripts/
│   └── create-pricing-template.js  # ✨ NEW: Template generator
├── tests/
│   └── pricing.golden.test.js      # ✨ NEW: Golden tests
├── examples/
│   └── pricing-api-examples.sh     # ✨ NEW: API examples
├── server.js                        # ✨ Updated with pricing APIs
├── package.json                     # ✨ Updated with scripts
├── README.md                        # ✨ Updated with pricing section
├── PRICING_MODULE.md               # ✨ NEW: Complete documentation
├── PRICING_QUICKSTART.md           # ✨ NEW: Quick start guide
├── PRICING_IMPLEMENTATION_SUMMARY.md  # ✨ NEW: Implementation summary
├── PRICING_DEPLOYMENT_CHECKLIST.md    # ✨ NEW: Deployment checklist
└── PRICING_FILES_OVERVIEW.md          # ✨ NEW: This file
```

## 🔍 Quick Reference

### Need to...

**Understand the module?**
→ Read `PRICING_MODULE.md`

**Get started quickly?**
→ Follow `PRICING_QUICKSTART.md`

**Deploy to production?**
→ Use `PRICING_DEPLOYMENT_CHECKLIST.md`

**See implementation details?**
→ Check `PRICING_IMPLEMENTATION_SUMMARY.md`

**Find a specific file?**
→ Use this document (`PRICING_FILES_OVERVIEW.md`)

**Test the APIs?**
→ Run `examples/pricing-api-examples.sh`

**Understand calculations?**
→ Review `lib/pricingCalculator.js`

**Modify the schema?**
→ Edit `prisma/schema.prisma` (lines 359-530)

**Add new endpoints?**
→ Edit `server.js` (after line 629)

**Run tests?**
→ Execute `npm run pricing:test`

**Seed data?**
→ Run `npm run db:seed:pricing`

**Create template?**
→ Execute `npm run pricing:template`

## 📈 Maintenance Guide

### To Add a New HS Code:

1. Add duty rate in seed: `prisma/seed.pricing.ts`
2. Or use API: `POST /api/pricing/duty-rates`

### To Update FX Rates:

1. Add new rate: `POST /api/pricing/fx-rates`
2. Or update seed: `prisma/seed.pricing.ts`

### To Add a New Country:

1. Add to enum: `prisma/schema.prisma`
2. Add rates: duty, VAT, fees
3. Update calculator if needed

### To Modify Calculation Logic:

1. Edit: `lib/pricingCalculator.js`
2. Update tests: `tests/pricing.golden.test.js`
3. Run: `npm run pricing:test`
4. Update docs: `PRICING_MODULE.md`

### To Add New Fee Type:

1. Add to enum: `FeeMethod` in schema
2. Update: `calculateFees()` in calculator
3. Document in: `PRICING_MODULE.md`

## 🎯 Integration Points

### Frontend Integration:

- Upload Excel: `POST /api/pricing/imports`
- Create run: `POST /api/pricing/runs`
- Calculate: `POST /api/pricing/runs/:id/calculate`
- View results: `GET /api/pricing/runs/:id`

### Database Access:

- All models accessible via Prisma
- Use `@prisma/client`
- Import: `import { PrismaClient } from '@prisma/client'`

### External Systems:

- FX rates can be auto-updated via scheduled job
- Duty rates can be imported from trade databases
- Results can be exported to accounting systems

## ✅ Completeness Checklist

- [x] Database schema defined
- [x] Excel parser implemented
- [x] Pricing calculator implemented
- [x] APIs created (23 endpoints)
- [x] RBAC implemented
- [x] Tests written and passing
- [x] Seed data provided
- [x] Template generator created
- [x] Complete documentation written
- [x] Quick start guide created
- [x] Deployment checklist created
- [x] API examples provided
- [x] README updated
- [x] All files organized
- [x] No linting errors

## 📞 Support Resources

**Documentation:**

- Main: `PRICING_MODULE.md`
- Quick Start: `PRICING_QUICKSTART.md`
- Deployment: `PRICING_DEPLOYMENT_CHECKLIST.md`

**Examples:**

- API workflow: `examples/pricing-api-examples.sh`
- Test cases: `tests/pricing.golden.test.js`
- Template: `pricing-template.xlsx` (generated)

**Code:**

- Calculator: `lib/pricingCalculator.js`
- Parser: `lib/pricingExcelParser.js`
- APIs: `server.js` (lines 629-1486)
- Schema: `prisma/schema.prisma` (lines 359-530)

---

**Last Updated:** October 9, 2025
**Module Version:** 1.0.0
**Status:** ✅ Complete and Ready for Production
