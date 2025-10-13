// Database Connection Test
import { PrismaClient } from '@prisma/client';

console.log('🔍 Testing Database Connection...\n');
console.log('='.repeat(60));

const prisma = new PrismaClient({
    log: ['error', 'warn'],
});

async function checkDatabase() {
    try {
        console.log('\n1️⃣ Checking DATABASE_URL...');
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
            const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':****@');
            console.log(`   ✅ Found: ${maskedUrl}`);
        } else {
            console.log('   ❌ DATABASE_URL not found in .env');
            process.exit(1);
        }

        console.log('\n2️⃣ Testing database connection...');

        // Simple query to test connection
        const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as current_time`;

        console.log('   ✅ Connection successful!');
        console.log(`   Server time: ${result[0].current_time}`);

        console.log('\n3️⃣ Checking schema...');
        const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

        console.log(`   ✅ Found ${tables.length} tables:`);
        tables.forEach(t => console.log(`      - ${t.table_name}`));

        // Check if pricing tables exist
        const pricingTables = ['products', 'imports', 'import_items', 'fx_rates', 'duty_rates', 'vat_rates', 'fees', 'thresholds', 'pricing_runs', 'pricing_run_items'];
        const existingTables = tables.map(t => t.table_name);
        const missingTables = pricingTables.filter(t => !existingTables.includes(t));

        if (missingTables.length > 0) {
            console.log(`\n   ⚠️  Missing pricing tables (${missingTables.length}):`);
            missingTables.forEach(t => console.log(`      - ${t}`));
            console.log('\n   💡 Run: npm run db:push');
        } else {
            console.log('\n   ✅ All pricing tables exist!');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Database Status: CONNECTED & READY\n');

    } catch (error) {
        console.log('\n' + '='.repeat(60));
        console.log('❌ Database Status: CONNECTION FAILED\n');

        console.log('Error Details:');
        console.log(`   Code: ${error.code}`);
        console.log(`   Message: ${error.message}`);

        console.log('\n💡 Troubleshooting Steps:\n');

        if (error.code === 'P1001') {
            console.log('   1. Check if database server is running');
            console.log('   2. Verify DATABASE_URL in .env file');
            console.log('   3. Check network/firewall settings');
            console.log('   4. Verify Supabase project is active');
            console.log('   5. Try pausing and resuming the Supabase project');
        } else if (error.code === 'P1003') {
            console.log('   1. Database exists but may need schema');
            console.log('   2. Run: npm run db:push');
        } else {
            console.log('   1. Check .env file for correct credentials');
            console.log('   2. Verify database is accessible');
            console.log('   3. Check Supabase dashboard');
        }

        console.log('\n   📚 More help: https://www.prisma.io/docs/reference/api-reference/error-reference');
        console.log();

        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();

