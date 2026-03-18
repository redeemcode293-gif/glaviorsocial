# SMM DADDY — Social Media Marketing Panel

## Overview

A full-featured social media marketing (SMM) panel built with React, Vite, and Supabase. Users can browse services, place orders for social media growth (followers, likes, views), manage their wallet, track orders, and access an admin panel.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5
- **UI**: Tailwind CSS, shadcn/ui (Radix UI), Lucide icons
- **Routing**: React Router DOM v6
- **State/Data**: TanStack React Query, Supabase JS client
- **Backend/DB**: Supabase (PostgreSQL, Auth, Row Level Security, Realtime, Edge Functions)
- **Edge Functions** (deployed to Supabase): detect-country, translate, sync-provider, process-order, check-order-status, auto-check-orders, create-order

## Architecture

This is a **pure frontend SPA** — there is no Node.js server in this repo. All backend logic lives in Supabase:
- Database queries go directly from the browser via the Supabase JS client (with RLS for security)
- Auth is handled by Supabase Auth
- Serverless logic runs as Supabase Edge Functions (Deno)

## Project Structure

```
src/
  App.tsx              # Root with all routes
  main.tsx             # Entry point
  pages/               # Full page components (Dashboard, Orders, Auth, Admin, etc.)
  components/
    ui/                # shadcn/ui primitives
    admin/             # Admin panel tabs
    landing/           # Marketing landing page components
    layout/            # DashboardLayout, sidebar nav
    notifications/
    AIChatbot.tsx      # Floating AI chat widget
  hooks/
    useAuth.tsx        # Auth context + Supabase session management
    useRegionalPricing.ts  # Country-based pricing multipliers
  contexts/
    LocalizationContext.tsx  # Language + currency formatting
  integrations/
    supabase/
      client.ts        # Supabase client (with dev proxy for Edge Functions)
      types.ts         # Auto-generated DB types
supabase/
  config.toml          # Edge Function JWT settings
  functions/           # Edge Function source (Deno)
  migrations/          # SQL migrations (applied to Supabase cloud)
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (https://xxx.supabase.co) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public API key |

## Running the App

```bash
npm run dev    # starts Vite on port 5000
npm run build  # production build
```

## Key Features

- **User dashboard**: wallet balance, order history, referral system
- **Service catalog**: browse SMM services by platform (Instagram, YouTube, TikTok, etc.)
- **Order placement**: quantity-based pricing with regional multipliers
- **Admin panel**: manage users, providers, services, transactions, tickets
- **Realtime**: wallet balance updates via Supabase Realtime
- **Localization**: multi-language (via Supabase translate function) + multi-currency display

## Supabase Notes

- The `panel_services` table was added in a migration. If it's missing in the schema cache, go to Supabase Dashboard → Settings → API → "Reload Schema".
- Edge Functions are deployed separately to Supabase — the source lives in `supabase/functions/`.
- The `translate` Edge Function uses `LOVABLE_API_KEY` — this should be replaced with a proper LLM API key (e.g. OpenAI) in Supabase Edge Function secrets.
