# SHARELY × Supabase setup

Use this checklist after creating a Supabase project.

## 1. Run the database schema

1. Open your project → **SQL Editor** → **New query**
2. Paste the contents of [`schema.sql`](./schema.sql)
3. Click **Run**

You should see a `listings` table under **Table Editor**.

## 1b. Run the rentals schema

1. Open **SQL Editor** → **New query**
2. Paste the contents of [`rentals.sql`](./rentals.sql)
3. Click **Run**

You should see a `rentals` table — this syncs bookings so owners and renters see the same rental on any device.

## 1c. Run the handover migration (if delivery confirm fails)

If owners see **Could not update rental on server** when confirming delivery:

1. Open **SQL Editor** → **New query**
2. Paste the contents of [`rentals-migration-handover.sql`](./rentals-migration-handover.sql)
3. Click **Run**

## 1d. Remove demo listings (if drills/tents still appear)

Demo items may still live **in your database** even after a code deploy.

1. Open **SQL Editor** → **New query**
2. Paste [`cleanup-demo-listings.sql`](./cleanup-demo-listings.sql)
3. Click **Run**

Then hard-refresh the site (Ctrl+Shift+R). In Vercel, confirm the latest deploy is from commit `db5f26a` or newer.

## 1e. Fix hide / delist (items still on Explore after hiding)

1. Open **SQL Editor** → paste [`listings-hidden-column.sql`](./listings-hidden-column.sql) → **Run**
2. Re-hide the item on **Profile → My listed items**

To mark already-hidden items in the database:

```sql
update public.listings set hidden_by_owner = true where available = false;
```

## 2. Copy API credentials

**Project Settings → API**

| Copy this | Into `.env.local` |
|-----------|-------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

Never commit `SUPABASE_SERVICE_ROLE_KEY` or push it to GitHub.

## 3. Local `.env.local` example

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

NEXT_PUBLIC_ESCROW_ADDRESS=0xYourDeployedEscrowAddress
```

Restart the dev server after saving.

## 4. Deploy to production (Vercel recommended)

1. Push code to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add the **same env vars** in Vercel → Settings → Environment Variables
4. Deploy — testers use your `https://your-app.vercel.app` URL

Listings will sync for all users once Supabase env vars are set on the host.

## 5. Listing photo uploads (recommended)

1. Open **SQL Editor** → paste [`listing-images-storage.sql`](./listing-images-storage.sql) → **Run**
2. Confirm **Storage** shows a public bucket named `listing-images`

On **Rent out**, owners can **Choose photo** or **Take photo** — images upload to Supabase and appear reliably on Explore.

The link paste option remains as a fallback but uploads are preferred.

## 6. Verify it works

1. `npm run dev`
2. List an item on device A
3. Open Browse on device B (same deployed URL) — listing should appear

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Listings only on one phone | Supabase env vars missing on server |
| `Supabase not configured` | Add `SUPABASE_SERVICE_ROLE_KEY` to hosting env |
| RLS errors | Re-run `schema.sql` policies |
| 500 on POST | Check Vercel function logs / Supabase logs |
| Photo upload fails | Run `listing-images-storage.sql`; confirm `SUPABASE_SERVICE_ROLE_KEY` on server |
