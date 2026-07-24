# Task 2-b — Frontend Agent (Products + Warehouse modules)

## What I built

### 1. `src/components/erp/modules/products.tsx` — `ProductsModule`
Default export `ProductsModule` (`'use client'`).

Implements the full Products management module:

- **Mandatory company selector** at the top (because 4 companies have completely separate product
  catalogs — key business rule). Default to first company; reloads products when company changes.
  Local override (`userPickedCompanyId`) is resolved during render so the global store stays in
  sync without triggering React `setState`-in-effect lint warnings.
- **KPIs**: total products, low stock (≤5), out of stock (0), catalog value (Σ stock × tradePrice).
- **Search bar** with 350ms debounce (by name / code) and **Category filter** dropdown populated
  from `useCategories(companyId)` with product counts.
- **Add Category** dialog — name + optional code (auto-generated from name when blank), bound to
  the currently selected company.
- **Add Product / Edit Product** dialog with all required fields:
  `code` (uppercase mono), `name`, `description`, `packSize`, `unit` (CTN/DOZ/PCS/BOX),
  `piecesPerPack`, `categoryId`, `tradePrice`, `retailerPrice`, `costPrice`, `taxRate` (default 17),
  and `openingStock` (only on create — creates an opening-stock batch in the company's warehouse
  section via `POST /api/products`).
- **Product table**: code, name (+packSize), unit badge, trade price (formatted via `formatCurrency`),
  tax rate %, available stock with color tone (green >10, amber 1–10, red 0), category, status
  badge, and an Edit button per row.
- Empty state for "no company selected" and "no products found".
- Loading skeletons while products load.
- Emerald color scheme throughout; responsive (hidden columns on smaller screens).
- Toast notifications on create/edit/category success and error.

### 2. `src/components/erp/modules/warehouse.tsx` — `WarehouseModule`
Default export `WarehouseModule` (`'use client'`).

Implements warehouse + stock management:

- **Warehouse info card** showing warehouse name + address (with map pin icon), section count
  and total units badges.
- **KPIs**: total stock value, total units, low-stock items (≤5), out-of-stock items.
- **Tabs per company section** (single warehouse → 4 company-wise sections). Each tab shows
  section code, name, company code/name, SKU count, total units, total stock value (formatted),
  low-stock count badge, and "expiring soon" badge.
- Active tab is resolved during render (no `setState`-in-effect) so it auto-selects the first
  section on load and gracefully falls back if a section disappears.
- **Stock table per section**: product code/name, unit badge, batch number, expiry date with
  colored warning (rose if ≤30 days or expired, amber if ≤90 days), quantity with stock tone
  (red=0, amber ≤5, green OK), stock value (qty × tradePrice), and an Adjust button.
- **Adjust Stock dialog**: shows current product info (code, name, unit, trade price, current
  quantity, batch). Movement type selector (IN / OUT / ADJUST / RETURN) with helper text
  explaining the delta semantics. Quantity input (absolute value for IN/OUT/RETURN, signed for
  ADJUST). Optional notes. The dialog computes the **delta** that gets sent to `POST /api/stock`
  (`+qty` for IN/ADJUST-positive, `-qty` for OUT/RETURN/ADJUST-negative) and validates the
  resulting balance won't go negative.
- Empty state when warehouse has no sections.
- Loading skeletons.
- Emerald color scheme, fully responsive.

## Hooks / utilities used
- `useProducts`, `useCategories`, `useCompanies`, `useCreateProduct`, `useUpdateProduct`,
  `useCreateCategory`, `useWarehouse`, `useAdjustStock` (from `@/lib/api-hooks`).
- `PageHeader`, `StatCard`, `StatusBadge`, `EmptyState` (from `@/components/erp/ui-helpers`).
- `formatCurrency` (from `@/lib/erp-types`).
- `useToast` (from `@/hooks/use-toast`).
- `useAppStore` (from `@/lib/store`) — keeps the sidebar/topbar company selector in sync when
  the user changes company from inside the Products module.
- shadcn/ui: Button, Input, Label, Textarea, Skeleton, Badge, Dialog, Select, Table, Tabs, Card.

## Lint status
- `bun run lint` reports **zero errors** in `products.tsx` and `warehouse.tsx`.
- Remaining 3 lint errors are in `order-entry.tsx` (owned by a different agent) — not touched.

## Files created
- `/home/z/my-project/src/components/erp/modules/products.tsx`
- `/home/z/my-project/src/components/erp/modules/warehouse.tsx`

## Stage summary
Two of the listed TODO modules are now complete and lint-clean. They are ready to be wired into
`src/app/page.tsx`'s module switch (`activeModule === 'products'` → `<ProductsModule />`,
`activeModule === 'warehouse'` → `<WarehouseModule />`) by the integration agent.
