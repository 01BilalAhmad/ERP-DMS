# Task 2-a — Frontend Module Builder (Companies, Shops, Bookers)

## Agent
Agent: frontend-modules-2a

## Context Reference
- Read `/home/z/my-project/worklog.md` for project overview, API routes, schema, design standards.
- Did NOT create new API routes, did NOT modify schema/auth.
- Built only React components as specified.

## Files Created
1. `src/components/erp/modules/companies.tsx` — `CompaniesModule`
2. `src/components/erp/modules/shops.tsx` — `ShopsModule`
3. `src/components/erp/modules/bookers.tsx` — `BookersModule`

## What Was Built

### 1. Companies Module (`companies.tsx`)
- **List**: shadcn Table with columns: Code/Name (avatar), NTN, Tax Type badge, Sales Tax %, WHT Filer %, WHT Non-Filer %, Further Tax %, Currency, Status, Actions.
- **Search**: Filter by name, code, or NTN.
- **Stats**: 4 StatCards — Total Companies, Filers, Non-Filers, Active.
- **Add/Edit Dialog** (`sm:max-w-2xl`): code, name, address, phone, ntn, strn, taxType select (FILER/NON_FILER), salesTaxRate (17), filerTaxRate (4.5), nonFilerTaxRate (8), furtherTaxRate (3), defaultCurrency select (PKR/USD/EUR/AED), status select (only on edit).
- **Tax config** displayed prominently in an emerald-tinted box with explanatory hint.
- **Toast feedback** for create/update errors and success.
- Loads `useCompanies`, `useCreateCompany`, `useUpdateCompany` from `@/lib/api-hooks`.
- **Color**: emerald primary throughout (NO blue/indigo).
- **Mobile responsive**: table has `overflow-x-auto` wrapper.
- **Empty state** when no companies, loading skeletons while fetching.

### 2. Shops Module (`shops.tsx`)
- **Filters**: debounced search (300ms) by name/code/owner/phone; Select for Company, Class (A/B/C), Status (ACTIVE/INACTIVE/BLACKLISTED).
- **Stats**: 4 StatCards — Total Shops, Active, Near Credit Limit (>80%), Blacklisted.
- **Mobile view**: `MobileShopCard` component renders card per shop (visible only on small screens).
- **Desktop view**: shadcn Table with expandable rows (ChevronRight/Down toggle). Columns: code/name, owner, phone, class badge, tax type badge, companies (small badges with outstanding warning), status, edit action.
- **Expandable detail**: per-company Card grid showing Outstanding vs Credit Limit, Progress bar (emerald < 80%, amber 80-100%, rose > 100%), orders count.
- **Add/Edit Dialog** (`sm:max-w-2xl`): name, ownerName, phone, address, GPS lat/lng, shopClass select, taxType select, ntn, strn, visitDay select (MON-SUN), status select, plus a **multi-company selector with per-company credit limit inputs**.
  - Shop MUST be linked to ≥1 company — submit disabled if none selected.
  - Credit limit input shown only when company is checked.
  - Hint explains: 0 = unlimited; warnings trigger above 80%.
- **Warning color logic**: red badge on company chips when outstanding > 80% of credit limit; Progress bar color reflects status.
- Uses `EmptyState` from `@/components/erp/ui-helpers` when no shops.
- Loads `useShops`, `useCompanies`, `useCreateShop`, `useUpdateShop`.
- Uses `Fragment` with key for expandable rows (valid React key handling).

### 3. Bookers Module (`bookers.tsx`)
- **Grid layout**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` of `BookerCard`.
- **BookerCard**: avatar with initials (gradient emerald), name, employeeCode, email/phone, status badge, company count badge, company coverage chips (color-coded per index: emerald/sky/violet/amber), orders count, shop assignments count.
- **Search**: filter by name, employee code, email, phone.
- **Stats**: 4 StatCards — Bookers, Active, Total Orders, Shop Assignments.
- **Add/Edit Dialog** (`sm:max-w-xl`): name, employeeCode (auto-suggested OB-XXX), email, phone, password (required on create, optional on edit), status (only on edit), and a **company multi-select** with color-coded icon per company.
  - At least 1 company required.
  - Helpful hint when only 1 company selected ("Typical setup: 1 booker covers 2 companies").
- Loads `useBookers`, `useCompanies`, `useCreateBooker`, `useUpdateBooker`.
- Emerald primary throughout.
- Static `COLOR_CLS` lookup map to avoid dynamic Tailwind class names (JIT-safe).

## Lint Status
- All three files pass ESLint cleanly (`npx eslint <three files>` → no output).
- The remaining lint errors in `src/components/erp/modules/order-entry.tsx` are owned by a different parallel agent and were NOT touched.

## Design Compliance
- Emerald/teal primary throughout (no indigo, no blue).
- shadcn/ui components used: Card, Button, Input, Label, Badge, Skeleton, Progress, Table, Dialog, Select, Checkbox.
- Mobile responsive (cards on mobile, tables on desktop for Shops).
- Loading skeletons during fetch.
- Empty states via shared `EmptyState` helper.
- Toast notifications via `useToast` from `@/hooks/use-toast`.
- Custom type definitions matching the API responses (Company, Shop, Booker, ShopCompanyLink, BookerCompanyMap).
- React Compiler-friendly: avoided manual `useMemo` with mutable dependencies (used IIFE pattern instead).

## Stage Summary
- All 3 frontend module components built, lint-clean, and ready to be wired into `src/app/page.tsx` switch by a future task.
- Hooks used: `useCompanies`, `useShops`, `useBookers`, `useCreateCompany`, `useUpdateCompany`, `useCreateShop`, `useUpdateShop`, `useCreateBooker`, `useUpdateBooker`.
- No new API routes, no schema/auth changes.
- Next step: integrate `CompaniesModule`, `ShopsModule`, `BookersModule` into the AppShell module switch in `page.tsx`.
