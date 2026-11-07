# Tezi Admin Panel

Internal admin dashboard for the Tezi platform. It manages users, withdrawal requests, market data (sectors, banks, research, logos), published content (blogs, news, banners, notifications) and lets staff check vendor financial data availability for any PSX-listed symbol.

Built on the open-source [TailAdmin Next.js](https://tailadmin.com) template (MIT, see [LICENSE](./LICENSE)).

> **Developer documentation:** see the [Developer's Guide](./DevDocs/DEVELOPERS_GUIDE.md) for architecture, conventions, and step-by-step recipes.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend / auth / storage | Supabase (`@supabase/supabase-js`) |
| External data | IEL PSX API, reached through a Next.js proxy route |
| UI libraries | ApexCharts, FullCalendar, TipTap, Swiper, flatpickr, sonner (toasts) |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` |

## Features

**Dashboard** (`/`): live counts for users, pending withdrawals, banks, sectors, Raast IDs and contact messages, each linking to its page. After sign-in the app redirects to `/Users`.

**Financials Explorer** (`/Financials_Explorer`): pick any PSX symbol (searchable, 24h localStorage-cached list), toggle yearly/quarterly, and view income statement, balance sheet and cash flow statement as returned by the IEL vendor API. "Refresh from Vendor" triggers a fresh vendor pull.

**Users & Requests**: Users, Withdrawal Requests, Raast IDs, Contact messages.

**Market Data**: Sectors, Sectors (IEL), Banks, Stock Logos, Research Report, Symbol Research Report, Research Report (IEL), IEL Info, IEL Timing, Economic Calendar, Financial Statements (PDF uploads grouped by financial year, July to June).

**Content**: Blogs, News, Marketing banner, Notifications (sent through a Supabase Edge Function).

**Communication**: AI Chat history.

Common to the table pages: search, pagination, skeleton loading states, create/edit modals, delete confirmation dialogs, toast feedback, and dark mode. The Financial Statements page is the exception: it has search but shows one collapsible section per financial year instead of pages.

Authentication is Supabase email/password. Every page under `app/(admin)` is guarded in `src/app/(admin)/layout.tsx` and redirects to `/signin` without a session.

## Getting started

**Prerequisites:** Node.js 20 or later and npm.

```bash
npm install          # use --legacy-peer-deps if peer-dependency errors appear
npm run dev          # http://localhost:3000 (runs next dev --webpack)
```

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server (webpack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run cf:build` | Build for Cloudflare (OpenNext) |
| `npm run cf:preview` | Build and preview locally on the Workers runtime |
| `npm run cf:deploy` | Build and deploy to Cloudflare |
| `node --test scripts/test-financial-year.mjs` | Unit tests for the financial-year helpers (Node 22.18+) |

## Project layout

```text
src/
  app/
    (admin)/                 Authenticated pages + auth-guarding layout
      (others-pages)/(tables)/   One folder per data page (Banks, Blogs, Users, ...)
      Financials_Explorer/
      Notification/
    (full-width-pages)/      /signin, /signup, 404
    api/iel/[...path]/       Proxy to the IEL PSX API
  components/
    tables/                  One data table per page (fetch, edit, delete)
    example/                 "Add new" modals per page
    financials/              Financials Explorer components
    ui/ form/ common/ ...    Reusable building blocks
  context/                   Sidebar and theme providers
  hooks/                     useTableSearch, useModal, useGoBack
  layout/                    AppSidebar, AppHeader, Backdrop
  lib/                       IEL API client and config, financial-year helpers
scripts/                     Unit tests
SupabaseConfig.jsx           Shared Supabase client (repo root)
DevDocs/                     Developer documentation
```

## Configuration

`SupabaseConfig.jsx` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. When they are not set it falls back to the live project, so production builds need no extra setup. To work against another project, such as a local Supabase stack, put the two variables in `.env.local` (git-ignored). The IEL API base URL is still hard-coded in `src/lib/ielApiConfig.ts`. See the Developer's Guide, section "Configuration and secrets".

## Deployment

Deployed to Cloudflare Workers with OpenNext (`wrangler.jsonc`, `open-next.config.ts`). Run `npm run cf:deploy`, or let Cloudflare's Git integration run `npm ci` and the build. Keep `package-lock.json` in sync with `package.json`, otherwise `npm ci` fails.

## Keeping this README current

Update this file in the same commit as any change that adds, removes or renames a page, a major feature, a script, or a configuration requirement. Add detailed how-tos to the Developer's Guide instead of here.

## License

MIT, based on TailAdmin. See [LICENSE](./LICENSE).
