'use client'

import { useDashboard } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TrendingUp, ShoppingBag, Store, Users, Package, Wallet,
  AlertTriangle, ClipboardList, Building2, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/erp-types'

const COLORS = ['#059669', '#0891b2', '#7c3aed', '#d97706', '#dc2626', '#16a34a']

export function DashboardModule() {
  const { activeCompanyId } = useAppStore()
  const { data, isLoading } = useDashboard(activeCompanyId)

  const kpis = data?.kpis
  const cur = 'PKR'

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={activeCompanyId === 'ALL' ? 'Overview across all companies' : 'Filtered to selected company'}
        actions={
          <Link href="#" onClick={(e) => { e.preventDefault(); useAppStore.setState({ activeModule: 'order-entry' }) }}>
            <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm font-medium shadow-sm">
              <ShoppingBag className="w-4 h-4" /> New Order
            </button>
          </Link>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <StatCard title="Today's Sales" value={kpis ? formatCurrency(kpis.todaySales, cur) : '—'} icon={TrendingUp} tone="emerald" hint={`${kpis?.todayOrderCount ?? 0} orders today`} loading={isLoading} />
        <StatCard title="Payments Today" value={kpis ? formatCurrency(kpis.todayPaymentReceived, cur) : '—'} icon={Wallet} tone="sky" hint="Cash + Cheque + Transfer" loading={isLoading} />
        <StatCard title="Total Outstanding" value={kpis ? formatCurrency(kpis.outstanding, cur) : '—'} icon={AlertTriangle} tone="amber" hint="Across all shops" loading={isLoading} />
        <StatCard title="Low Stock Items" value={kpis?.lowStock ?? 0} icon={AlertTriangle} tone="rose" hint="≤ 5 units in stock" loading={isLoading} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <StatCard title="Companies" value={kpis?.companies ?? 0} icon={Building2} tone="violet" loading={isLoading} />
        <StatCard title="Active Shops" value={kpis?.shops ?? 0} icon={Store} tone="emerald" loading={isLoading} />
        <StatCard title="Order Bookers" value={kpis?.bookers ?? 0} icon={Users} tone="sky" loading={isLoading} />
        <StatCard title="Products" value={kpis?.products ?? 0} icon={Package} tone="amber" loading={isLoading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sales — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : data?.salesByDay?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v), cur)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={TrendingUp} title="No sales data yet" hint="Sales from last 7 days will appear here once orders are booked." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales by Company (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : data?.companies?.filter((c: any) => c.sales > 0).length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.companies.filter((c: any) => c.sales > 0)}
                    dataKey="sales"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={(e: any) => e.code}
                    labelLine={false}
                  >
                    {data.companies.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v), cur)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Building2} title="No company sales" hint="Company-wise sales will appear here." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Orders (Today)</CardTitle>
            <button onClick={() => useAppStore.setState({ activeModule: 'orders' })} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px]">
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : data?.recentOrders?.length ? (
                <div className="space-y-1.5">
                  {data.recentOrders.map((o: any) => (
                    <div key={o.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">
                        {o.company.code?.slice(-2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{o.orderNo} · {o.shop.name}</p>
                        <p className="text-xs text-muted-foreground">{o.booker?.name || 'Direct'} · {new Date(o.orderDate).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(o.grandTotal, o.currency)}</p>
                        <StatusBadge status={o.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={ClipboardList} title="No orders today" hint="Orders booked today will appear here." />
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : data?.statusBreakdown && Object.keys(data.statusBreakdown).length ? (
              <div className="space-y-2">
                {Object.entries(data.statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <StatusBadge status={status} />
                    <span className="text-sm font-semibold">{count as number}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={ClipboardList} title="No orders yet" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
