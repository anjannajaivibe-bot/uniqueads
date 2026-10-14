# Unique Ads Operational Admin

Phase 1 starter for Unique Ads, built with Next.js, Neon Postgres and Neon Managed Better Auth.

## Included now

- Secure Neon Auth integration with email/password and Google sign-in support
- Operational admin shell using Unique Ads navy/orange branding
- Dashboard connected to Neon tables
- Leads list and working New Lead form
- Customers, quotations, orders, work-progress, workers and finance read views
- Phase 1 schema source under `database/001_initial_schema.sql`
- Responsive desktop/mobile layout

## Neon project already configured

- Project: `Unique Ads`
- Project ID: `small-grass-57789177`
- Production branch: `br-bitter-dust-b549y707`
- Database: `neondb`
- Neon Auth base URL is prefilled in `.env.example`

## Local setup on Windows

Use your folder:

```powershell
cd D:\JaiVibe-Migration\uniqueads
npm install
Copy-Item .env.example .env.local
```

Then edit `.env.local` and provide:

1. `DATABASE_URL` from Neon Connect
2. `NEON_AUTH_COOKIE_SECRET`, at least 32 random characters

Generate a safe cookie secret in PowerShell:

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Run:

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Security

Do not commit `.env.local`. It is ignored by Git.

The admin is protected through Neon Auth middleware. The database is accessed only from server components/actions through `DATABASE_URL`.

## Next build sequence

1. Apply tested Phase 1 schema to production Neon branch.
2. Create the first Super Admin user.
3. Add customer creation and lead follow-up actions.
4. Build quotation editor and PDF output.
5. Convert accepted quotation to order.
6. Add order locations and worker assignment workflows.
7. Add before/during/completed photo proof using object storage.
8. Add customer receipts, expenses, worker ledger and invoices.
9. Add reports and exports.
