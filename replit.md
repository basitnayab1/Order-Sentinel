# ProcureTrack

Purchase order management system with admin and client roles, supplier tracking, and in-app notifications.

## Run & Operate

- `pnpm --filter @workspace/procure-app run dev` — frontend (Vite, uses `$PORT`)
- `pnpm --filter @workspace/api-server run dev` — API server (Express, uses `$PORT`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only; run after schema edits)

## Required Secrets

| Secret | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (frontend auth) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (frontend auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (API server JWT verification) |
| `DATABASE_URL` | Replit PostgreSQL connection string (auto-set) |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui (artifacts/procure-app)
- **API**: Express 5 + Drizzle ORM (artifacts/api-server)
- **Auth**: Supabase Auth (JWT) — data stored in Replit PostgreSQL
- **DB ORM**: Drizzle (`lib/db`)
- **API contract**: OpenAPI spec → Orval codegen → typed hooks in `lib/api-client-react`
- **Validation**: Zod v4 + drizzle-zod

## Where Things Live

- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/db/src/schema/` — Drizzle table definitions (profiles, purchase_orders, suppliers, notifications)
- `artifacts/procure-app/src/lib/authContext.tsx` — auth state + `setAuthTokenGetter` wiring
- `artifacts/api-server/src/middlewares/auth.ts` — JWT verification + profile upsert
- `artifacts/api-server/src/routes/` — all API route handlers

## Architecture Decisions

- **Supabase auth only, Replit DB for data**: Supabase issues JWTs; the API verifies them via `supabaseAdmin.auth.getUser(token)`. All application tables (orders, suppliers, notifications) live in Replit's built-in PostgreSQL, not Supabase's DB.
- **`NEXT_PUBLIC_*` env prefix**: Vite is configured with `envPrefix: ['VITE_', 'NEXT_PUBLIC_']` so Supabase secrets entered under `NEXT_PUBLIC_*` names are exposed to the frontend without renaming them.
- **Role stored in Supabase `app_metadata`**: `app_metadata.role = 'admin'` or `'client'`. Set this manually in the Supabase Dashboard for the first admin user.
- **Profile upsert on every request**: The auth middleware upserts a row in the `profiles` table on each authenticated API call, so join queries always have a name/email for every user.
- **Route ordering for notifications**: `PATCH /notifications/read-all` is registered before `PATCH /notifications/:id/read` to avoid Express treating "read-all" as an `:id`.

## Product

**Admin** can:
- Create purchase orders and assign them to clients
- Add multiple suppliers per order with tracking numbers and URLs
- Update order and supplier status (Pending → Processing → Shipped → Delivered)
- Send in-app notifications to specific clients
- View all orders across all clients via the dashboard

**Client** can:
- Log in and view only their own purchase orders
- See supplier tracking links and status for each order
- Receive and read notifications from the admin

## First-Time Setup (Admin User)

1. Create a user in Supabase Dashboard → Authentication → Users
2. Open that user's record and edit `app_metadata` to add: `{ "role": "admin" }`
3. All other users default to `role = "client"` and are scoped to their own orders

## User Preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing `lib/db/src/schema/`, run `pnpm --filter @workspace/db run push` to apply changes.
- After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` to regenerate typed hooks.
- The `SESSION_SECRET` secret is present in the environment but unused (scaffold leftover); safe to ignore.
- Client role is read from `user.app_metadata.role` (set by Supabase admin). New users who log in without this field default to `client`.
