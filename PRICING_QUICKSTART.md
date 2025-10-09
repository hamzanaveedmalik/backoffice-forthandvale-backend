# Pricing Module - Quick Start Guide

## Setup

### 1. Update Database Schema

```bash
npm run db:push
```

This will create all the new pricing tables in your database.

### 2. Seed Initial Rates

```bash
npm run db:seed:pricing
```

This will populate your database with:

- Sample FX rates (PKR to GBP, USD, EUR)
- Duty rates for common leather goods HS codes
- VAT rates for UK (20%), US (0%), EU (19%)
- Standard fees for each destination
- Threshold rules (e.g., US Section 321, UK low value)

### 3. Generate Excel Template

```bash
npm run pricing:template
```

This creates `pricing-template.xlsx` with:

- Sample product data (10 items)
- Field instructions
- HS code reference

## Quick Test Workflow

### Step 1: Start the Server

```bash
npm run dev
```

Server runs on http://localhost:8787

### Step 2: Upload Pricing Data

Use the generated template or create your own Excel file with these columns:

- SKU
- Category
- Product Name
- HS Code
- PurchasePricePKR
- UnitsPerOrder
- WeightKg
- VolumeM3

```bash
curl -X POST http://localhost:8787/api/pricing/imports \
  -H "x-user-id: YOUR_USER_ID" \
  -F "file=@pricing-template.xlsx" \
  -F "name=My First Import"
```

Response will include the import ID.

### Step 3: Create a Pricing Run

```bash
curl -X POST http://localhost:8787/api/pricing/runs \
  -H "Content-Type: application/json" \
  -d '{
    "importId": "IMPORT_ID_FROM_STEP_2",
    "destination": "UK",
    "incoterm": "CIF",
    "fxDate": "latest",
    "marginMode": "MARGIN",
    "marginValue": 0.35,
    "freightModel": {
      "type": "PER_KG",
      "value": 3.6
    },
    "insuranceModel": {
      "type": "PCT_OF_VALUE",
      "value": 0.003
    },
    "rounding": {
      "mode": "ENDINGS",
      "value": 0.99
    }
  }'
```

Response will include the pricing run ID.

### Step 4: Calculate Pricing

```bash
curl -X POST http://localhost:8787/api/pricing/runs/RUN_ID_FROM_STEP_3/calculate
```

This will:

- Fetch all items from the import
- Look up current FX rates, duty rates, VAT rates, and fees
- Calculate landed cost and selling price for each item
- Store results with complete breakdown
- Return paginated results with totals

### Step 5: View Results

```bash
curl http://localhost:8787/api/pricing/runs/RUN_ID_FROM_STEP_3
```

Or open in browser: http://localhost:8787/api/pricing/runs/RUN_ID_FROM_STEP_3

## Example with Sample Data

Using the sample product from the template (FNV-1001):

**Input:**

- Purchase Price: 1,100 PKR
- Weight: 0.30 kg
- Units: 100
- HS Code: 420231

**Configuration:**

- Destination: UK
- Margin: 35% (MARGIN mode)
- Freight: £3.60/kg
- Insurance: 0.3% of value

**Expected Output:**

- Base in GBP: ~£3.08 (1100 × 0.0028)
- Freight: £1.08 (0.30 kg × £3.60)
- Insurance: ~£0.01
- CIF Value: ~£4.17
- Duty (3.5%): ~£0.15
- Fees: ~£65
- VAT (20%): ~£0.86
- Landed Cost: ~£70.18
- Selling Price: ~£107.97 (to achieve 35% margin)
- Rounded: £107.99

## Run Golden Tests

```bash
npm run pricing:test
```

This runs comprehensive tests covering:

- UK pricing calculations
- US pricing calculations
- EU pricing calculations
- MARGIN vs MARKUP modes
- Margin verification
- Rate snapshots

## Managing Rates (Super User Only)

### View Current Rates

```bash
# FX Rates
curl http://localhost:8787/api/pricing/fx-rates

# Duty Rates
curl http://localhost:8787/api/pricing/duty-rates?country=UK

# VAT Rates
curl http://localhost:8787/api/pricing/vat-rates?country=UK

# Fees
curl http://localhost:8787/api/pricing/fees?country=UK

# Thresholds
curl http://localhost:8787/api/pricing/thresholds?country=US
```

### Add New FX Rate

```bash
curl -X POST http://localhost:8787/api/pricing/fx-rates \
  -H "Content-Type: application/json" \
  -H "x-user-id: SUPER_USER_ID" \
  -d '{
    "asOfDate": "2025-02-01",
    "pkrToGbp": 0.0029,
    "pkrToUsd": 0.0037,
    "pkrToEur": 0.0034
  }'
```

### Add New Duty Rate

```bash
curl -X POST http://localhost:8787/api/pricing/duty-rates \
  -H "Content-Type: application/json" \
  -H "x-user-id: SUPER_USER_ID" \
  -d '{
    "country": "UK",
    "hsCode": "420231",
    "ratePercent": 0.035,
    "effectiveFrom": "2025-01-01"
  }'
```

### Add New Fee

```bash
curl -X POST http://localhost:8787/api/pricing/fees \
  -H "Content-Type: application/json" \
  -H "x-user-id: SUPER_USER_ID" \
  -d '{
    "country": "UK",
    "name": "Brexit Processing Fee",
    "method": "FIXED",
    "value": 10
  }'
```

## Common Scenarios

### Scenario 1: Compare UK vs US vs EU

Create three pricing runs with the same import but different destinations:

```bash
# UK Run
curl -X POST http://localhost:8787/api/pricing/runs \
  -H "Content-Type: application/json" \
  -d '{"importId":"...", "destination":"UK", ...}'

# US Run
curl -X POST http://localhost:8787/api/pricing/runs \
  -H "Content-Type: application/json" \
  -d '{"importId":"...", "destination":"US", ...}'

# EU Run
curl -X POST http://localhost:8787/api/pricing/runs \
  -H "Content-Type: application/json" \
  -d '{"importId":"...", "destination":"EU", ...}'
```

Then calculate all three and compare results.

### Scenario 2: Test Different Margin Strategies

```bash
# 35% margin
curl -X POST http://localhost:8787/api/pricing/runs \
  -d '{"marginMode":"MARGIN", "marginValue":0.35, ...}'

# 50% markup (≈33% margin)
curl -X POST http://localhost:8787/api/pricing/runs \
  -d '{"marginMode":"MARKUP", "marginValue":0.50, ...}'

# 100% markup (50% margin)
curl -X POST http://localhost:8787/api/pricing/runs \
  -d '{"marginMode":"MARKUP", "marginValue":1.00, ...}'
```

### Scenario 3: Historical Rate Comparison

```bash
# Using current rates
curl -X POST http://localhost:8787/api/pricing/runs \
  -d '{"fxDate":"latest", ...}'

# Using rates from specific date
curl -X POST http://localhost:8787/api/pricing/runs \
  -d '{"fxDate":"2024-12-01", ...}'
```

## Troubleshooting

### No FX Rate Found

**Error:** "No FX rate found for the specified date"

**Solution:** Add an FX rate for that date or use "latest"

```bash
curl -X POST http://localhost:8787/api/pricing/fx-rates \
  -H "x-user-id: SUPER_USER_ID" \
  -d '{"asOfDate":"2025-01-01", "pkrToGbp":0.0028, ...}'
```

### No Duty Rate Found

**Error:** Duty calculations show 0

**Solution:** Add duty rate for that HS code and country

```bash
curl -X POST http://localhost:8787/api/pricing/duty-rates \
  -H "x-user-id: SUPER_USER_ID" \
  -d '{"country":"UK", "hsCode":"420231", "ratePercent":0.035, ...}'
```

### Margin Doesn't Match Expected

**Check:**

1. Are you using MARGIN or MARKUP mode?
2. MARGIN: (price - cost) / price = marginValue
3. MARKUP: (price - cost) / cost = marginValue
4. To convert: margin 35% = markup 53.85%

### Excel Upload Fails

**Common issues:**

1. Missing required columns (SKU, Product Name, HS Code, etc.)
2. Non-numeric values in numeric fields
3. Negative values in price/weight/volume
4. Empty HS Code

**Solution:** Use the template and check validation messages

## Next Steps

1. **Explore the API**: See PRICING_MODULE.md for complete API reference
2. **Customize Rates**: Add your actual FX rates, duty rates, and fees
3. **Integrate with Frontend**: Use the APIs to build a pricing UI
4. **Run Tests**: Verify calculations with your own test cases
5. **Monitor Results**: Use breakdown JSON to audit and explain pricing

## Support

For detailed documentation, see:

- `PRICING_MODULE.md` - Complete module documentation
- `tests/pricing.golden.test.js` - Test examples
- `prisma/schema.prisma` - Database schema

For issues or questions, check the breakdown JSON in the calculation results for detailed step-by-step calculations.
