'use client'

import { useSession } from '@/lib/api-hooks'
import { LoginScreen } from '@/components/erp/login-screen'
import { AppShell } from '@/components/erp/app-shell'
import { DashboardModule } from '@/components/erp/modules/dashboard'
import { CompaniesModule } from '@/components/erp/modules/companies'
import { ShopsModule } from '@/components/erp/modules/shops'
import { BookersModule } from '@/components/erp/modules/bookers'
import { ProductsModule } from '@/components/erp/modules/products'
import { SchemesModule } from '@/components/erp/modules/schemes'
import { WarehouseModule } from '@/components/erp/modules/warehouse'
import { PurchaseInvoicesModule } from '@/components/erp/modules/purchase-invoices'
import { OrderEntryModule } from '@/components/erp/modules/order-entry'
import { BulkProcessModule } from '@/components/erp/modules/bulk-process'
import { OrdersModule } from '@/components/erp/modules/orders'
import { BatchesModule } from '@/components/erp/modules/batches'
import { InvoicesModule } from '@/components/erp/modules/invoices'
import { SaleReturnsModule } from '@/components/erp/modules/sale-returns'
import { PaymentsModule } from '@/components/erp/modules/payments'
import { AccountsModule } from '@/components/erp/modules/accounts'
import { ReportsModule } from '@/components/erp/modules/reports'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'

export default function Home() {
  const session = useSession()
  const { activeModule } = useAppStore()

  if (session.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 animate-pulse" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    )
  }

  if (session.status === 'error' || !session.data) {
    return <LoginScreen />
  }

  return (
    <AppShell>
      {activeModule === 'dashboard' && <DashboardModule />}
      {activeModule === 'companies' && <CompaniesModule />}
      {activeModule === 'shops' && <ShopsModule />}
      {activeModule === 'bookers' && <BookersModule />}
      {activeModule === 'products' && <ProductsModule />}
      {activeModule === 'schemes' && <SchemesModule />}
      {activeModule === 'warehouse' && <WarehouseModule />}
      {activeModule === 'purchase-invoices' && <PurchaseInvoicesModule />}
      {activeModule === 'order-entry' && <OrderEntryModule />}
      {activeModule === 'bulk-process' && <BulkProcessModule />}
      {activeModule === 'batches' && <BatchesModule />}
      {activeModule === 'orders' && <OrdersModule />}
      {activeModule === 'invoices' && <InvoicesModule />}
      {activeModule === 'sale-returns' && <SaleReturnsModule />}
      {activeModule === 'payments' && <PaymentsModule />}
      {activeModule === 'accounts' && <AccountsModule />}
      {activeModule === 'reports' && <ReportsModule />}
    </AppShell>
  )
}
