import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Pricing Calculator - Deterministic and Explainable
 * 
 * Calculation flow:
 * 1. base = basePKR * fx
 * 2. freightPerUnit -> from freightModel
 * 3. insurancePerUnit -> from insuranceModel
 * 4. customsValue = base + freightPerUnit + insurancePerUnit
 * 5. duty = customsValue * dutyRate(hsCode, country, date)
 * 6. feesApplied = Σ(fees)
 * 7. vatBaseAmount = (per vat_rates.base)
 * 8. tax = vatRate * vatBaseAmount
 * 9. landedCost = customsValue + duty + feesApplied + tax
 * 10. sellingPrice = MARGIN ? landedCost/(1 - marginValue) : landedCost*(1 + marginValue)
 * 11. marginPct = (sellingPrice - landedCost) / sellingPrice
 */

export class PricingCalculator {
    /**
     * Get FX rate for a specific date
     */
    static async getFxRate(asOfDate) {
        let fxRate;

        if (asOfDate === 'latest' || !asOfDate) {
            fxRate = await prisma.fxRate.findFirst({
                orderBy: { asOfDate: 'desc' }
            });
        } else {
            const targetDate = new Date(asOfDate);
            fxRate = await prisma.fxRate.findFirst({
                where: {
                    asOfDate: {
                        lte: targetDate
                    }
                },
                orderBy: { asOfDate: 'desc' }
            });
        }

        if (!fxRate) {
            throw new Error('No FX rate found for the specified date');
        }

        return fxRate;
    }

    /**
     * Get duty rate for a specific HS code, country, and date
     */
    static async getDutyRate(hsCode, country, date) {
        const targetDate = new Date(date);

        const dutyRate = await prisma.dutyRate.findFirst({
            where: {
                country,
                hsCode,
                effectiveFrom: {
                    lte: targetDate
                },
                OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: targetDate } }
                ]
            },
            orderBy: { effectiveFrom: 'desc' }
        });

        return dutyRate;
    }

    /**
     * Get VAT rate for a specific country and date
     */
    static async getVatRate(country, base, date) {
        const targetDate = new Date(date);

        const vatRate = await prisma.vatRate.findFirst({
            where: {
                country,
                base,
                effectiveFrom: {
                    lte: targetDate
                },
                OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: targetDate } }
                ]
            },
            orderBy: { effectiveFrom: 'desc' }
        });

        return vatRate;
    }

    /**
     * Get fees for a specific country
     */
    static async getFees(country, feesOverrides = null) {
        if (feesOverrides && feesOverrides[country]) {
            return feesOverrides[country];
        }

        const fees = await prisma.fee.findMany({
            where: { country }
        });

        return fees;
    }

    /**
     * Calculate freight per unit
     */
    static calculateFreight(freightModel, weightKg, units) {
        const { type, value } = freightModel;

        switch (type) {
            case 'PER_KG':
                return (weightKg * value);
            case 'PER_UNIT':
                return value;
            case 'PER_ORDER':
                return value / units;
            case 'FIXED':
                return value;
            default:
                return 0;
        }
    }

    /**
     * Calculate insurance per unit
     */
    static calculateInsurance(insuranceModel, base, weightKg, units) {
        const { type, value } = insuranceModel;

        switch (type) {
            case 'PCT_OF_VALUE':
            case 'PCT':
                return base * value;
            case 'FIXED':
                return value;
            case 'PER_KG':
                return weightKg * value;
            case 'PER_UNIT':
                return value;
            default:
                return 0;
        }
    }

    /**
     * Calculate fees
     */
    static calculateFees(fees, customsValue, weightKg, units) {
        let totalFees = 0;
        const appliedFees = [];

        fees.forEach(fee => {
            let feeAmount = 0;

            switch (fee.method) {
                case 'FIXED':
                    feeAmount = parseFloat(fee.value);
                    break;
                case 'PER_KG':
                    feeAmount = parseFloat(fee.value) * weightKg;
                    break;
                case 'PER_UNIT':
                    feeAmount = parseFloat(fee.value) * units;
                    break;
                case 'PCT':
                    feeAmount = customsValue * parseFloat(fee.value);
                    break;
            }

            totalFees += feeAmount;
            appliedFees.push({
                id: fee.id,
                name: fee.name,
                method: fee.method,
                value: parseFloat(fee.value),
                amount: feeAmount
            });
        });

        return { totalFees, appliedFees };
    }

    /**
     * Calculate VAT base amount
     */
    static calculateVatBase(vatBase, customsValue, duty, fees) {
        switch (vatBase) {
            case 'CIF':
                return customsValue;
            case 'CIF_PLUS_DUTY':
                return customsValue + duty;
            case 'CIF_PLUS_DUTY_FEES':
                return customsValue + duty + fees;
            default:
                return customsValue;
        }
    }

    /**
     * Apply rounding rules
     */
    static applyRounding(price, rounding) {
        if (!rounding || !rounding.mode) {
            return price;
        }

        const { mode, value } = rounding;

        switch (mode) {
            case 'ENDINGS':
                // Round to nearest whole number and add the ending (e.g., 0.99)
                return Math.floor(price) + value;
            case 'NEAREST':
                // Round to nearest value
                return Math.round(price / value) * value;
            case 'UP':
                return Math.ceil(price);
            case 'DOWN':
                return Math.floor(price);
            default:
                return price;
        }
    }

    /**
     * Calculate pricing for a single item
     */
    static async calculateItemPricing(importItem, runConfig, rates) {
        const { product } = importItem;
        const {
            destination,
            incoterm,
            marginMode,
            marginValue,
            freightModel,
            insuranceModel,
            feesOverrides,
            thresholdToggles,
            rounding
        } = runConfig;

        const basePkr = parseFloat(importItem.purchasePricePkr);
        const units = importItem.units;
        const weightKg = parseFloat(product.weightKg);
        const volumeM3 = parseFloat(product.volumeM3);
        const hsCode = product.hsCode;

        // Get exchange rate
        const fxRateField = destination === 'UK' ? 'pkrToGbp' :
            destination === 'US' ? 'pkrToUsd' : 'pkrToEur';
        const fxRate = parseFloat(rates.fxRate[fxRateField]);

        // Step 1: Convert base to destination currency
        const base = basePkr * fxRate;

        // Step 2: Calculate freight per unit
        const freightPerUnit = this.calculateFreight(freightModel, weightKg, units);

        // Step 3: Calculate insurance per unit
        const insurancePerUnit = this.calculateInsurance(insuranceModel, base, weightKg, units);

        // Step 4: Calculate customs value (CIF)
        const customsValue = base + freightPerUnit + insurancePerUnit;

        // Step 5: Calculate duty
        let duty = 0;
        let dutyRateUsed = null;

        if (rates.dutyRate) {
            const dutyRatePercent = parseFloat(rates.dutyRate.ratePercent);
            duty = customsValue * dutyRatePercent;
            dutyRateUsed = {
                id: rates.dutyRate.id,
                hsCode: rates.dutyRate.hsCode,
                ratePercent: dutyRatePercent
            };
        }

        // Step 6: Calculate fees
        const { totalFees, appliedFees } = this.calculateFees(
            rates.fees,
            customsValue,
            weightKg,
            units
        );

        // Step 7: Calculate VAT base
        const vatBase = rates.vatRate ? rates.vatRate.base : 'CIF';
        const vatBaseAmount = this.calculateVatBase(vatBase, customsValue, duty, totalFees);

        // Step 8: Calculate tax (VAT)
        let tax = 0;
        let vatRateUsed = null;

        if (rates.vatRate) {
            const vatRatePercent = parseFloat(rates.vatRate.ratePercent);
            tax = vatBaseAmount * vatRatePercent;
            vatRateUsed = {
                id: rates.vatRate.id,
                base: rates.vatRate.base,
                ratePercent: vatRatePercent
            };
        }

        // Step 9: Calculate landed cost
        const landedCost = customsValue + duty + totalFees + tax;

        // Step 10: Calculate selling price
        let sellingPrice;
        if (marginMode === 'MARGIN') {
            // Margin: (price - cost) / price = marginValue
            // Therefore: price = cost / (1 - marginValue)
            sellingPrice = landedCost / (1 - marginValue);
        } else {
            // Markup: (price - cost) / cost = marginValue
            // Therefore: price = cost * (1 + marginValue)
            sellingPrice = landedCost * (1 + marginValue);
        }

        // Apply rounding
        sellingPrice = this.applyRounding(sellingPrice, rounding);

        // Step 11: Calculate actual margin percentage
        const marginPct = (sellingPrice - landedCost) / sellingPrice;

        // Build comprehensive breakdown
        const breakdown = {
            inputs: {
                sku: product.sku,
                hsCode,
                basePkr,
                weightKg,
                volumeM3,
                units,
                destination,
                incoterm,
                marginMode,
                marginValue
            },
            rates: {
                fxRate: {
                    id: rates.fxRate.id,
                    asOfDate: rates.fxRate.asOfDate,
                    rate: fxRate
                },
                dutyRate: dutyRateUsed,
                vatRate: vatRateUsed,
                fees: appliedFees
            },
            calculations: {
                base,
                freightPerUnit,
                insurancePerUnit,
                customsValue,
                duty,
                totalFees,
                vatBaseAmount,
                tax,
                landedCost,
                sellingPrice,
                marginPct
            },
            models: {
                freightModel,
                insuranceModel,
                rounding
            }
        };

        return {
            basePkr,
            sellingPrice,
            landedCost,
            marginPct,
            breakdownJson: breakdown
        };
    }

    /**
     * Calculate pricing for all items in an import
     */
    static async calculateImportPricing(importId, runConfig) {
        const importItems = await prisma.importItem.findMany({
            where: { importId },
            include: {
                product: true
            }
        });

        if (importItems.length === 0) {
            throw new Error('No items found in import');
        }

        // Get rates
        const fxDate = runConfig.fxDate === 'latest' ? new Date() : new Date(runConfig.fxDate);
        const fxRate = await this.getFxRate(fxDate);

        // Collect all unique HS codes
        const hsCodes = [...new Set(importItems.map(item => item.product.hsCode))];

        // Get duty rates for all HS codes
        const dutyRatesMap = {};
        for (const hsCode of hsCodes) {
            const dutyRate = await this.getDutyRate(hsCode, runConfig.destination, fxDate);
            if (dutyRate) {
                dutyRatesMap[hsCode] = dutyRate;
            }
        }

        // Get VAT rate (assuming CIF_PLUS_DUTY as default)
        const vatBase = 'CIF_PLUS_DUTY';
        const vatRate = await this.getVatRate(runConfig.destination, vatBase, fxDate);

        // Get fees
        const fees = await this.getFees(runConfig.destination, runConfig.feesOverrides);

        // Snapshot of rates used
        const snapshotRates = {
            fxRate: {
                id: fxRate.id,
                asOfDate: fxRate.asOfDate,
                pkrToGbp: parseFloat(fxRate.pkrToGbp),
                pkrToUsd: parseFloat(fxRate.pkrToUsd),
                pkrToEur: parseFloat(fxRate.pkrToEur)
            },
            dutyRates: Object.values(dutyRatesMap).map(dr => ({
                id: dr.id,
                country: dr.country,
                hsCode: dr.hsCode,
                ratePercent: parseFloat(dr.ratePercent),
                effectiveFrom: dr.effectiveFrom
            })),
            vatRate: vatRate ? {
                id: vatRate.id,
                country: vatRate.country,
                base: vatRate.base,
                ratePercent: parseFloat(vatRate.ratePercent),
                effectiveFrom: vatRate.effectiveFrom
            } : null,
            fees: fees.map(f => ({
                id: f.id,
                country: f.country,
                name: f.name,
                method: f.method,
                value: parseFloat(f.value)
            }))
        };

        // Calculate pricing for each item
        const results = [];
        for (const importItem of importItems) {
            const rates = {
                fxRate,
                dutyRate: dutyRatesMap[importItem.product.hsCode],
                vatRate,
                fees
            };

            const itemResult = await this.calculateItemPricing(importItem, runConfig, rates);
            results.push({
                importItemId: importItem.id,
                ...itemResult
            });
        }

        return {
            results,
            snapshotRates
        };
    }
}

