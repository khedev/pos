# PGPOS - Pharmacy & Grocery Point of Sale System

A modern, secure, and scalable Point of Sale (POS) system for Pharmacy and Grocery businesses.

## Tech Stack

### Frontend
- React 19 + Vite
- Tailwind CSS + shadcn/ui
- TanStack Query + Zustand
- React Router DOM v7
- React Hook Form + Zod
- Recharts + TanStack Table

### Backend
- Node.js + Express.js
- Supabase (PostgreSQL, Auth, Storage)
- JWT Authentication
- Helmet + CORS + Rate Limiting

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+ (or npm)
- Supabase account

### 1. Install Dependencies

```bash
# Install all dependencies (frontend + backend)
pnpm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### 3. Database Setup

Run the SQL files in your Supabase SQL editor:
1. First run `database/schema.sql` to create all tables
2. Then run `database/seed.sql` to populate initial data

Or use the seed script:
```bash
pnpm seed
```

### 4. Start Development

```bash
# Start both frontend and backend simultaneously
pnpm dev

# Or start individually:
pnpm dev:backend   # Backend only (port 5000)
pnpm dev:frontend  # Frontend only (port 5173)
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Default Credentials

| Role    | Email              | Password |
|---------|--------------------|----------|
| Admin   | admin@pgpos.com    | admin123 |
| Cashier | cashier@pgpos.com  | admin123 |
| CSR     | csr@pgpos.com      | admin123 |

## Project Structure

```
pos-system/
├── frontend/          # React SPA
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API services
│   │   ├── store/       # Zustand stores
│   │   └── routes/      # Route config
│   └── package.json
├── backend/           # Express API
│   ├── src/
│   │   ├── controllers/ # Route handlers
│   │   ├── routes/      # API routes
│   │   ├── middleware/   # Auth, roles, etc.
│   │   └── config/      # Supabase, env
│   └── package.json
├── database/          # SQL files
│   ├── schema.sql     # Full database schema
│   └── seed.sql       # Sample data
└── docs/              # Documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/refresh-token` - Refresh JWT token

### Dashboard
- `GET /api/dashboard` - Dashboard summary
- `GET /api/dashboard/daily-sales` - Today's sales
- `GET /api/dashboard/graph` - Sales graph data

### Inventory
- `GET /api/items` - List products
- `POST /api/items` - Create product
- `PUT /api/items/:id` - Update product
- `DELETE /api/items/:id` - Delete product

### Sales
- `GET /api/sales` - List sales
- `POST /api/sales` - Create sale
- `POST /api/sales/:id/void` - Void transaction

### Reports
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/inventory` - Inventory report
- `GET /api/reports/receiving` - Receiving report

## Features

- ✅ Multi-role authentication (Admin, Cashier, CSR)
- ✅ Dashboard with analytics and charts
- ✅ POS with barcode scanning
- ✅ Inventory management
- ✅ Item receiving with batch tracking
- ✅ Sales reports and exports
- ✅ User management
- ✅ FEFO (First Expired, First Out) for medicines
- ✅ Audit logging
- ✅ Responsive design

## License

MIT