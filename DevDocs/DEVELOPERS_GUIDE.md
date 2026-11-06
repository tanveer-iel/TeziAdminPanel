# Tezi Admin Panel: Developer's Guide

Audience: engineers working on this codebase. For a feature overview and quick start, see the [README](../README.md).

Contents

1. [Architecture overview](#1-architecture-overview)
2. [Local setup](#2-local-setup)
3. [Project structure](#3-project-structure)
4. [Authentication and routing](#4-authentication-and-routing)
5. [Data layer: Supabase](#5-data-layer-supabase)
6. [IEL PSX API and the proxy route](#6-iel-psx-api-and-the-proxy-route)
7. [The standard CRUD page pattern](#7-the-standard-crud-page-pattern)
8. [Shared UI building blocks](#8-shared-ui-building-blocks)
9. [Financials Explorer](#9-financials-explorer)
10. [Styling and theming](#10-styling-and-theming)
11. [Configuration and secrets](#11-configuration-and-secrets)
12. [Build, deploy and Cloudflare](#12-build-deploy-and-cloudflare)
13. [Conventions and gotchas](#13-conventions-and-gotchas)
14. [Recipes](#14-recipes)
15. [Known issues and technical debt](#15-known-issues-and-technical-debt)
16. [Maintaining the docs](#16-maintaining-the-docs)

---

## 1. Architecture overview

```text
Browser (Next.js client components)
   |-- supabase-js ----------------> Supabase (Auth, Postgres tables, Storage "Images", Edge Function)
   |-- fetch /api/iel/* -----------> Next.js route handler --> IEL PSX API (ielapis.u2ventures.io)
```

- **Almost everything is client-side.** Pages and tables are `"use client"` components that call Supabase directly from the browser with the anon key. There is no server-side data layer except the IEL proxy route.
- **Authorization therefore lives in Supabase**, in Row Level Security policies and the signed-in user's session, not in this repo. If a table is readable or writable from this app, it is because a policy allows it.
- **Hosting** is Cloudflare Workers via OpenNext, so server code (the proxy route) runs on the Workers runtime with `nodejs_compat`.

Stack: Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4, Supabase JS v2, sonner for toasts. The code is a mix of `.tsx` (components, hooks, lib) and `.jsx` (most page files and `SupabaseConfig.jsx`).

## 2. Local setup

Requirements: Node.js 20+, npm.

```bash
npm install                 # add --legacy-peer-deps if peer-dependency errors appear
npm run dev                 # next dev --webpack -> http://localhost:3000
npm run lint
```

`dev` deliberately uses `--webpack`. SVGs are imported as React components through `@svgr/webpack`, configured for both webpack and Turbopack in `next.config.ts`. Type declarations are in `src/svg.d.ts`.

You need a Supabase user account to get past `/signin`. Ask the project owner to create one; self sign-up is not part of the normal flow.

## 3. Project structure

```text
src/app/
  layout.tsx                         Root: Outfit font, ThemeProvider, SidebarProvider, <Toaster/>
  (admin)/layout.tsx                 Auth guard + sidebar/header shell for all admin pages
  (admin)/page.tsx                   Dashboard (StatsOverview)
  (admin)/Financials_Explorer/       Financials Explorer page
  (admin)/Notification/              Notifications page
  (admin)/(others-pages)/(tables)/   Data pages, one folder each (see list below)
  (admin)/(others-pages)/(chart|forms)/, (ui-elements)/, calendar, blank, profile
                                     Leftover TailAdmin template demos (not in the sidebar)
  (full-width-pages)/(auth)/         /signin and /signup
  (full-width-pages)/(error-pages)/  /error-404 ; src/app/not-found.tsx is the global 404
  api/iel/[...path]/route.ts         IEL proxy (GET, POST)

src/components/
  tables/     <Thing>Table.tsx   list + edit + delete for one entity
  example/    <Thing>Modal.tsx   "add new" modal for one entity (named "example" for historical reasons)
  financials/ FinancialsExplorer, StatementCard, StockSearchSelect
  dashboard/  StatsOverview
  ui/         Button, IconButton, Modal, ConfirmDialog, Skeleton, Table primitives, Badge, Alert, ...
  form/       Label, InputField, TextArea, Select, MultiSelect, date-picker, ...
  common/     PageBreadCrumb, ThemeToggleButton, ComponentCard, ...
  auth/       SignInForm, SignUpForm
  header/     UserDropdown (sign out), NotificationDropdown

src/context/  SidebarContext, ThemeContext
src/hooks/    useTableSearch, useModal, useGoBack
src/layout/   AppSidebar (navigation config), AppHeader, Backdrop, SidebarWidget
src/lib/      ielApi.ts (typed client), ielApiConfig.ts (base URL)
src/icons/    SVG icons + index.tsx re-exports
SupabaseConfig.jsx   (repo root) shared Supabase client
```

### Data pages and their Supabase tables

| Route | Table component | Supabase table(s) |
| --- | --- | --- |
| `/Users` | `BasicTableOne` | `profiles` |
| `/Withdrawal_Requests` | `WithdrawalRequestsTable` | `widrawrequest` (sic) |
| `/RaastIds` | `RaastIdTable` | `raastids` |
| `/Contact` | `ContactTable` | `contact` |
| `/Sectors` | `SectorsTable` | `sector` |
| `/Sectors_iel` | `IELSectorTable` | `sector_iel` |
| `/Banks` | `BanksTable` | `bank_list` |
| `/StockLogos` | `StockLogosTable` | `stocklogos`, Storage `Images` |
| `/Reseach_Report` | `ResearchReportTable` | `research`, Storage `Images` |
| `/Symbol_Reseach_Report` | `SymbolResearchReportTable` | `symbol_research`, Storage `Images` |
| `/Reseach_Report_iel` | `IELResearchReportTable` | `research_iel`, Storage `Images` |
| `/IelInfo` | `IELInfoTable` | `iel_info` |
| `/IelTiming` | `IELTimingTable` | `iel_timing` |
| `/economic_calender` | `EconomicsTable` | `economic_calender` |
| `/Finanicial_sttaements` | `FinancialsStatementTable` | `finanicial_statements`, Storage `Images` |
| `/Blogs` | `BlogsTable` | `blogs`, Storage `Images` |
| `/News` | `NewsTable` | `news`, Storage `Images` |
| `/banner` | `BannerTable` | `marketing_banner` |
| `/Notification` | `NotificationTable` | `notifications` |
| `/chat_history` | `ChatTable` | `chat_history` |

Other tables referenced in code: `ClientCode` (used by `BasicTableOne` and `RaastIdModal`). The misspellings ("Reseach", "Finanicial", "sttaements", "calender", "widrawrequest") exist in real route paths and database names. **Do not "fix" them in one place**: renaming a route changes URLs and sidebar links, and renaming a table or column requires a database migration. Match the existing spelling.

## 4. Authentication and routing

- Auth is Supabase email/password (`supabase.auth.signInWithPassword` in `SignInForm.tsx`; sign out in `UserDropdown.tsx`).
- `src/app/(admin)/layout.tsx` is the single guard. On every navigation it calls `supabase.auth.getSession()`; without a session it does `router.replace("/signin")`. It also subscribes to `onAuthStateChange` to bounce on sign-out. While checking, it shows a spinner (minimum 2 seconds via `setTimeout`).
- Landing on `/` with a session redirects to `/Users`. The dashboard at `/` is therefore reachable only if that redirect is changed.
- **Route groups** (`(admin)`, `(others-pages)`, `(tables)`, ...) do not appear in URLs. `(tables)/Banks/page.jsx` is served at `/Banks`.
- The guard is client-side only. It prevents rendering of the UI, not access to data. Real protection is Supabase RLS (see section 5).

## 5. Data layer: Supabase

The client is created once in `SupabaseConfig.jsx` at the repo root and imported by relative path:

```ts
import supabase from "../../../SupabaseConfig";   // depth varies; there is no @/ alias for it
```

Typical operations:

```ts
const { data, error } = await supabase.from("bank_list").select("id, name, created_at").order("created_at", { ascending: false });
await supabase.from("bank_list").insert([{ name }]);
await supabase.from("bank_list").update({ name }).eq("id", id);
await supabase.from("bank_list").delete().eq("id", id);
const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
```

Always check `error`, surface failures with `toast.error(...)`, and `console.error` the details.

**Storage.** File uploads (research PDFs, blog and news images, logos, financial statement PDFs) go to the `Images` bucket via `supabase.storage.from("Images")`. Follow the existing upload code in the relevant `*Modal.tsx` for path naming and public URL retrieval.

**Edge Function.** Notifications are sent by POSTing to the Supabase Edge Function `swift-responder` (`FormInModal.tsx`, `FormModal.tsx`). A commented-out `Authorization: Bearer ${process.env.NEXT_PUBLIC_EDGE_SECRET}` header shows a planned but unused secret.

## 6. IEL PSX API and the proxy route

The IEL PSX API (`https://ielapis.u2ventures.io`, set in `src/lib/ielApiConfig.ts`) supplies stock lists and company financials. Browsers never call it directly. They call the same-origin proxy, which avoids CORS and keeps the upstream address in one place.

`src/app/api/iel/[...path]/route.ts`:

| Browser request | Upstream request |
| --- | --- |
| `GET /api/iel/search/all-stocks` | `GET {base}/api/psxApi/search/all-stocks/` |
| `GET /api/iel/financials/income?symbol=X&period_type=yearly` | `GET {base}/api/psxApi/financials/income/?symbol=X&period_type=yearly` |
| `POST /api/iel/financials/dump` | `POST {base}/api/psxApi/financials/dump/` |
| `POST /api/iel/financials/cashflow/fetch` | `POST {base}/api/psxApi/financials/cashflow/fetch/` |

Details worth knowing:

- A trailing slash is appended to the upstream path; the query string is forwarded on GET only.
- Upstream status codes and bodies pass through unchanged. A network failure returns `502 { error: "Could not reach the IEL PSX API." }`.
- The proxy is a generic pass-through for any `/api/psxApi/*` path and is **unauthenticated**. It does not check the Supabase session. See section 15.

Use the typed client in `src/lib/ielApi.ts` (`fetchAllStocks`, `fetchStatement`, `triggerFinancialsDump`, `triggerCashflowFetch`) rather than calling `fetch` yourself. `getJson` uses `cache: "no-store"`, and `postJson` turns upstream `{ error }` bodies into thrown `Error`s.

`cleanStatementPeriods()` filters vendor quirks: the income and balance datasets contain duplicate records per period, where one has `period` as a plain string with populated `line_items` and a mirror has `period` as an object with empty `line_items`. Only the former are kept.

## 7. The standard CRUD page pattern

Most data pages follow one template. Read `Banks` first; it is the simplest.

```text
(tables)/Banks/page.jsx          Page: title + <BankModal setValue={setRefresh}/> + <BanksTable value={refresh} setValue={setRefresh}/>
components/example/BanksModal.tsx  "Add" button + modal form -> insert, then setValue(true)
components/tables/BanksTable.tsx   fetch on mount and whenever `value` changes; search, pagination, edit modal, delete confirm
```

Mechanics:

1. **Refresh signal.** The page owns `const [refresh, setRefresh] = useState(false)` and passes it to both the add modal and the table. The table's `useEffect` depends on `value`, so flipping it re-fetches. Note the add modal calls `setValue(true)` while the table's edit handler calls `setValue(!value)`. Because a toggle is only seen when the value changes, `setValue(true)` after a prior `true` does nothing. If you notice an add that does not refresh the list, this is why; prefer toggling (`setValue((v) => !v)`) in new code.
2. **Table states.** `loading` renders `TableSkeleton`, `error` renders a red message, empty renders "No ... found", otherwise the table. Keep this order.
3. **Search and pagination.** Use `useTableSearch(items, matcher, pageSize)`. It returns `search, setSearch, page, setPage, totalPages, paginated, filteredCount`, resets to page 1 on search, and clamps the page. Pass a **stable** matcher if you can; an inline arrow works but recomputes the filter every render.
4. **Edit.** Open `Modal` with the selected row copied into local state, then `update(...).eq("id", ...)`, toast, close, trigger refresh.
5. **Delete.** Always go through `ConfirmDialog` (set a `deleteTarget`, confirm calls delete), then remove the row from local state optimistically on success.
6. **Feedback.** `toast.success` / `toast.error` from `sonner` (the `<Toaster/>` is mounted in the root layout).

Some pages deviate: `Users` is `.tsx`, `Contact` and `chat_history` are read-oriented, and `Notification` uses `FormInModal` plus an edge function instead of a direct insert.

## 8. Shared UI building blocks

| Component | Path | Notes |
| --- | --- | --- |
| `Button` | `ui/button/Button.tsx` | `size: sm \| md`, `variant: primary \| outline`, `startIcon`, `endIcon`. It has no `type` prop, and the click handler takes no arguments. |
| `IconButton` | `ui/button/IconButton.tsx` | Table action buttons; `variant="danger"`. Icons in `ui/button/icons.tsx`. |
| `Modal` | `ui/modal/index.tsx` | `isOpen`, `onClose`, `className` (set width, e.g. `max-w-[440px] p-5`), `showCloseButton`. |
| `ConfirmDialog` | `ui/modal/ConfirmDialog.tsx` | `title`, `description`, `loading`, `variant: danger \| default`, `onConfirm`, `onCancel`. |
| `Table*` | `ui/table/index.tsx` | `Table, TableHeader, TableBody, TableRow, TableCell (isHeader)`. |
| `TableSearchBar`, `TableFooter` | `ui/table/` | Search box; "showing X of Y" plus pager. |
| `Skeleton`, `TableSkeleton` | `ui/skeleton/Skeleton.tsx` | Loading placeholders. |
| `Label`, `InputField`, `TextArea`, `Select`, ... | `form/` | Form inputs matching the theme. |
| `useModal` | `hooks/useModal.ts` | `{ isOpen, openModal, closeModal, toggleModal }`. |

Copy the Tailwind class strings (rounded-lg cards, `text-[13px]` body, `text-[11px] uppercase` table headers) from an existing table so new pages look consistent.

Navigation is configured in one place: the `topLevelItems` and `navGroups` arrays in `src/layout/AppSidebar.tsx`.

## 9. Financials Explorer

Route `/Financials_Explorer`; components in `src/components/financials/`.

- `FinancialsExplorer.tsx` owns state: stock list, selected `symbol`, `periodType` (`yearly | quarterly`), and three `StatementState`s (income, balance, cashflow).
- The stock list is cached in `localStorage` under `iel_all_stocks_cache_v1` for 24 hours. Bump the key suffix if the cached shape changes.
- `loadStatements(symbol, period)` fetches all three statements with `Promise.allSettled`, so one failing statement does not blank the others. Each result is passed through `cleanStatementPeriods`.
- "Refresh from Vendor" asks for confirmation, then calls `triggerFinancialsDump` and `triggerCashflowFetch` in parallel and reloads the statements.
- `StatementCard` renders one statement; `StockSearchSelect` is the searchable symbol picker.

## 10. Styling and theming

- Tailwind CSS v4: configuration is CSS-first in `src/app/globals.css` (`@theme` block defines the font, breakpoints and the `brand`, `gray`, `error`, ... colour scales). There is no `tailwind.config.js`.
- Dark mode is class-based and managed by `ThemeContext` (persisted by the provider); toggled with `ThemeToggleButton`. Every new element needs `dark:` variants.
- Page container width is `max-w-(--breakpoint-2xl)` set in the admin layout. Sidebar offsets (`lg:ml-[236px]` expanded, `lg:ml-[76px]` collapsed) are also in the admin layout.
- Prettier config is in `prettier.config.js`; ESLint uses `eslint-config-next` (core-web-vitals + TypeScript) via `eslint.config.mjs`.

## 11. Configuration and secrets

Currently there is **no environment-variable configuration**:

| Value | Location |
| --- | --- |
| Supabase URL and anon key | `SupabaseConfig.jsx` (hard-coded) |
| Edge function URL | `FormInModal.tsx`, `FormModal.tsx` (hard-coded) |
| IEL API base URL | `src/lib/ielApiConfig.ts` (hard-coded) |

The Supabase **anon** key is designed to be public, so committing it is not itself a leak, but it means all security depends on RLS policies being correct. Never commit a `service_role` key or any other secret. `.gitignore` already ignores `.env*.local`.

Recommended direction: move these to `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `IEL_API_BASE_URL`, read them in the same files, and set them in `.env.local` and in the Cloudflare project settings. If you do, update this section and the README.

## 12. Build, deploy and Cloudflare

```bash
npm run build          # Next.js production build
npm run cf:build       # opennextjs-cloudflare build  -> .open-next/
npm run cf:preview     # build + run on the local Workers runtime
npm run cf:deploy      # build + deploy
```

- Config: `wrangler.jsonc` (worker name `tezi-admin-panel`, entry `.open-next/worker.js`, static assets from `.open-next/assets`, `nodejs_compat`) and `open-next.config.ts`.
- `.open-next` and `.wrangler` are git-ignored and ESLint-ignored.
- Cloudflare builds with `npm ci`, which requires `package-lock.json` to match `package.json` exactly. After changing dependencies, run `npm install` and commit the lockfile. (A past commit fixed exactly this breakage.)
- Always run `npm run lint` and `npm run build` before deploying.

## 13. Conventions and gotchas

- **`"use client"`** is required on anything using hooks, Supabase from the browser, or event handlers. The admin layout and almost all pages are client components.
- **Imports.** `@/` maps to `src/`. Older files use relative paths; `SupabaseConfig` must be imported relatively (it lives outside `src`).
- **Type safety.** Table components define a local `interface` for rows; keep them in sync with the database columns. `.jsx` pages are not type-checked.
- **Naming.** `components/example/` holds real "add" modals, not examples. Misspelled names are intentional compatibility, see section 3.
- **Dates.** Table components format with `Intl.DateTimeFormat("en-GB", ...)`, replacing the space in Postgres timestamps with `T` before parsing.
- **Don't delete** the TailAdmin demo pages or components without checking usage; some shared pieces (`Modal`, `Table`, icons) are used everywhere.
- **Git workflow.** Work on feature branches off `dev`, keep commits focused, and keep the README in step (section 16).

## 14. Recipes

### Add a new CRUD page

Assume a Supabase table `widgets (id, name, created_at)`.

1. Create `src/components/tables/WidgetsTable.tsx` by copying `BanksTable.tsx`; change the interface, table name, columns and labels.
2. Create `src/components/example/WidgetsModal.tsx` by copying `BanksModal.tsx`.
3. Create `src/app/(admin)/(others-pages)/(tables)/Widgets/page.jsx` by copying `Banks/page.jsx`.
4. Add `{ name: "Widgets", icon: <SomeIcon />, path: "/Widgets" }` to the right group in `src/layout/AppSidebar.tsx`.
5. In Supabase, create the table and RLS policies for `select`, `insert`, `update`, `delete` for authenticated staff.
6. Optionally add a count to `statDefs` in `StatsOverview.tsx`.
7. Update the README feature list and the table in section 3.

### Add a dashboard stat

Append to `statDefs` in `src/components/dashboard/StatsOverview.tsx`: `{ label, href, query }`, where `query` returns a count or `null` on failure. `countTable("table")` covers the simple case.

### Add an IEL API endpoint

1. Add the response types and a function to `src/lib/ielApi.ts` using `getJson` or `postJson`. The proxy already forwards any `/api/psxApi/*` path, so no route change is needed.
2. Call it from a component and surface errors with `toast.error`.

### Upload a file to Supabase Storage

Follow `StockLogoModal.tsx` or `BlogsModal.tsx`: upload to the `Images` bucket with a unique path, get the public URL, and store that URL in the table row.

### Change navigation order or labels

Edit `topLevelItems` / `navGroups` in `src/layout/AppSidebar.tsx`.

## 15. Known issues and technical debt

Found during the codebase review; tracked here so they are not rediscovered repeatedly.

1. **Unauthenticated IEL proxy.** `/api/iel/*` forwards to the upstream API without verifying a Supabase session, and also exposes the POST "refresh" endpoints. Anyone who can reach the deployment can trigger vendor pulls. Fix: verify the Supabase access token in the route handler and/or restrict allowed paths to the four used by `ielApi.ts`.
2. **Hard-coded configuration** (section 11).
3. **Client-side only auth guard** (section 4). Confirm RLS is enabled on every table listed in section 3.
4. **Artificial 2-second delay** in the admin layout's `setTimeout` before the UI renders after the auth check; it can likely be removed and `loading` cleared immediately.
5. **Dashboard unreachable after sign-in**: `/` redirects to `/Users`.
6. **Debug logging**: `SignInForm.tsx` does `console.log(data)` on sign-in, which logs the session object. Remove it.
7. **Refresh-signal inconsistency** between add (`setValue(true)`) and edit (`setValue(!value)`), see section 7.
8. **Mixed `.jsx` / `.tsx`** and unused TailAdmin demo code add weight; migrate pages to TSX opportunistically.
9. **Package name** in `package.json` is still `free-nextjs-admin-dashboard` v2.2.3 (template defaults).
10. **No automated tests.** Lint and a manual pass through the affected pages are the current safety net.

## 16. Maintaining the docs

- Update the **README** in the same commit when you add or remove a page, feature, script or required configuration.
- Update this guide when you change architecture, conventions, the proxy, the data model, or fix an item in section 15 (delete it from the list).
- Keep recipes runnable: when a pattern file such as `BanksTable.tsx` changes shape, re-check section 7 and the recipes.
