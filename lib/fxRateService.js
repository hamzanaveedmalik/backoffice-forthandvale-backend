import fetch from 'node-fetch';

/**
 * FX Rate Service
 * Fetches real-time exchange rates from external API
 */

const FX_API_KEY = process.env.FX_API_KEY || 'demo'; // Get from exchangerate-api.com
const FX_API_BASE = 'https://v6.exchangerate-api.com/v6';

/**
 * Fetch latest FX rates from external API
 * Returns rates relative to PKR
 */
export async function fetchLatestFXRates() {
    try {
        // Fetch rates with PKR as base currency
        const response = await fetch(`${FX_API_BASE}/${FX_API_KEY}/latest/PKR`);

        if (!response.ok) {
            throw new Error(`FX API returned ${response.status}`);
        }

        const data = await response.json();

        if (data.result !== 'success') {
            throw new Error('Failed to fetch FX rates');
        }

        return {
            asOfDate: new Date(data.time_last_update_unix * 1000),
            pkrToGbp: data.conversion_rates.GBP,
            pkrToUsd: data.conversion_rates.USD,
            pkrToEur: data.conversion_rates.EUR,
        };
    } catch (error) {
        console.error('Error fetching FX rates:', error);
        throw error;
    }
}

/**
 * Fetch and save latest FX rates to database
 * Called manually or via cron job
 */
export async function updateFXRates(prisma) {
    try {
        const rates = await fetchLatestFXRates();

        // Check if rate for this date already exists
        const existing = await prisma.fxRate.findUnique({
            where: { asOfDate: rates.asOfDate }
        });

        if (existing) {
            console.log('FX rates for this date already exist');
            return existing;
        }

        // Create new FX rate entry
        const newRate = await prisma.fxRate.create({
            data: rates
        });

        console.log('✅ FX rates updated successfully');
        return newRate;
    } catch (error) {
        console.error('Error updating FX rates:', error);
        throw error;
    }
}

/**
 * Get cached FX rate or fetch if stale
 * Returns cached rate if < 24 hours old, otherwise fetches new
 */
export async function getOrFetchFXRate(prisma) {
    // Get latest cached rate
    const latestRate = await prisma.fxRate.findFirst({
        orderBy: { asOfDate: 'desc' }
    });

    if (!latestRate) {
        console.log('No FX rates in cache, fetching...');
        return await updateFXRates(prisma);
    }

    // Check if rate is fresh (< 24 hours old)
    const ageHours = (Date.now() - new Date(latestRate.asOfDate).getTime()) / (1000 * 60 * 60);

    if (ageHours > 24) {
        console.log('FX rates are stale, fetching fresh rates...');
        try {
            return await updateFXRates(prisma);
        } catch (error) {
            console.warn('Failed to fetch fresh rates, using cached:', error.message);
            return latestRate; // Fallback to cached
        }
    }

    return latestRate;
}

