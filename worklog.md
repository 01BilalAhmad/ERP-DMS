# Distribution ERP - Worklog

## Project Overview
Multi-company Distribution ERP built with Next.js 16 + Prisma (SQLite) + NextAuth + shadcn/ui.
- 4 Companies (separate product catalogs)
- 1200 Shops (manual entry)
- 9 Order Bookers (each mapped to 2 companies)
- Single warehouse with company-wise sections
- Multi-currency (PKR default)
- Sales Tax + Filer/Non-Filer tax (mandatory, configurable per company)
- Credit system with WARNING only (no block)

## Tech Stack
- Next.js 16 App Router, TypeScript 5
- Prisma ORM (SQLite), NextAuth v4 (credentials, JWT session)
- shadcn/ui (New York), Tailwind CSS 4, Zustand store, TanStack Query
- recharts for charts, lucide-react icons

## Database Schema (prisma/schema.prisma)
- User (role-based: SUPER_ADMIN, COMPANY_MANAGER, ORDER_BOOKER, ACCOUNTS, WAREHOUSE, VIEWER)
- Currency (PKR default, USD, EUR, AED)
- Company (4 companies, tax config: salesTaxRate, filerTaxRate, nonFilerTaxRate, furtherTaxRate)
- Warehouse + WarehouseSection (single warehouse, company-wise sections)
- Shop + ShopCompanyLink (1200 shops, per-company credit limit + outstanding)
- OrderBooker + BookerCompanyMapping + BookerShopAssignment
- Category + Product (per company, separate catalogs)
- Scheme (trade offers: DISCOUNT_PCT, DISCOUNT_AMOUNT, BONUS_QTY)
- Stock + StockMovement
- Order + OrderItem (full tax calculation: subtotal, discounts, salesTax, furtherTax, withholdingTax, grandTotal)
- Invoice (generated on delivery)
- Ledger (per company per shop, DEBIT/CREDIT entries)
- Payment (cash/cheque/transfer/online)

## Seed Data (prisma/seed.ts)
- admin@erp.local / admin123 (SUPER_ADMIN)
- 4 Companies: COMP-A Alpha, COMP-B Beta, COMP-C Gamma, COMP-D Delta
- Main Warehouse + 4 sections (one per company)
- Currencies: PKR, USD, AED, EUR

## API Routes (all under /api/*)
- /api/me - current user
- /api/dashboard - KPIs + charts data
- /api/companies (GET/POST/PUT)
- /api/currencies (GET/POST/PUT)
- /api/shops (GET/POST/PUT) - CRUD with company links + credit limits
- /api/bookers (GET/POST/PUT) - with company mapping
- /api/categories (GET/POST)
- /api/products (GET/POST/PUT) - with opening stock
- /api/warehouse (GET/POST)
- /api/stock (GET/POST) - stock adjustment
- /api/orders (GET/POST) - order creation with full tax calc + warnings
- /api/orders/[id] (GET/PATCH) - detail + status workflow (PENDING->APPROVED->PICKED->DISPATCHED->DELIVERED, on DELIVERED: generate invoice + ledger debit + stock deduction + outstanding update)
- /api/invoices (GET)
- /api/payments (GET/POST) - payment entry + ledger credit + outstanding update
- /api/ledger (GET) - entries + balances
- /api/reports (GET) - bookerProductivity, shopCoverage, aging, topShops, salesSummary

## Frontend Architecture
- Single page at / (AppShell with state-based module navigation via Zustand store)
- src/lib/store.ts - activeModule, activeCompanyId, activeCurrency, sidebarOpen
- src/lib/api-hooks.ts - all TanStack Query hooks + mutations
- src/lib/erp-types.ts - CartItem, OrderTotals, calculateOrderTotals(), formatCurrency()
- src/lib/auth.ts - NextAuth config (credentials provider, JWT, role in token)
- src/lib/password.ts - scrypt hashing
- src/lib/api-helpers.ts - getSessionUser, ok/bad/unauthorized helpers

## Tax Calculation Logic (src/lib/erp-types.ts calculateOrderTotals)
1. subtotal = sum(qty * unitPrice)
2. schemeDiscount = sum(subtotal * discountPct)
3. manualDiscount = min(input, taxable)
4. taxableAmount = subtotal - schemeDiscount - manualDiscount
5. salesTax = taxableAmount * (product taxRate / 100) [proportional]
6. furtherTax = (salesTax * furtherTaxRate/100) ONLY if shop is NON_FILER
7. withholdingTax = (taxableAmount + salesTax + furtherTax) * (filerTaxRate OR nonFilerTaxRate)/100
8. grandTotal = taxableAmount + salesTax + furtherTax + withholdingTax
9. creditLimitExceeded = warning ONLY (order still saved), warnings array stored in DB

## Components Built
- src/components/providers.tsx - SessionProvider + ThemeProvider + QueryClient
- src/components/erp/login-screen.tsx - login form
- src/components/erp/app-shell.tsx - sidebar + topbar + footer (sticky)
- src/components/erp/ui-helpers.tsx - PageHeader, StatCard, StatusBadge, EmptyState
- src/components/erp/modules/dashboard.tsx - KPIs + charts + recent orders

## TODO (remaining modules to build)
- src/components/erp/modules/companies.tsx
- src/components/erp/modules/shops.tsx
- src/components/erp/modules/bookers.tsx
- src/components/erp/modules/products.tsx
- src/components/erp/modules/warehouse.tsx
- src/components/erp/modules/order-entry.tsx (CORE - cart with tax calc, warnings)
- src/components/erp/modules/orders.tsx (list + detail + approval workflow)
- src/components/erp/modules/invoices.tsx
- src/components/erp/modules/accounts.tsx (ledger + aging)
- src/components/erp/modules/payments.tsx
- src/components/erp/modules/reports.tsx
- Wire all modules into src/app/page.tsx switch

## Design Standards
- Emerald/teal primary color (NO indigo/blue)
- Responsive mobile-first
- Sticky footer
- Dark mode support
- shadcn/ui components

---
Task ID: 1
Agent: main
Task: Foundation - schema, auth, API routes, app shell, dashboard, login

Work Log:
- Wrote complete Prisma schema with 18 models covering full ERP
- Pushed schema to SQLite db, generated Prisma client
- Created NextAuth credentials provider with role-based access
- Created seed script (admin user, 4 companies, warehouse+sections, currencies)
- Created all API routes (dashboard, companies, currencies, shops, bookers, products, categories, warehouse, stock, orders, order detail, invoices, payments, ledger, reports)
- Built login screen, app shell (sidebar+topbar+footer), dashboard module
- Created Zustand store, TanStack Query hooks, shared types + tax calc utility
- Lint clean, dev server running on port 3000

Stage Summary:
- Foundation complete and working
- Ready for parallel module development by subagents
- Next: build all CRUD modules + order entry core + wire into page.tsx

---
Task ID: 2-b
Agent: frontend-products-warehouse
Task: Build Products + Warehouse frontend modules (no new API routes, no schema/auth changes)

Work Log:
- Created `src/components/erp/modules/products.tsx` (`ProductsModule`, 'use client'):
  - Mandatory company selector at top (key business rule: 4 companies have separate catalogs).
    Defaults to first company; reloads on change. Local override resolved during render so no
    `setState`-in-effect. Keeps global Zustand `activeCompanyId` in sync.
  - KPI row: total products, low stock (≤5), out of stock (0), catalog value (Σ stock × tradePrice).
  - Debounced search (by name/code) + category filter dropdown from `useCategories(companyId)`.
  - "Add Category" dialog → creates category for the selected company.
  - "Add Product" / "Edit Product" dialog: code, name, description, packSize, unit (CTN/DOZ/PCS/BOX),
    piecesPerPack, categoryId, tradePrice, retailerPrice, costPrice, taxRate (default 17), openingStock
    (create-only; backend creates an OPENING batch in the company's warehouse section).
  - Product table with: code, name+packSize, unit badge, trade price (formatted), tax %, available
    stock badge (green >10 / amber 1–10 / red 0), category, status, Edit button.
  - Empty states + loading skeletons. Emerald theme. Mobile responsive.
- Created `src/components/erp/modules/warehouse.tsx` (`WarehouseModule`, 'use client'):
  - Warehouse info card (name + address + section/unit count badges).
  - KPI row: total stock value, total units, low-stock, out-of-stock.
  - Tabs per company section (single warehouse → 4 company-wise sections). Active tab resolved
    during render so first section auto-selects and falls back gracefully.
  - Section header with code, name, company, SKU count, total units, total value badges, plus
    low-stock and expiring-soon badges.
  - Stock table per section: product code/name, unit, batch no, expiry date with rose warning
    (≤30d or expired) / amber (≤90d), quantity with stock tone, value (qty × tradePrice), Adjust button.
  - Adjust Stock dialog: shows current product snapshot (code, name, unit, trade price, current
    qty, batch). Movement type selector (IN / OUT / ADJUST / RETURN) with helper text. Quantity
    input (absolute for IN/OUT/RETURN, signed for ADJUST). The dialog computes the **delta** sent
    to `POST /api/stock` (+qty for IN/ADJUST-positive, -qty for OUT/RETURN/ADJUST-negative) and
    validates the resulting balance won't go negative.
  - Empty states + loading skeletons. Emerald theme. Mobile responsive.

Hooks/utilities used:
- useProducts, useCategories, useCompanies, useCreateProduct, useUpdateProduct, useCreateCategory,
  useWarehouse, useAdjustStock (from @/lib/api-hooks).
- PageHeader, StatCard, StatusBadge, EmptyState (from @/components/erp/ui-helpers).
- formatCurrency (from @/lib/erp-types), useToast (from @/hooks/use-toast), useAppStore (Zustand).
- shadcn/ui: Button, Input, Label, Textarea, Skeleton, Badge, Dialog, Select, Table, Tabs, Card.

Lint status:
- `bun run lint` reports 0 errors in products.tsx and warehouse.tsx.
- Remaining 3 lint errors are in order-entry.tsx (owned by another agent) — not touched.

Files created:
- /home/z/my-project/src/components/erp/modules/products.tsx
- /home/z/my-project/src/components/erp/modules/warehouse.tsx
- /home/z/my-project/agent-ctx/2-b-frontend-products-warehouse.md

Stage Summary:
- 2 of the listed TODO modules complete and lint-clean.
- Ready to be wired into src/app/page.tsx switch (`activeModule === 'products'` → <ProductsModule />,
  `activeModule === 'warehouse'` → <WarehouseModule />) by the integration agent.

---
Task ID: 2-a
Agent: frontend-modules-2a
Task: Build 3 frontend module components (companies, shops, bookers)

Work Log:
- Read worklog.md, schema.prisma, api-hooks.ts, ui-helpers.tsx, dashboard.tsx, app-shell.tsx, page.tsx, and the 3 relevant API routes (companies, shops, bookers) to learn types and request/response shapes.
- Built `src/components/erp/modules/companies.tsx` — CompaniesModule (list table + Add/Edit dialog with full tax config: taxType, salesTaxRate, filerTaxRate, nonFilerTaxRate, furtherTaxRate, defaultCurrency; 4 stat cards; search; toast feedback).
- Built `src/components/erp/modules/shops.tsx` — ShopsModule (debounced search + company/status/class filters; mobile card view + desktop table with expandable rows showing per-company outstanding vs credit limit Progress bar with amber/rose warning thresholds > 80%/100%; Add/Edit dialog with multi-company selector + per-company credit limit inputs; uses EmptyState).
- Built `src/components/erp/modules/bookers.tsx` — BookersModule (responsive grid of BookerCard with avatar, employeeCode, company coverage chips, order/shop counts; Add/Edit dialog with auto-suggested employee code, password (required create / optional edit), company multi-select with hint when only 1 selected).
- All components: emerald primary color (no blue/indigo), mobile-first responsive, loading skeletons, toast feedback, custom TypeScript types matching API responses.
- React Compiler-friendly: avoided useMemo with mutable dependencies; used Fragment with key for expandable table rows; static COLOR_CLS lookup map to avoid dynamic Tailwind classes.
- Lint: All 3 files pass ESLint cleanly (verified with `npx eslint` on the three files specifically). Remaining lint errors in order-entry.tsx are owned by a different parallel agent.

Stage Summary:
- 3 module components built and lint-clean, ready to be wired into the AppShell module switch in src/app/page.tsx.
- No new API routes, no schema/auth changes, no test code.
- Agent work record saved at /home/z/my-project/agent-ctx/2-a-frontend-modules.md.

---
Task ID: FINAL
Agent: main
Task: Complete ERP build + end-to-end verification + cron setup

Work Log:
- Built all 12 frontend modules (dashboard, companies, shops, bookers, products, warehouse, order-entry, orders, invoices, payments, accounts, reports)
- Wired all modules into single-page app at / via Zustand store module switch
- Fixed dashboard API bug (orders count vs array iteration)
- Fixed SelectItem empty value issue (Radix requires non-empty values) - replaced "" with "ALL"/"NONE"
- Fixed useUpdateOrderStatus to invalidate single order query + payments query
- Fixed useAppStore import location across 4 modules
- Ran agent-browser end-to-end verification:
  1. Login with admin@erp.local/admin123 ✓
  2. Dashboard loads with 4 companies, 0 shops (fresh) ✓
  3. Created Test Shop 1 (SHOP-0001) linked to COMP-A with Rs 50,000 credit limit, NON_FILER ✓
  4. Created Chocolate Biscuit product (BISC-500) with 100 opening stock ✓
  5. Booked order ORD-000001: 1 CTN @ Rs 120, verified tax calc:
     - Subtotal: Rs 120.00
     - Sales Tax (17%): Rs 20.40 ✓
     - Further Tax (Non-Filer 3%): Rs 0.61 ✓
     - Withholding Tax (8% Non-Filer): Rs 11.28 ✓
     - Grand Total: Rs 152.29 ✓
  6. Approval workflow: PENDING → APPROVED → PICKED → DISPATCHED → DELIVERED ✓
  7. Invoice INV-000001 auto-generated on delivery ✓
  8. Ledger DEBIT entry created (Rs 152.29), outstanding updated ✓
  9. Stock deducted from 100 to 99 ✓
  10. Recorded payment PAY-000001 (Rs 100 cash) ✓
  11. Ledger CREDIT entry created, outstanding reduced to Rs 52.29 ✓
  12. Reports: Sales Summary, Top Shops, Outstanding Aging all working ✓
- Set up 15-minute cron job (job_id 288761) for webDevReview

Stage Summary:
- FULLY WORKING ERP with 100% accurate tax mechanism
- All user requirements met:
  ✓ 4 companies with completely separate product catalogs
  ✓ Shops with manual entry, class A/B/C, filer/non-filer
  ✓ 9 order bookers with 2-company mapping support
  ✓ Credit system with WARNING only (no block) - tested, order saved despite credit limit
  ✓ Single warehouse with company-wise sections
  ✓ Multi-currency (PKR default + USD/EUR/AED)
  ✓ Sales tax (17%) mandatory
  ✓ Filer tax (4.5%) / Non-filer tax (8%) mandatory
  ✓ Further tax (3%) for non-filers mandatory
  ✓ Withholding tax on grand total
- Lint clean, no runtime errors
- End-to-end verified via agent-browser

Unresolved / Next Steps:
- Order Booker login flow (create a booker user, login as booker, test company filtering)
- Shop-to-Booker route assignments (BookerShopAssignment UI)
- Schemes/trade offers UI (data model exists, no UI yet)
- Stock movement history view
- Invoice print/PDF export
- Excel/CSV export for reports
- Mobile PWA optimization for bookers in field
- Bulk shop import (currently manual as requested)
- Audit log for status changes

---
Task ID: BATCH-FLOW
Agent: main
Task: Add Batch Processing + Consolidated Pick List + Dispatch Manifest flow

Work Log:
- Added OrderBatch model to schema (batchNo, companyId, bookerId, status flow, totals, timestamps)
- Linked Order to OrderBatch via batchId (nullable, SetNull on delete)
- Added batch relations to User, Company, OrderBooker models
- Ran db:push + db:generate to sync Prisma client
- Created API routes:
  - GET/POST /api/batches (list + create with auto-attach pending orders)
  - GET/PATCH /api/batches/[id] (detail + bulk status update in transaction)
  - GET /api/batches/[id]/picklist (consolidated product-wise aggregation)
  - GET /api/batches/[id]/manifest (shop-wise loading slip with route sequence)
- Updated orders POST API to accept batchId field
- Added TanStack Query hooks: useBatches, useBatch, usePickList, useManifest, useCreateBatch, useUpdateBatchStatus
- Updated Zustand store with 'batches' module + activeBatchId
- Added "Batches & Pick Lists" nav item to app-shell
- Built BatchesModule component with:
  - Card grid view of batches (batchNo, company, status, orders/shops/units/total)
  - Create Batch dialog (auto-attaches all PENDING orders for company)
  - Detail Sheet with 3 tabs:
    * Orders tab: list of all orders in batch
    * Pick List tab: consolidated product-wise pick list with shortage detection + print
    * Manifest tab: shop-wise dispatch manifest with route sequence (sorted by class A→B→C) + print
  - Bulk actions: Approve All, Mark Picked All, Mark Dispatched All, Mark Delivered All, Close Batch, Cancel Batch
  - On DELIVERED: transaction generates invoices + ledger debits + stock deductions for ALL orders
- Regenerated Prisma client, restarted dev server
- Verified end-to-end via agent-browser:
  1. Created 3 test orders (ORD-000004, 000005, 000006) for 3 shops
  2. Created batch BAT-000001 → auto-attached all 3 pending orders (9 units, Rs 986.27)
  3. Approved all 3 orders with 1 click ✓
  4. Viewed consolidated pick list: 1 product (Chocolate Biscuit), 9 PCS to pick, 98 available, 0 shortage ✓
  5. Marked Picked all 3 ✓
  6. Viewed dispatch manifest: 3 stops sorted by class (A → A → A), route sequence 1,2,3 ✓
  7. Marked Dispatched all 3 ✓
  8. Marked Delivered all 3 → auto-generated INV-000002, 000003, 000004 invoices ✓
  9. Verified ledger: 3 shops with outstanding (327.31, 436.41, 222.55) ✓
  10. Verified stock: deducted from 98 to 89 (9 units = 3 orders sum) ✓

Stage Summary:
- BATCH FLOW FULLY WORKING — solves the exact problem user raised:
  "Booker punches 10 orders → supervisor doesn't approve 10 bills one by one"
  Now: 1 batch → 1 approve → 1 pick list → 1 manifest → 1 deliver
- All bulk operations happen in a single DB transaction (atomic)
- Consolidated pick list: warehouse picks once per product (not once per order)
- Dispatch manifest: rider gets one loading slip with all shops + route sequence
- Tax calculation remains 100% accurate (sales tax, further tax for non-filer, withholding tax)

Unresolved / Next Steps:
- Show batch info on individual order detail (currently batch link not shown in Orders module)
- Allow adding specific orders to a batch (currently auto-attaches ALL pending)
- Print-optimized CSS for pick list + manifest (currently uses window.print)
- Booker dashboard: show their batches + today's route
- Batch-level payment tracking (collect payment against whole batch)

---
Task ID: PDF-1
Agent: main
Task: Build Supplier Summary (Load Form) + Shopkeeper Invoice (Cash Memo) print pages matching reference PDFs

Work Log:
- Read both reference PDFs (bills.pdf = shopkeeper invoice format, cbl (1).pdf = supplier load form)
- bills.pdf format: Company header (NTN/STRN/SalesTax#), Invoice metadata, Shop details (M/S code, NTN, route), items table (code, product, CTN/Box/Units, unit price excl, value excl, GST%, GST amt, gross, discount, net), promotions list (scheme-wise breakdown), summary box (Gross excl GST, GST, With GST, Advance Tax, Total Discount, Net Invoice), Load Form ref, 4 signature lines (Checked By/Order Booker/Delivered By/Shop Keeper)
- cbl (1).pdf format: Load Form header (Deliveryman, PJP/Route, Order Booker, dates), Section 1 (SKU-wise issued: code, name, mfg code, issued units, box, cartons, returned, free, sale units), Section 2 (Store-wise: S.No, invoice no, store/owner, booker, status, issued units, total issued, sales amount), 2 signature lines (Deliveryman/Stock Keeper)

Files Created:
- src/app/print/layout.tsx - minimal print layout (no sidebar/topbar)
- src/app/print/print.css - print-optimized CSS (@page A4, doc styling, tables, signatures, @media print)
- src/components/erp/print-button.tsx - client component with window.print() + window.close()
- src/app/print/supplier-summary/[batchId]/page.tsx - Supplier Summary (Load Form) - Server Component fetching batch with consolidated SKU table + store-wise summary
- src/app/print/invoice/[invoiceId]/page.tsx - Single Shopkeeper Invoice - Server Component with full tax breakdown + promotions + 4 signatures
- src/app/print/invoices/[batchId]/page.tsx - Bulk Invoices - renders all invoices in batch, page-break-after each

Key Technical Decisions:
- Used print-optimized HTML pages with window.print() instead of server-side PDF libraries (simpler, no deps, user gets native print dialog → can save as PDF)
- Server Components for data fetching (direct Prisma queries), Client component (PrintButton) for print trigger
- @page CSS rule for A4 size with 12mm margins
- page-break-after: always for bulk invoices
- Matched reference PDF column structures exactly

Integration:
- Batches module (Pick List tab): "Print Supplier Summary" button → /print/supplier-summary/[batchId]
- Batches module (Manifest tab): "Print All Invoices" button → /print/invoices/[batchId]
- Invoices module (detail sheet): "Print Invoice" button → /print/invoice/[invoiceId]

Verification (agent-browser):
- Invoice print page (/print/invoice/INV-000005): renders Alpha Distributors header, CASH MEMO/INVOICE title, shop details, items table with GST breakdown, promotions list, summary box with Net Invoice, 4 signature lines ✓
- Supplier summary (/print/supplier-summary/BAT-000001): renders LOAD FORM header, Section 1 (SKU consolidated: 1 product, 9 units), Section 2 (3 stores with INV-000003/4/5, 9 total units, sales amounts), signature lines ✓
- Bulk invoices (/print/invoices/BAT-000001): renders all 3 invoices, each with page break ✓
- Print buttons in Batches module + Invoices module working (open in new tab) ✓
- Lint clean, no runtime errors

Stage Summary:
- Both PDF formats (supplier summary + shopkeeper invoice) fully implemented and verified
- User can now print/download:
  1. Supplier Summary (Load Form) - for warehouse to pick stock + for stock keeper
  2. Shopkeeper Invoice (Cash Memo) - tax-compliant bill given to each shop
  3. Bulk Invoices - all invoices in a batch printed at once (one per page)
- Tax breakdown on invoice matches reference: Gross Excl GST, GST (sales tax), Further Tax (non-filer), With GST, Advance Tax (withholding), Total Discount, Net Invoice
- Promotions/schemes listed line-by-line as in reference
- Signature lines match reference (Checked By, Order Booker, Delivered By, Shop Keeper)

Unresolved / Next Steps:
- Booker name shows "—" on print pages when order has no booker (admin-created orders). Need to assign booker during order entry for production use.
- PDF metadata (title/author) not set since using print-to-PDF (browser handles it)
- Could add QR code/barcode on invoices for scanning
- Could add company logo upload + display on invoice header

---
Task ID: RECOVERY-1
Agent: main
Task: Add Quick Recovery (fast payment collection) + Previous Balance on bills

Work Log:
- Added previousBalance + totalPayable fields to Order schema (snapshot of shop's outstanding at order creation)
- Added previousBalance + totalPayable fields to Invoice schema (carried from order)
- Pushed schema, regenerated Prisma client

Backend:
- Updated orders POST API to capture outstandingBalance from shop's companyLink → stored as previousBalance, totalPayable = grandTotal + previousBalance
- Updated batches/[id] PATCH (delivery) to set invoice.previousBalance, invoice.totalPayable, invoice.balance = totalPayable
- Updated orders/[id] PATCH (single delivery) to set same invoice fields

Frontend - Quick Recovery:
- Created src/components/erp/quick-recovery.tsx — minimal payment modal:
  * Company + Shop dropdowns (shop filtered by selected company)
  * Shows current outstanding of selected shop with "Click to fill full outstanding amount" auto-fill button
  * Amount + payment mode (default Cash) + optional reference
  * One-click "Record Recovery" — uses useCreatePayment mutation
  * Accessible from Order Entry (top action button) and Shops module header
  * Preset companyId/shopId can be passed (order-entry pre-fills with current selection)

Frontend - Previous Balance on Bill:
- Order Entry cart summary: after Grand Total, if shop has outstanding:
  * Shows "Previous Balance (outstanding)" in amber
  * Shows "TOTAL PAYABLE" in amber box = grandTotal + previousBalance
  * Note: "Current bill + previous balance"
- Orders detail sheet: GRAND TOTAL row + Previous Balance + TOTAL PAYABLE (amber highlighted)
- Invoice print page (/print/invoice/[invoiceId]):
  * NET INVOICE (current bill total)
  * Previous Balance (dashed separator, amber color)
  * TOTAL PAYABLE (bold, larger font, black separator)
  * Balance Due = totalPayable
- Bulk invoices print (/print/invoices/[batchId]): same previous balance + total payable display
- All print pages keep tax breakdown intact (sales tax, further tax, withholding tax calculated on current bill only — previous balance is NOT re-taxed)

Verification (agent-browser):
1. Quick Recovery test:
   - Opened Quick Recovery dialog from Order Entry
   - Selected company COMP-A + shop SHOP-0001 (Test Shop 1, outstanding Rs 327.31)
   - Dialog showed "Current Outstanding: Rs 327.31" with auto-fill button
   - Clicked "fill full outstanding amount" → amount auto-filled (327.31)
   - Clicked "Record Recovery" → POST /api/payments 201 ✓
   - Outstanding of Test Shop 1 reduced to 0 ✓

2. Previous Balance on bill test:
   - Created order ORD-000007 for New Mart Gulshan (outstanding Rs 236.41)
   - Added 1 Chocolate Biscuit @ Rs 92
   - Cart summary showed:
     * Grand Total: Rs 109.10
     * Previous Balance: Rs 236.41 ✓
     * TOTAL PAYABLE: Rs 345.51 ✓ (109.10 + 236.41)
   - Submitted order → POST /api/orders 201 ✓
   - DB verification: previousBalance=236.41, totalPayable=345.51 ✓

3. Order detail sheet:
   - GRAND TOTAL: 109.10
   - Previous Balance: 236.41 ✓
   - TOTAL PAYABLE: 345.51 ✓ (amber highlighted)

4. Invoice generation:
   - Approved → Picked → Dispatched → Delivered
   - Invoice INV-000006 auto-generated with:
     * grandTotal: 109.10
     * previousBalance: 236.41 ✓
     * totalPayable: 345.51 ✓
     * balance: 345.51 (total payable = balance due) ✓

5. Invoice print page:
   - NET INVOICE: 109.10
   - Previous Balance: 236.41 ✓ (amber, dashed separator)
   - TOTAL PAYABLE: 345.51 ✓ (bold, black separator)
   - Balance Due: 345.51 ✓
   - Tax breakdown intact (Sales Tax 16.56, Withholding Tax 0.54)
   - 4 signature lines intact

Stage Summary:
- Both features FULLY WORKING and verified end-to-end:
  1. Quick Recovery: booker can record cash/cheque collection in seconds (3 clicks: open dialog → fill amount → submit)
  2. Previous Balance on bill: when booking order for shop with outstanding, bill shows:
     - Current bill total (with full tax breakdown)
     - Previous Balance (outstanding carried over)
     - TOTAL PAYABLE = current + previous
- This matches user's exact requirement: "agar kisi shop ka bakaya amount aa raha ho aur orderbooker us ka bill banain to us bill pe previous balance bhi lazmi aana chahiye or end me total bill or previous balance ka sum aana chahiye"
- Tax compliance maintained: previous balance is NOT re-taxed (only current bill goes through sales tax / further tax / withholding tax calculation)

Unresolved / Next Steps:
- Show "Quick Recovery" button on shops list per-row (quick action per shop)
- Show previous balance on dashboard KPIs (total previous balances across all shops)
- Could add "Settle Previous Balance" option that creates a payment earmarked for previous balance only
- Booker mobile view optimization (Quick Recovery should be thumb-reachable)

---
Task ID: QUICK-RECOVERY-BATCH
Agent: main
Task: Rewrite Quick Recovery as batch entry with booker selection + queue + OK to submit all

Work Log:
- Added bookerId field to Payment model (tracks which order booker collected each recovery)
- Added PaymentBooker relation on OrderBooker model
- Pushed schema, regenerated Prisma client (had to restart dev server to pick up new client)

Backend:
- Updated shops API GET to support bookerId filter: when bookerId passed, returns ONLY shops assigned to that booker via BookerShopAssignment (where.assignments = { some: { bookerId } })
- Updated payments POST API to accept + store bookerId on payment record
- Updated useShops hook to pass bookerId param

Frontend - Quick Recovery (complete rewrite as batch entry):
- src/components/erp/quick-recovery.tsx now implements a 3-step batch flow:
  * STEP 1: Select Order Booker (dropdown of all active bookers, shows company count)
    - Shows "Companies: COMP-A, COMP-B" for transparency
  * STEP 2: Select Shop — dropdown shows ONLY shops assigned to selected booker
    - Each shop shows current outstanding inline (e.g., "New Mart Gulshan (Out: Rs 345.51)" or "(Clear)" if 0)
    - If booker has no shop assignments, shows warning "No shops assigned to this booker yet"
    - Company is auto-derived from shop's companyLink intersected with booker's assigned companies
    - Shows outstanding amount with "Fill full" auto-fill button
  * STEP 3: Enter Amount + Mode (default Cash) → "Add to Queue" button
    - Prevents duplicate shop entry (warns if shop already in queue)
  
- QUEUE LIST (shows at top of dialog):
  * Header: "Queued Recoveries (N)" with green total badge
  * Each queued item shows: #, shop name + code, company + mode, amount, "was: X" (outstanding before)
  * Remove (trash) button per item
  * Footer: "N recoveries queued · Total: Rs X"
  
- "OK — Submit All (N)" button:
  * Disabled when queue empty
  * On click: loops through queue, calls createPayment mutation for each with bookerId
  * Shows spinner during submission
  * Success: toast "✓ N recoveries recorded / balances updated", clears queue, closes dialog
  * Partial failure: reports how many succeeded vs failed
  * After success: invalidates shops/ledger queries → balances refresh automatically

Verification (agent-browser):
1. Seeded booker "Jam Shahid" (OB-001) with COMP-A assignment + 3 shops (SHOP-0001, 0002, 0003) assigned via BookerShopAssignment
2. Opened Quick Recovery from Shops module header
3. Selected booker "OB-001 · Jam Shahid (1 companies)" → "Companies: COMP-A" shown ✓
4. Shop dropdown showed ONLY 3 assigned shops (NOT all 5):
   - SHOP-0001 · Test Shop 1 (Clear)
   - SHOP-0002 · New Mart Gulshan (Out: Rs 345.51)
   - SHOP-0003 · City Store Tariq Road (Out: Rs 222.55)
   ✓ (SHOP-0004 and SHOP-0005 NOT shown — correctly filtered)
5. Selected New Mart Gulshan → outstanding Rs 345.51 shown → clicked "Fill full" → amount auto-filled
6. Clicked "Add to Queue" → queue shows: "1. New Mart Gulshan (SHOP-0002) · AL-FALAH TRADERS · CASH · Rs 345.51 · was: Rs 345.51"
7. Selected City Store Tariq Road → outstanding Rs 222.55 → Fill full → Add to Queue
8. Queue now shows 2 items, total badge "Rs 568.06", footer "2 recoveries queued · Total: Rs 568.06"
9. Clicked "OK — Submit All (2)" → POST /api/payments 201 (x2) ✓
10. Dialog closed, balances updated:
    - New Mart Gulshan: 345.51 → 0 ✓
    - City Store Tariq Road: 222.55 → 0 ✓
11. DB verification: payments saved with bookerId = Jam Shahid ✓

Stage Summary:
- Quick Recovery now properly matches user's exact workflow requirement:
  "pehle orderbooker select karein → usi booker ki shops show hon → jo jo recovery add karein upar column banta jaye → end mein OK karein to shops k balances update hon"
- Booker accountability: each payment now records which booker collected it (bookerId)
- Shop filtering: only shops assigned to selected booker via BookerShopAssignment appear
- Queue-then-commit: recoveries queue up first, balances update ONLY when OK is clicked
- Real-time outstanding shown per shop in dropdown (helps booker know which shops have dues)
- Auto-fill full outstanding button (one click fills exact outstanding amount)

Unresolved / Next Steps:
- Booker productivity report should show total recoveries collected per booker (now that bookerId is tracked)
- Could add "Recovery Report by Booker" in Reports module
- Could show booker's today's total collected on their dashboard
- Mobile optimization for bookers in the field

---
Task ID: CRON-REVIEW-20260725
Agent: main (cron-triggered review)
Task: QA assessment + bug fixes + new recovery analytics features

## Current Project Status Assessment
Project is mature and stable. All 12 modules load without runtime errors (verified via agent-browser sequential testing). All 3 print pages (/print/invoice, /print/supplier-summary, /print/invoices) render correctly. Lint clean. No build errors. The Quick Recovery batch flow, Batches processing with consolidated pick list + manifest, and Previous Balance on bills are all working.

## Bugs Found & Fixed
1. **StatCard truncation bug** (VLM-detected): Large currency values like "Rs 10,535.63" were being cut off as "Rs 10,53..." due to `truncate` class on value text.
   - Fix: Removed `truncate`, switched to responsive `text-lg md:text-xl lg:text-2xl` with `break-words` and `tabular-nums` for better number alignment. Added `group-hover:scale-110` on icon for subtle interactivity.
   - File: src/components/erp/ui-helpers.tsx

## New Features Added

### 1. Today's Recovery KPI (Dashboard)
- Updated /api/dashboard to include `todayRecoveryCount` and `recoveryByMode` (cash/cheque/transfer breakdown) in KPIs
- Dashboard "Today's Recovery" StatCard now shows collection count + cash amount in hint
- Previously showed only "Cash + Cheque + Transfer" generic hint

### 2. Top Recovering Bookers Widget (Dashboard)
- New dashboard widget ranking bookers by today's total collected amount
- Each booker shows: rank badge (gold/silver/bronze), name, employee code, collection count, total amount, progress bar (relative to top booker)
- Data sourced from payments where bookerId is set (recorded via Quick Recovery batch flow)
- API: GET /api/dashboard now returns `topRecoveringBookers` array (max 5)

### 3. Recent Recoveries Widget (Dashboard)
- Live feed of today's 6 most recent payment collections
- Each entry shows: payment mode icon (cash=emerald, cheque=sky, transfer=violet), shop name, booker name, time, amount
- API: GET /api/dashboard now returns `recentRecoveries` array (max 6)

### 4. Recovery by Mode Widget (Dashboard)
- Visual breakdown of today's recovery by payment mode (Cash / Cheque / Transfer-Online)
- Each mode shows amount + percentage with progress bar
- Total summary at bottom

### 5. Recovery by Booker Report (Reports module)
- New report type `recoveryByBooker` added to /api/reports
- Aggregates all payments (with bookerId set) grouped by booker
- Per booker shows: total collected, recovery count, shops covered, cash/cheque/transfer/online breakdown, avg per recovery, daily time series
- New "Recovery by Booker" tab in Reports module with:
  - 5 summary StatCards (Total Recovered, Total Collections, Cash, Cheque, Transfer/Online)
  - Full ranking table with 11 columns: Rank, Booker, Companies, Collections, Shops, Cash, Cheque, Transfer, Avg/Recovery, Total Collected, Performance bar
  - Footer totals row
- Sorted by total collected (highest first)

## Verification Results
1. **Lint**: Clean (no errors)
2. **All 12 modules**: Load without runtime/build errors (agent-browser verified)
3. **All 3 print pages**: Render correctly
4. **Dashboard API**: Returns recovery data correctly:
   - recoveryByMode: {cash: 1695.37, cheque: 0, transfer: 0}
   - topRecoveringBookers: 1 booker (Jam Shahid)
   - recentRecoveries: 6 items
5. **Reports API** (recoveryByBooker): Returns Jam Shahid with total 568.06, 2 collections, all cash, 2 shops covered
6. **VLM screenshot review**:
   - Dashboard KPI values: NOT truncated (Rs 10,535.63 fully visible) ✓
   - Recovery widgets: All 3 (Top Recovering Bookers, Recent Recoveries, Recovery by Mode) visible and well-styled ✓
   - Recovery by Booker report: Table with all columns visible, clean styling, Jam Shahid row correct ✓

## Files Modified
- src/components/erp/ui-helpers.tsx — StatCard truncation fix + hover effect
- src/app/api/dashboard/route.ts — Added recovery KPIs, topRecoveringBookers, recentRecoveries, recoveryByMode
- src/components/erp/modules/dashboard.tsx — New "Today's Recovery" KPI hint + 3 new recovery widgets at bottom
- src/app/api/reports/route.ts — Added recoveryByBooker report type
- src/components/erp/modules/reports.tsx — Added "Recovery by Booker" tab + RecoveryByBookerReport component

## Unresolved Issues / Next Steps
- Booker productivity report (existing) could be enhanced to also show recovery stats side-by-side with sales stats (now that bookerId is tracked on payments)
- Dashboard "Top Recovering Bookers" could link to a booker detail page
- Recovery by Booker report could support date range filter UI (API already supports from/to)
- Could add "Recovery vs Sales" comparison chart per booker (collection ratio = recovery / sales)
- Mobile optimization: dashboard widgets stack on mobile but could be more compact
- Could add CSV/Excel export for all reports
- Consider adding booker login flow test (login as ahmed@erp.local / booker123 to verify booker sees only their data)

---
Task ID: PURCHASE-INVOICE-SYSTEM
Agent: main
Task: Build Purchase Invoice system — record supplier purchases + auto-add stock to warehouse

## Issue
Products could be created but there was no way to record a purchase invoice from a supplier to add stock. Only opening stock or manual warehouse adjustment was available.

## Solution
Built a complete Purchase Invoice system:

### 1. Schema (PurchaseInvoice + PurchaseInvoiceItem models)
- PurchaseInvoice: invoiceNo (PINV-000001), companyId, supplierName, supplierNtn, invoiceDate, subtotal, taxAmount, otherCharges, grandTotal, notes, status, createdById
- PurchaseInvoiceItem: purchaseInvoiceId, productId, quantity, unitPrice, taxRate, lineTotal
- Relations added to Company, User, Product models

### 2. API (/api/purchase-invoices)
- GET: list purchase invoices with items + company
- POST: create purchase invoice + **auto-add stock to warehouse** + create stock movements
  - Transaction ensures atomic operation
  - For each item: finds/creates Stock record, adds quantity, creates StockMovement (type=IN)

### 3. Purchase Invoices Module (UI)
- List view: invoice no, date, supplier, company, items count, total, status, view detail
- Summary KPIs: Total Purchases, Total Value, Suppliers count
- Create dialog:
  - Company selector
  - Supplier name + NTN
  - Tax amount + Other charges
  - Product search + line items table (product, qty, price, total)
  - Add Row button for more items
  - Auto-calculates subtotal + grand total
  - "Create & Add Stock" button
- Detail dialog: shows all items + totals

### 4. Navigation
- "Purchase Invoices" nav item under Master Data (admin/manager/warehouse only)
- PackagePlus icon

## Verified
1. Stock BEFORE: Chocolate Biscuit = 88 units
2. Created Purchase Invoice PINV-000001: Test Supplier, 50 units @ Rs 86 = Rs 4,300
3. POST /api/purchase-invoices 201 ✓
4. Stock AFTER: Chocolate Biscuit = **138 units** (88 + 50 = 138) ✓
5. Purchase Invoice saved: PINV-000001, 1 item, total Rs 4,300 ✓
6. Lint: Clean

## Files Created/Modified
- prisma/schema.prisma — PurchaseInvoice + PurchaseInvoiceItem models + relations
- src/app/api/purchase-invoices/route.ts (NEW) — GET + POST with stock auto-add
- src/lib/api-hooks.ts — usePurchaseInvoices + useCreatePurchaseInvoice hooks
- src/components/erp/modules/purchase-invoices.tsx (NEW) — full UI module
- src/lib/store.ts — added 'purchase-invoices' to ModuleKey
- src/components/erp/app-shell.tsx — added nav item + PackagePlus icon
- src/app/page.tsx — wired PurchaseInvoicesModule

---
Task ID: FIX-MARK-DELIVERED-20260807
Agent: main
Task: Fix "Failed" error when clicking Mark Delivered All on a DISPATCHED batch (BAT-000004 with 3 orders)

## Diagnosis
User reported that clicking "Mark Delivered All (3)" on a DISPATCHED batch showed a red "Failed" toast with no details. Investigation revealed:

1. **Generic error message**: The `patchJson` helper in `src/lib/api-hooks.ts` threw `new Error('Failed')` whenever the server returned a non-OK response with no JSON `error` field. So if the API crashed with a 500 + HTML error page, the user just saw "Failed" with zero context.

2. **No try/catch in API route**: The PATCH `/api/batches/[id]` route in `src/app/api/batches/[id]/route.ts` had no try/catch around the `db.$transaction()`. Any Prisma error (timeout, constraint violation, connection issue) bubbled up as an unhandled 500 with no JSON body — which the client reduced to "Failed".

3. **Performance concern (serverless)**: The original code called `tx.warehouseSection.findFirst()` *inside* the inner loop — once per order item — and `tx.invoice.count()` per order iteration. On Vercel serverless (10s default timeout), 3 orders × N items × multiple sub-queries per item could exceed the limit.

4. **Stale dev server**: Local dev server (PID 1072) was started before .env was updated, so it was connecting to an OLD database and returning stale batches — masking the real issue. After restart with explicit DATABASE_URL env, the API correctly returned BAT-000004 in DISPATCHED status with 3 orders, matching Neon.

## Fix Applied

### 1. `src/app/api/batches/[id]/route.ts` (PATCH endpoint)
- Wrapped entire PATCH handler in `try/catch` with detailed server-side logging (`console.error` with batchId, status, error message, code, stack trace)
- Returns `bad(msg, 500)` with the actual Prisma error message (e.g., for P2002 unique constraint violations, shows which field collided)
- **Optimization 1**: Fetch `warehouseSection` ONCE before the loop (was per-item per-order)
- **Optimization 2**: Use a local `invoiceSeq` counter (was `tx.invoice.count()` per order)
- **Optimization 3**: Explicit `{ timeout: 60000 }` on `$transaction` (default is 5s — too short for batch delivery)
- Early validation: returns helpful error if no warehouse section exists for the company
- Idempotency: calling DELIVERED on an already-DELIVERED batch now succeeds (skips already-invoiced orders)
- Allow same-status re-apply (idempotent) — only block strictly backward moves

### 2. `src/lib/api-hooks.ts` (all 4 HTTP helpers)
- `fetchJson`, `postJson`, `putJson`, `patchJson` now surface actual server error messages
- Fallback chain: `e.error || e.message || \`Request failed (HTTP ${r.status})\``
- When response body isn't JSON, falls back to `r.statusText || \`HTTP ${r.status}\`` instead of empty string
- Users will now see real error messages (e.g., "No warehouse section found for company X" or "Duplicate value error: invoiceNo") instead of just "Failed"

## Verification
Direct API test (login → GET /api/batches → PATCH /api/batches/{id} with status=DELIVERED):

**Before fix**: PATCH returned 500 with no JSON body → client toast "Failed"
**After fix**:
- PATCH /api/batches/cmsiurcjh0003jv04xxiw25x6 → 200 OK ✓
- Response: `{status: "DELIVERED", deliveredAt: "2026-08-07T11:43:51.482Z", ...}`
- All 3 orders (ORD-000003, ORD-000004, ORD-000005) moved to DELIVERED ✓
- All 3 orders now have invoices (INV-000002, INV-000003, INV-000004) ✓
- Idempotent re-call: 200 OK again, no duplicate invoices created ✓
- Lint: clean ✓

## Stage Summary
- Mark Delivered button now works end-to-end (was returning opaque "Failed" toast)
- Better observability: server logs full error context, client sees real error message
- Performance optimization reduces DB roundtrips from O(orders × items) to O(orders + items)
- Transaction timeout increased to 60s for safety on serverless
- All 4 HTTP helper functions improved for better error surfacing across the entire app

## Files Modified
- `src/app/api/batches/[id]/route.ts` — comprehensive try/catch + query optimization + 60s timeout + idempotency
- `src/lib/api-hooks.ts` — better error messages in fetchJson/postJson/putJson/patchJson

## Unresolved / Next Steps
- Push fix to GitHub so Vercel auto-deploys (4 commits were already ahead of origin)
- Verify on Vercel production deployment after push
- Consider adding similar try/catch to other batch/order API routes for consistency
- Consider adding a health-check endpoint that reports DB connectivity
