# Backoffice Backend

A Node.js/Express API server for the Forth & Vale Leather business management system.

## 🚀 Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
├── prisma/           # Database schema and migrations
├── lib/             # Utility functions and business logic
├── server.js        # Main Express server
├── package.json     # Dependencies and scripts
├── vercel.json      # Vercel deployment configuration
└── tsconfig.json    # TypeScript configuration
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Database commands
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database with demo data
npm run db:seed:pricing  # Seed pricing rates
npm run db:studio        # Open Prisma Studio

# Pricing module commands
npm run pricing:template # Create Excel template
npm run pricing:test     # Run golden tests
```

## 🌐 Deployment

This project is configured for Vercel deployment:

- **Framework**: Node.js
- **Build Command**: `npm run build`
- **Environment Variables**: `DATABASE_URL`, `DIRECT_URL`, `NODE_ENV`

## 🔗 API Endpoints

### Authentication

- `POST /api/auth/login` - User login

### Users

- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Priority Actions

- `GET /api/priority-actions` - Get all actions
- `POST /api/priority-actions` - Create action
- `PUT /api/priority-actions/:id` - Update action
- `DELETE /api/priority-actions/:id` - Delete action
- `GET /api/priority-actions/today` - Get today's actions
- `POST /api/priority-actions/auto-generate` - Auto-generate actions

### Leads

- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

### 💰 Pricing Module (NEW)

Complete landed cost calculation and pricing analysis for international shipments.

**Import Management:**

- `POST /api/pricing/imports` - Upload Excel with pricing data
- `GET /api/pricing/imports` - List all imports
- `GET /api/pricing/imports/:id` - Get import details

**Pricing Runs:**

- `POST /api/pricing/runs` - Create pricing run
- `POST /api/pricing/runs/:id/calculate` - Calculate pricing
- `GET /api/pricing/runs/:id` - Get results
- `GET /api/pricing/runs` - List all runs

**Rate Management (Super User Only):**

- FX Rates: `GET/POST/PUT/DELETE /api/pricing/fx-rates`
- Duty Rates: `GET/POST/PUT/DELETE /api/pricing/duty-rates`
- VAT Rates: `GET/POST/PUT/DELETE /api/pricing/vat-rates`
- Fees: `GET/POST/PUT/DELETE /api/pricing/fees`
- Thresholds: `GET/POST/PUT/DELETE /api/pricing/thresholds`

**Features:**

- Multi-country support (UK, US, EU)
- Deterministic, explainable calculations
- Versioned rates with historical accuracy
- Both MARGIN and MARKUP pricing modes
- Complete breakdown JSON for auditability
- Excel upload with validation
- Golden tests for verification

**Quick Start:**

```bash
# Seed pricing rates
npm run db:seed:pricing

# Create Excel template
npm run pricing:template

# Run tests
npm run pricing:test
```

**Documentation:**

- 📖 [Complete Guide](PRICING_MODULE.md)
- 🚀 [Quick Start](PRICING_QUICKSTART.md)
- ✅ [Implementation Summary](PRICING_IMPLEMENTATION_SUMMARY.md)
- 💡 [API Examples](examples/pricing-api-examples.sh)

## 👥 Demo Users

The database is seeded with these demo users:

- `admin@forthvale.com` / `admin123` (Super User)
- `manager@forthvale.com` / `manager123` (User)
- `viewer@forthvale.com` / `viewer123` (Mini User)
