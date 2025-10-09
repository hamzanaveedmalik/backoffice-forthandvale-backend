# Pricing/Cost Module Documentation

## Overview

The Pricing/Cost module provides comprehensive landed cost calculation and pricing analysis for international shipments. It supports multiple destinations (UK, US, EU) with configurable exchange rates, duties, VAT, fees, and thresholds.

## Features

- **Excel Import**: Upload and parse pricing data from Excel files
- **Deterministic Calculator**: Explainable cost breakdown for every calculation
- **Multi-Country Support**: UK, US, and EU with country-specific rates
- **Versioned Rates**: Time-based effective rates for historical accuracy
- **RBAC**: Rate management restricted to Super Users
- **Margin Analysis**: Support for both MARGIN and MARKUP modes
- **Snapshot Storage**: Every calculation stores the exact rates used

## Data Model

### Core Entities

#### Product

Stores product master data:

- `sku`: Unique product identifier
- `name`: Product name
- `hsCode`: Harmonized System code for customs
- `weightKg`: Product weight in kilograms
- `volumeM3`: Product volume in cubic meters

#### Import

Represents a batch import of pricing data:

- `name`: Import batch name
- `createdBy`: User who created the import
- `items`: Related import items

#### ImportItem

Individual items within an import:

- `product`: Reference to product
- `purchasePricePkr`: Purchase price in PKR
- `units`: Number of units per order

### Rate Tables

#### FxRate

Exchange rates for PKR to destination currencies:

- `asOfDate`: Rate effective date
- `pkrToGbp`, `pkrToUsd`, `pkrToEur`: Exchange rates

#### DutyRate

Customs duty rates:

- `country`: Destination country (UK/US/EU)
- `hsCode`: HS Code
- `ratePercent`: Duty rate as decimal (e.g., 0.035 = 3.5%)
- `effectiveFrom`, `effectiveTo`: Validity period

#### VatRate

VAT/Tax rates:

- `country`: Destination country
- `ratePercent`: VAT rate as decimal
- `base`: What the VAT is calculated on (CIF/CIF_PLUS_DUTY/CIF_PLUS_DUTY_FEES)
- `effectiveFrom`, `effectiveTo`: Validity period

#### Fee

Additional fees:

- `country`: Destination country
- `name`: Fee name (e.g., "Customs Clearance")
- `method`: FIXED, PER_KG, PER_UNIT, or PCT
- `value`: Fee value

#### Threshold

Country-specific threshold rules:

- `country`: Destination country
- `ruleName`: Rule identifier (e.g., "US_SECTION_321")
- `jsonRule`: Rule configuration as JSON

### Pricing Run

#### PricingRun

A pricing calculation scenario:

- `import`: Source import data
- `destination`: Target country
- `incoterm`: FOB, CIF, or DDP
- `fxDate`: FX rate date to use
- `marginMode`: MARGIN or MARKUP
- `marginValue`: Target margin/markup value
- `freightModel`: Freight calculation model (JSON)
- `insuranceModel`: Insurance calculation model (JSON)
- `feesOverrides`: Custom fee overrides (JSON)
- `thresholdToggles`: Enabled thresholds (JSON)
- `rounding`: Rounding rules (JSON)
- `snapshotRates`: Snapshot of all rates used

#### PricingRunItem

Individual item calculation results:

- `importItem`: Source import item
- `breakdownJson`: Complete calculation breakdown
- `basePkr`: Base price in PKR
- `sellingPrice`: Final selling price
- `landedCost`: Total landed cost
- `marginPct`: Achieved margin percentage

## Calculation Flow

The pricing calculator follows this deterministic flow:

```
1. base = basePKR × fxRate
2. freightPerUnit = calculated from freightModel
3. insurancePerUnit = calculated from insuranceModel
4. customsValue (CIF) = base + freightPerUnit + insurancePerUnit
5. duty = customsValue × dutyRate(hsCode, country, date)
6. feesApplied = Σ(fees based on method)
7. vatBaseAmount = calculated per vat_rates.base
8. tax (VAT) = vatRate × vatBaseAmount
9. landedCost = customsValue + duty + feesApplied + tax
10. sellingPrice =
    - MARGIN mode: landedCost / (1 - marginValue)
    - MARKUP mode: landedCost × (1 + marginValue)
11. marginPct = (sellingPrice - landedCost) / sellingPrice
```

### Models Explained

#### Freight Model

```json
{
  "type": "PER_KG|PER_UNIT|PER_ORDER|FIXED",
  "value": 3.6
}
```

#### Insurance Model

```json
{
  "type": "PCT_OF_VALUE|PCT|FIXED|PER_KG|PER_UNIT",
  "value": 0.003
}
```

#### Rounding Model

```json
{
  "mode": "ENDINGS|NEAREST|UP|DOWN",
  "value": 0.99
}
```

## API Reference

### Import Management

#### POST /api/pricing/imports

Upload Excel file with pricing data.

**Headers:**

- `x-user-id`: User ID
- `Content-Type`: multipart/form-data

**Body:**

- `file`: Excel file
- `name`: Import name (optional)

**Excel Format:**
Columns: SKU, Category, Product Name, HS Code, PurchasePricePKR, UnitsPerOrder, WeightKg, VolumeM3

**Response:**

```json
{
  "success": true,
  "import": {
    "id": "uuid",
    "name": "Import name",
    "createdAt": "2025-01-01T00:00:00Z",
    "itemsCount": 10
  },
  "validation": {
    "totalRows": 10,
    "validRows": 10,
    "invalidRows": 0,
    "warnings": []
  }
}
```

#### GET /api/pricing/imports

List all imports.

#### GET /api/pricing/imports/:id

Get import details with items.

### Pricing Runs

#### POST /api/pricing/runs

Create a new pricing run.

**Body:**

```json
{
  "importId": "uuid",
  "destination": "UK|US|EU",
  "incoterm": "FOB|CIF|DDP",
  "fxDate": "2025-01-01" | "latest",
  "marginMode": "MARGIN|MARKUP",
  "marginValue": 0.35,
  "freightModel": {
    "type": "PER_KG",
    "value": 3.6
  },
  "insuranceModel": {
    "type": "PCT_OF_VALUE",
    "value": 0.003
  },
  "feesOverrides": {},
  "thresholdToggles": {
    "US_SECTION_321": true
  },
  "rounding": {
    "mode": "ENDINGS",
    "value": 0.99
  }
}
```

#### POST /api/pricing/runs/:id/calculate

Calculate pricing for all items in a run.

**Query Params:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response:**

```json
{
  "success": true,
  "pricingRunId": "uuid",
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  },
  "totals": {
    "totalBasePkr": 110000,
    "totalLandedCost": 500,
    "totalSellingPrice": 770,
    "averageMarginPct": 0.35
  },
  "snapshotRates": {...}
}
```

#### GET /api/pricing/runs/:id

Get pricing run results.

#### GET /api/pricing/runs

List all pricing runs.

### Rate Management (Super User Only)

All rate endpoints require `x-user-id` header with Super User role.

#### FX Rates

- `GET /api/pricing/fx-rates` - List all FX rates
- `POST /api/pricing/fx-rates` - Create FX rate
- `PUT /api/pricing/fx-rates/:id` - Update FX rate
- `DELETE /api/pricing/fx-rates/:id` - Delete FX rate

#### Duty Rates

- `GET /api/pricing/duty-rates?country=UK&hsCode=420231` - List duty rates
- `POST /api/pricing/duty-rates` - Create duty rate
- `PUT /api/pricing/duty-rates/:id` - Update duty rate
- `DELETE /api/pricing/duty-rates/:id` - Delete duty rate

#### VAT Rates

- `GET /api/pricing/vat-rates?country=UK` - List VAT rates
- `POST /api/pricing/vat-rates` - Create VAT rate
- `PUT /api/pricing/vat-rates/:id` - Update VAT rate
- `DELETE /api/pricing/vat-rates/:id` - Delete VAT rate

#### Fees

- `GET /api/pricing/fees?country=UK` - List fees
- `POST /api/pricing/fees` - Create fee
- `PUT /api/pricing/fees/:id` - Update fee
- `DELETE /api/pricing/fees/:id` - Delete fee

#### Thresholds

- `GET /api/pricing/thresholds?country=US` - List thresholds
- `POST /api/pricing/thresholds` - Create threshold
- `PUT /api/pricing/thresholds/:id` - Update threshold
- `DELETE /api/pricing/thresholds/:id` - Delete threshold

## Example Usage

### 1. Upload Pricing Data

```bash
curl -X POST http://localhost:8787/api/pricing/imports \
  -H "x-user-id: USER_UUID" \
  -F "file=@pricing-data.xlsx" \
  -F "name=January 2025 Import"
```

### 2. Create Pricing Run

```bash
curl -X POST http://localhost:8787/api/pricing/runs \
  -H "Content-Type: application/json" \
  -d '{
    "importId": "IMPORT_UUID",
    "destination": "UK",
    "incoterm": "CIF",
    "fxDate": "latest",
    "marginMode": "MARGIN",
    "marginValue": 0.35,
    "freightModel": { "type": "PER_KG", "value": 3.6 },
    "insuranceModel": { "type": "PCT_OF_VALUE", "value": 0.003 },
    "rounding": { "mode": "ENDINGS", "value": 0.99 }
  }'
```

### 3. Calculate Pricing

```bash
curl -X POST http://localhost:8787/api/pricing/runs/RUN_UUID/calculate
```

### 4. Get Results

```bash
curl http://localhost:8787/api/pricing/runs/RUN_UUID?page=1&limit=50
```

## Sample Calculation

**Input:**

- SKU: FNV-1001
- HS Code: 420231
- Purchase Price: 1,100 PKR
- Units: 100
- Weight: 0.30 kg
- Destination: UK
- Margin Mode: MARGIN (35%)

**Rates (as of 2025-01-01):**

- FX: 1 PKR = 0.0028 GBP
- Duty: 3.5%
- VAT: 20% on CIF+Duty
- Freight: £3.60/kg
- Insurance: 0.3% of value

**Calculation:**

```
1. Base = 1100 × 0.0028 = £3.08
2. Freight = 0.30 × 3.6 = £1.08
3. Insurance = 3.08 × 0.003 = £0.0092
4. CIF = 3.08 + 1.08 + 0.0092 = £4.1692
5. Duty = 4.1692 × 0.035 = £0.1459
6. Fees = £15 + (100 × 0.50) = £65.00
7. VAT Base = 4.1692 + 0.1459 = £4.3151
8. VAT = 4.3151 × 0.20 = £0.8630
9. Landed Cost = 4.1692 + 0.1459 + 65.00 + 0.8630 = £70.1781
10. Selling Price = 70.1781 / (1 - 0.35) = £107.9663
11. With rounding: £107.99
12. Margin = (107.99 - 70.1781) / 107.99 = 35.03%
```

## Testing

Run the golden tests:

```bash
node tests/pricing.golden.test.js
```

The test suite includes:

- UK pricing with MARGIN mode
- US pricing with MARGIN mode
- EU pricing with MARKUP mode
- Margin verification tests
- Expected vs actual comparisons

## Database Migration

After updating the schema, run:

```bash
npm run db:push
```

Or for production:

```bash
npx prisma migrate deploy
```

## Seeding Initial Rates

Create a seed script to populate initial rates:

```bash
npm run db:seed
```

See `prisma/seed.pricing.ts` for the pricing rates seed data.

## Notes

### Margin vs Markup

- **MARGIN**: (Price - Cost) / Price = marginValue
  - 35% margin: Price = Cost / (1 - 0.35) = Cost / 0.65
- **MARKUP**: (Price - Cost) / Cost = marginValue
  - 53.85% markup: Price = Cost × (1 + 0.5385) = Cost × 1.5385
  - This gives the same 35% margin: (1.5385 - 1) / 1.5385 = 0.35

### Rate Versioning

Rates use `effectiveFrom` and `effectiveTo` dates. When calculating:

- The system finds the rate that was effective on the `fxDate`
- Multiple rates can exist for the same HS code/country
- The most recent effective rate before/on the date is used

### Breakdown JSON

Every calculation stores a complete breakdown including:

- All inputs (SKU, HS code, weights, etc.)
- All rates used (with IDs)
- Every intermediate calculation step
- Final results

This ensures complete auditability and explainability of all pricing decisions.

## Frontend Integration

See `FRONTEND_INTEGRATION.md` for details on integrating the pricing module with your frontend application.
