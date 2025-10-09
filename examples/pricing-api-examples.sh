#!/bin/bash

# Pricing Module API Examples
# Complete workflow demonstrating all pricing APIs

# Configuration
BASE_URL="http://localhost:8787"
USER_ID="YOUR_USER_ID_HERE"  # Replace with actual user ID

echo "🚀 Pricing Module API Examples"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Upload Pricing Data
echo -e "${BLUE}Step 1: Upload Pricing Data${NC}"
echo "Uploading pricing-template.xlsx..."

IMPORT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pricing/imports" \
  -H "x-user-id: $USER_ID" \
  -F "file=@pricing-template.xlsx" \
  -F "name=January 2025 Import")

echo "$IMPORT_RESPONSE" | jq '.'

IMPORT_ID=$(echo "$IMPORT_RESPONSE" | jq -r '.import.id')
echo -e "${GREEN}✅ Import created: $IMPORT_ID${NC}"
echo ""

# 2. View Import Details
echo -e "${BLUE}Step 2: View Import Details${NC}"
curl -s "$BASE_URL/api/pricing/imports/$IMPORT_ID" | jq '.'
echo ""

# 3. Get Current Rates
echo -e "${BLUE}Step 3: Check Available Rates${NC}"

echo "FX Rates:"
curl -s "$BASE_URL/api/pricing/fx-rates" | jq '.[] | {asOfDate, pkrToGbp, pkrToUsd, pkrToEur}'
echo ""

echo "Duty Rates for HS 420231:"
curl -s "$BASE_URL/api/pricing/duty-rates?hsCode=420231" | jq '.[] | {country, hsCode, ratePercent}'
echo ""

echo "VAT Rates:"
curl -s "$BASE_URL/api/pricing/vat-rates" | jq '.[] | {country, ratePercent, base}'
echo ""

# 4. Create Pricing Run - UK with 35% Margin
echo -e "${BLUE}Step 4: Create UK Pricing Run (35% margin)${NC}"

UK_RUN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pricing/runs" \
  -H "Content-Type: application/json" \
  -d '{
    "importId": "'"$IMPORT_ID"'",
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
  }')

echo "$UK_RUN_RESPONSE" | jq '.'

UK_RUN_ID=$(echo "$UK_RUN_RESPONSE" | jq -r '.pricingRun.id')
echo -e "${GREEN}✅ UK Pricing Run created: $UK_RUN_ID${NC}"
echo ""

# 5. Calculate UK Pricing
echo -e "${BLUE}Step 5: Calculate UK Pricing${NC}"

UK_CALC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pricing/runs/$UK_RUN_ID/calculate")

echo "Results Summary:"
echo "$UK_CALC_RESPONSE" | jq '{
  success,
  totalItems: .pagination.total,
  totals: .totals
}'
echo ""

echo "First Item Breakdown:"
echo "$UK_CALC_RESPONSE" | jq '.items[0] | {
  sku: .importItem.product.sku,
  name: .importItem.product.name,
  basePkr: .basePkr,
  landedCost: .landedCost,
  sellingPrice: .sellingPrice,
  marginPct: .marginPct
}'
echo ""

# 6. Create Pricing Run - US with same margin
echo -e "${BLUE}Step 6: Create US Pricing Run${NC}"

US_RUN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pricing/runs" \
  -H "Content-Type: application/json" \
  -d '{
    "importId": "'"$IMPORT_ID"'",
    "destination": "US",
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
    "thresholdToggles": {
      "US_SECTION_321": true
    },
    "rounding": {
      "mode": "ENDINGS",
      "value": 0.99
    }
  }')

US_RUN_ID=$(echo "$US_RUN_RESPONSE" | jq -r '.pricingRun.id')
echo -e "${GREEN}✅ US Pricing Run created: $US_RUN_ID${NC}"
echo ""

# 7. Calculate US Pricing
echo -e "${BLUE}Step 7: Calculate US Pricing${NC}"

US_CALC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pricing/runs/$US_RUN_ID/calculate")

echo "Results Summary:"
echo "$US_CALC_RESPONSE" | jq '{
  success,
  totalItems: .pagination.total,
  totals: .totals
}'
echo ""

# 8. Create Pricing Run - EU with 53.85% markup (equivalent to 35% margin)
echo -e "${BLUE}Step 8: Create EU Pricing Run (53.85% markup = 35% margin)${NC}"

EU_RUN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pricing/runs" \
  -H "Content-Type: application/json" \
  -d '{
    "importId": "'"$IMPORT_ID"'",
    "destination": "EU",
    "incoterm": "CIF",
    "fxDate": "latest",
    "marginMode": "MARKUP",
    "marginValue": 0.5385,
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
  }')

EU_RUN_ID=$(echo "$EU_RUN_RESPONSE" | jq -r '.pricingRun.id')
echo -e "${GREEN}✅ EU Pricing Run created: $EU_RUN_ID${NC}"
echo ""

# 9. Calculate EU Pricing
echo -e "${BLUE}Step 9: Calculate EU Pricing${NC}"

EU_CALC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pricing/runs/$EU_RUN_ID/calculate")

echo "Results Summary:"
echo "$EU_CALC_RESPONSE" | jq '{
  success,
  totalItems: .pagination.total,
  totals: .totals
}'
echo ""

# 10. Compare Results
echo -e "${BLUE}Step 10: Compare UK vs US vs EU${NC}"
echo ""

echo -e "${YELLOW}UK Results:${NC}"
curl -s "$BASE_URL/api/pricing/runs/$UK_RUN_ID" | jq '.totals'
echo ""

echo -e "${YELLOW}US Results:${NC}"
curl -s "$BASE_URL/api/pricing/runs/$US_RUN_ID" | jq '.totals'
echo ""

echo -e "${YELLOW}EU Results:${NC}"
curl -s "$BASE_URL/api/pricing/runs/$EU_RUN_ID" | jq '.totals'
echo ""

# 11. Get Detailed Breakdown for One Item
echo -e "${BLUE}Step 11: Detailed Breakdown for First Item${NC}"

echo "UK Breakdown:"
curl -s "$BASE_URL/api/pricing/runs/$UK_RUN_ID" | \
  jq '.items[0].breakdownJson.calculations | {
    base,
    freightPerUnit,
    insurancePerUnit,
    customsValue,
    duty,
    totalFees,
    tax,
    landedCost,
    sellingPrice,
    marginPct
  }'
echo ""

# 12. List All Pricing Runs
echo -e "${BLUE}Step 12: List All Pricing Runs${NC}"
curl -s "$BASE_URL/api/pricing/runs" | jq '.[] | {
  id,
  destination,
  incoterm,
  marginMode,
  marginValue,
  createdAt
}'
echo ""

# 13. Rate Management Examples (Super User Only)
echo -e "${BLUE}Step 13: Rate Management (Super User Only)${NC}"

echo -e "${YELLOW}Add new FX rate:${NC}"
echo "curl -X POST $BASE_URL/api/pricing/fx-rates \\"
echo "  -H 'x-user-id: SUPER_USER_ID' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"asOfDate\":\"2025-02-01\",\"pkrToGbp\":0.0029,\"pkrToUsd\":0.0037,\"pkrToEur\":0.0034}'"
echo ""

echo -e "${YELLOW}Add new duty rate:${NC}"
echo "curl -X POST $BASE_URL/api/pricing/duty-rates \\"
echo "  -H 'x-user-id: SUPER_USER_ID' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"country\":\"UK\",\"hsCode\":\"420231\",\"ratePercent\":0.035,\"effectiveFrom\":\"2025-01-01\"}'"
echo ""

echo -e "${GREEN}✅ API Examples Complete!${NC}"
echo ""
echo "Summary:"
echo "- Import ID: $IMPORT_ID"
echo "- UK Run ID: $UK_RUN_ID"
echo "- US Run ID: $US_RUN_ID"
echo "- EU Run ID: $EU_RUN_ID"
echo ""
echo "Next steps:"
echo "1. View full results in browser: $BASE_URL/api/pricing/runs/$UK_RUN_ID"
echo "2. Export data or integrate with frontend"
echo "3. Adjust rates and re-calculate"

