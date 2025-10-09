import xlsx from 'xlsx';

/**
 * Parse pricing import Excel file
 * Expected columns: SKU, Category, Product Name, HS Code, PurchasePricePKR, UnitsPerOrder, WeightKg, VolumeM3
 */
export function parsePricingExcel(buffer) {
    try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(firstSheet);

        if (rows.length === 0) {
            return {
                success: false,
                error: 'No data found in Excel file'
            };
        }

        const items = [];
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // +2 because Excel is 1-indexed and has header

            try {
                // Extract and validate fields
                const sku = (row['SKU'] || row['sku'] || '').toString().trim();
                const category = (row['Category'] || row['category'] || '').toString().trim();
                const productName = (row['Product Name'] || row['ProductName'] || row['product_name'] || '').toString().trim();
                const hsCode = (row['HS Code'] || row['HSCode'] || row['hs_code'] || '').toString().trim();
                const purchasePricePKR = parseFloat(row['PurchasePricePKR'] || row['PurchasePrice'] || row['purchase_price_pkr'] || 0);
                const unitsPerOrder = parseInt(row['UnitsPerOrder'] || row['Units'] || row['units_per_order'] || 0);
                const weightKg = parseFloat(row['WeightKg'] || row['Weight'] || row['weight_kg'] || 0);
                const volumeM3 = parseFloat(row['VolumeM3'] || row['Volume'] || row['volume_m3'] || 0);

                // Validate required fields
                const validationErrors = [];

                if (!sku) validationErrors.push('SKU is required');
                if (!productName) validationErrors.push('Product Name is required');
                if (!hsCode) validationErrors.push('HS Code is required');
                if (isNaN(purchasePricePKR) || purchasePricePKR < 0) {
                    validationErrors.push('PurchasePricePKR must be a non-negative number');
                }
                if (isNaN(unitsPerOrder) || unitsPerOrder <= 0) {
                    validationErrors.push('UnitsPerOrder must be a positive number');
                }
                if (isNaN(weightKg) || weightKg < 0) {
                    validationErrors.push('WeightKg must be a non-negative number');
                }
                if (isNaN(volumeM3) || volumeM3 < 0) {
                    validationErrors.push('VolumeM3 must be a non-negative number');
                }

                if (validationErrors.length > 0) {
                    errors.push({
                        row: rowNum,
                        sku,
                        errors: validationErrors
                    });
                    continue;
                }

                items.push({
                    sku,
                    category,
                    name: productName,
                    hsCode,
                    purchasePricePkr: purchasePricePKR,
                    units: unitsPerOrder,
                    weightKg,
                    volumeM3
                });

            } catch (error) {
                errors.push({
                    row: rowNum,
                    error: error.message
                });
            }
        }

        return {
            success: true,
            items,
            errors,
            totalRows: rows.length,
            validRows: items.length,
            invalidRows: errors.length
        };

    } catch (error) {
        return {
            success: false,
            error: `Failed to parse Excel file: ${error.message}`
        };
    }
}

/**
 * Validate pricing import data
 */
export function validatePricingImport(items) {
    const validation = {
        valid: true,
        errors: [],
        warnings: []
    };

    // Check for duplicate SKUs
    const skuCounts = {};
    items.forEach((item, idx) => {
        if (skuCounts[item.sku]) {
            validation.errors.push({
                row: idx + 2,
                sku: item.sku,
                error: 'Duplicate SKU found'
            });
            validation.valid = false;
        } else {
            skuCounts[item.sku] = 1;
        }
    });

    // Check for missing critical fields
    items.forEach((item, idx) => {
        if (!item.hsCode || item.hsCode.length < 4) {
            validation.errors.push({
                row: idx + 2,
                sku: item.sku,
                error: 'HS Code must be at least 4 characters'
            });
            validation.valid = false;
        }

        if (item.weightKg === 0 && item.volumeM3 === 0) {
            validation.warnings.push({
                row: idx + 2,
                sku: item.sku,
                warning: 'Both weight and volume are zero - freight calculation may be inaccurate'
            });
        }
    });

    return validation;
}

