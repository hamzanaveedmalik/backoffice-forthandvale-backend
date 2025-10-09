# Pricing Module - Deployment Checklist

## ✅ Pre-Deployment Steps

### 1. Install Dependencies

```bash
cd /Users/hammal/Documents/personal-dev/backoffice-backend
npm install
```

**Verify:** All packages install without errors

### 2. Generate Prisma Client

```bash
npm run db:generate
```

**Verify:** Prisma client generated with new pricing models

### 3. Apply Database Schema

```bash
npm run db:push
```

**Expected:** Creates new tables:

- ✅ products
- ✅ imports
- ✅ import_items
- ✅ fx_rates
- ✅ duty_rates
- ✅ vat_rates
- ✅ fees
- ✅ thresholds
- ✅ pricing_runs
- ✅ pricing_run_items

### 4. Seed Pricing Rates

```bash
npm run db:seed:pricing
```

**Expected:** Populates:

- ✅ 2 FX rates (Jan 2025, Dec 2024)
- ✅ 15 duty rates (for common HS codes)
- ✅ 3 VAT rates (UK, US, EU)
- ✅ 8 fees (various countries)
- ✅ 4 thresholds (Section 321, low value, etc.)

### 5. Create Excel Template

```bash
npm run pricing:template
```

**Expected:** Creates `pricing-template.xlsx` with:

- ✅ 10 sample products
- ✅ Instructions sheet
- ✅ HS codes reference

### 6. Run Golden Tests

```bash
npm run pricing:test
```

**Expected:** All tests pass:

- ✅ UK pricing calculation
- ✅ US pricing calculation
- ✅ EU pricing calculation
- ✅ Margin verification
- ✅ No rounding test

### 7. Start Server

```bash
npm run dev
```

**Expected:** Server starts on port 8787

## 🧪 API Testing Checklist

### Test 1: Upload Pricing Data

```bash
curl -X POST http://localhost:8787/api/pricing/imports \
  -H "x-user-id: YOUR_USER_ID" \
  -F "file=@pricing-template.xlsx" \
  -F "name=Test Import"
```

**Expected:**

- ✅ Status 200
- ✅ Returns import ID
- ✅ Shows itemsCount: 10
- ✅ validRows: 10, invalidRows: 0

**Save import ID for next steps**

### Test 2: View Import

```bash
curl http://localhost:8787/api/pricing/imports/IMPORT_ID
```

**Expected:**

- ✅ Shows import details
- ✅ Includes 10 items
- ✅ Each item has product with SKU, name, hsCode, weightKg, volumeM3

### Test 3: Check Rates

```bash
curl http://localhost:8787/api/pricing/fx-rates
curl http://localhost:8787/api/pricing/duty-rates?hsCode=420231
curl http://localhost:8787/api/pricing/vat-rates?country=UK
curl http://localhost:8787/api/pricing/fees?country=UK
```

**Expected:**

- ✅ FX rates returned
- ✅ Duty rates for HS 420231
- ✅ UK VAT rate (20%)
- ✅ UK fees

### Test 4: Create Pricing Run

```bash
curl -X POST http://localhost:8787/api/pricing/runs \
  -H "Content-Type: application/json" \
  -d '{
    "importId": "IMPORT_ID",
    "destination": "UK",
    "incoterm": "CIF",
    "fxDate": "latest",
    "marginMode": "MARGIN",
    "marginValue": 0.35,
    "freightModel": {"type": "PER_KG", "value": 3.6},
    "insuranceModel": {"type": "PCT_OF_VALUE", "value": 0.003},
    "rounding": {"mode": "ENDINGS", "value": 0.99}
  }'
```

**Expected:**

- ✅ Status 201
- ✅ Returns pricing run ID
- ✅ Shows destination, incoterm, marginMode

**Save pricing run ID**

### Test 5: Calculate Pricing

```bash
curl -X POST http://localhost:8787/api/pricing/runs/RUN_ID/calculate
```

**Expected:**

- ✅ Status 200
- ✅ success: true
- ✅ items array with calculations
- ✅ totals object
- ✅ snapshotRates with all rates used
- ✅ Each item has breakdownJson

### Test 6: View Results

```bash
curl http://localhost:8787/api/pricing/runs/RUN_ID
```

**Expected:**

- ✅ Pricing run details
- ✅ Paginated items
- ✅ Totals summary
- ✅ Average margin ≈ 0.35 (35%)

### Test 7: Rate Management (Super User)

**Note:** Replace YOUR_SUPER_USER_ID with actual Super User ID

```bash
# Create new FX rate
curl -X POST http://localhost:8787/api/pricing/fx-rates \
  -H "x-user-id: YOUR_SUPER_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "asOfDate": "2025-02-01",
    "pkrToGbp": 0.0029,
    "pkrToUsd": 0.0037,
    "pkrToEur": 0.0034
  }'
```

**Expected:**

- ✅ Status 201 (if Super User)
- ✅ Status 403 (if not Super User)

### Test 8: Multiple Destinations

Create and calculate runs for US and EU, then compare:

```bash
# US Run
curl -X POST http://localhost:8787/api/pricing/runs \
  -H "Content-Type: application/json" \
  -d '{"importId":"IMPORT_ID","destination":"US",...}'

# EU Run
curl -X POST http://localhost:8787/api/pricing/runs \
  -H "Content-Type: application/json" \
  -d '{"importId":"IMPORT_ID","destination":"EU",...}'
```

**Expected:**

- ✅ Different totals for each country
- ✅ US has 0% VAT
- ✅ EU has 19% VAT
- ✅ UK has 20% VAT

## 📊 Verification Checklist

### Database

- [ ] All 10 new tables created
- [ ] FX rates seeded
- [ ] Duty rates seeded
- [ ] VAT rates seeded
- [ ] Fees seeded
- [ ] Thresholds seeded

### Files Created

- [ ] `lib/pricingCalculator.js` - Calculator logic
- [ ] `lib/pricingExcelParser.js` - Excel parser
- [ ] `prisma/seed.pricing.ts` - Seed script
- [ ] `scripts/create-pricing-template.js` - Template generator
- [ ] `tests/pricing.golden.test.js` - Golden tests
- [ ] `examples/pricing-api-examples.sh` - API examples
- [ ] `PRICING_MODULE.md` - Complete documentation
- [ ] `PRICING_QUICKSTART.md` - Quick start guide
- [ ] `PRICING_IMPLEMENTATION_SUMMARY.md` - Summary
- [ ] `PRICING_DEPLOYMENT_CHECKLIST.md` - This file

### APIs Working

- [ ] POST /api/pricing/imports (upload Excel)
- [ ] GET /api/pricing/imports (list imports)
- [ ] GET /api/pricing/imports/:id (get import)
- [ ] POST /api/pricing/runs (create run)
- [ ] POST /api/pricing/runs/:id/calculate (calculate)
- [ ] GET /api/pricing/runs/:id (get results)
- [ ] GET /api/pricing/runs (list runs)
- [ ] GET /api/pricing/fx-rates
- [ ] POST /api/pricing/fx-rates (Super User)
- [ ] PUT /api/pricing/fx-rates/:id (Super User)
- [ ] DELETE /api/pricing/fx-rates/:id (Super User)
- [ ] Similar CRUD for duty-rates, vat-rates, fees, thresholds

### Calculations Verified

- [ ] UK calculation matches expected
- [ ] US calculation matches expected
- [ ] EU calculation matches expected
- [ ] MARGIN mode works correctly
- [ ] MARKUP mode works correctly
- [ ] Margin formula verified: (price - cost) / price ≈ marginValue
- [ ] Rounding works (ENDINGS mode)
- [ ] Breakdown JSON includes all steps
- [ ] Snapshot stores exact rates used

### RBAC

- [ ] Rate management requires Super User
- [ ] Non-super users get 403 error
- [ ] Missing user ID gets 401 error

## 🚀 Production Deployment

### Environment Variables

Ensure these are set in production:

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NODE_ENV=production
PORT=8787
```

### Build

```bash
npm run build
```

### Deploy to Vercel

```bash
vercel --prod
```

### Post-Deployment

1. Run database migration:

   ```bash
   npx prisma migrate deploy
   ```

2. Seed pricing rates:

   ```bash
   npm run db:seed:pricing
   ```

3. Test API endpoints (use production URL)

4. Verify CORS settings allow your frontend domain

## 📈 Monitoring

After deployment, monitor:

- [ ] API response times
- [ ] Database query performance
- [ ] Error rates
- [ ] Calculation accuracy

## 🔍 Troubleshooting

### Common Issues

**Issue:** "No FX rate found"

- **Fix:** Run `npm run db:seed:pricing` or add FX rate manually

**Issue:** "Pricing run not found"

- **Fix:** Verify run ID, check database

**Issue:** "Rate management returns 403"

- **Fix:** Ensure user has SUPER role

**Issue:** "Excel upload fails"

- **Fix:** Check file format, validate columns match template

**Issue:** "Margin doesn't match expected"

- **Fix:** Verify using correct mode (MARGIN vs MARKUP)

## ✅ Sign-Off

Deployment completed by: ********\_********

Date: ********\_********

All tests passed: ☐ Yes ☐ No

Production URL: ********\_********

Notes:

---

---

---

## 📞 Support

For issues or questions:

1. Check documentation in `PRICING_MODULE.md`
2. Review API examples in `examples/pricing-api-examples.sh`
3. Examine breakdown JSON for calculation details
4. Run golden tests: `npm run pricing:test`

---

**Deployment Status:**

- [ ] Development ✅
- [ ] Staging
- [ ] Production
