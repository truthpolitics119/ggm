# GGM Retailer Manager

Mobile-first Next.js App Router application for retailer follow-up, status tracking, CSV updates, and the original Leaflet/Esri retailer map.

## Requirements

- Node.js 20.9 or newer
- A Supabase project
- Vercel account for deployment

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never use a `NEXT_PUBLIC_` prefix)
3. Apply all SQL files in `supabase/migrations/` in filename order in the Supabase SQL editor, or run the Supabase CLI command below:

   ```sh
   supabase db push
   ```

4. Start the app with `npm run dev`.

In Supabase Authentication settings, disable public user sign-ups. The app has no registration route; administrators create accounts through the server-side admin API.

## First administrator

Create the first account in Supabase Authentication (email/password). The database trigger creates its `profiles` row with the `user` role. In the Supabase SQL editor, promote that account:

```sql
update public.profiles
set role = 'admin', full_name = 'GGM Administrator', is_active = true
where id = (select id from auth.users where email = 'admin@example.com');
```

Users cannot self-register through this application. An administrator can create accounts on **Admin → Users**; the service-role key is only read by server-side route handlers.

## Seed the supplied DATA.csv

After applying the migration and setting the environment variables, run:

```sh
npm run seed -- DATA.csv
```

The script supports the supplied header names and upserts on `CUSTOMER ID`. It parses balances and coordinates as numeric fields but passes `MOBILE` through as a string without converting it to a number. CSV values already represented in scientific notation remain those literal strings. The seed never removes manual status overrides or interaction history.

Administrators can also upload a CSV from **Admin → Import**. The supported columns include `CUSTOMER ID`, `CUSTOMER NAME`/`name`, `USERNAME`, `STREET NAME`, `HOUSE NUMBER`, `POSTAL CODE`, `CITY`, `MOBILE`, `BALANCE`, `latitude`, and `longitude`. Customer ID and balance are required; include a name for new retailers. A balance-only file updates existing customer IDs and preserves omitted retailer fields. The import validates the whole file before its transaction and returns insert/update totals.

## Access and data protection

- Authenticated access is protected by middleware and the active profile check.
- `profiles`, `retailers`, `retailer_interactions`, and `retailer_visits` have RLS enabled.
- Active signed-in users can read retailers and their interaction history and create their own interactions.
- Retailer visit plans are stored in `retailer_visits`; active users can schedule visits, and the creator or an administrator can complete or cancel them. Completing a visit also appends a visit to the retailer interaction history.
- Administrators can assign retailers to active team members from the retailer profile.
- Status changes use the `change_retailer_status` database function, which updates the manual override and appends a status-history interaction atomically.
- Interaction logging uses `log_retailer_interaction`; visit metadata and the interaction history are written together, and `visited_at` is kept separate from active/inactive status.
- The retailer import database function only grants execution to `service_role`; the API additionally verifies the caller's active admin profile.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code or Vercel client environment variables.

## Production build and Vercel

```sh
npm run build
```

Import the repository into Vercel, set all three environment variables for the deployment environment, and deploy. Apply Supabase migrations before routing traffic to the new deployment. Ensure Supabase Auth's allowed redirect URLs include the production origin and `${origin}/auth/update-password`.

## Install on a device

The app includes a web app manifest and platform icons. After deploying it to an HTTPS origin, install it from the browser:

- **Desktop Chrome or Edge:** use the install icon in the address bar or choose **Install app** from the browser menu.
- **Android:** open the app in Chrome and choose **Install app** or **Add to Home screen** from the browser menu.
- **iPhone or iPad:** open the app in Safari, tap **Share**, then **Add to Home Screen**.

The installed app opens in a standalone window and still requires an internet connection and a valid sign-in.

## Main routes

- `/login` — email/password sign-in and password reset
- `/dashboard` — network KPIs, city activity chart, recent interactions, and follow-up list
- `/map` — shared-shell retailer map with Esri Dark, Satellite, and Streets basemaps, clustering, filters, city summary, and detail links
- `/retailers` and `/retailers/[id]` — search/filter/paginate, retailer profile, visit scheduling and tracking, interaction history, status controls, and admin assignment
- `/admin/users` — admin-only user creation, role changes, deactivation, and password reset
- `/admin/import` — admin-only CSV data upsert
