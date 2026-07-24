'use client'

import { useDashboard, useSession } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TrendingUp, ShoppingBag, Store, Users, Package, Wallet,
  AlertTriangle, ClipboardList, Building2, ArrowRight, Zap, Banknote, CreditCard, Trophy,
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
  const { data: session } = useSession()

  const kpis = data?.kpis
  const cur = 'PKR'
  const userName = session?.name || 'User'

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={activeCompanyId === 'ALL' ? 'Overview across all companies' : 'Filtered to selected company'}
        actions={
          <Link href="#" onClick={(e) => { e.preventDefault(); useAppStore.setState({ activeModule: 'order-entry' }) }}>
            <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm font-medium shadow-sm shadow-emerald-600/30 transition-all hover:shadow-md hover:-translate-y-0.5">
              <ShoppingBag className="w-4 h-4" /> New Order
            </button>
          </Link>
        }
      />

      {/* Welcome Hero Banner */}
      <div className="mb-5 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 dark:from-emerald-700 dark:via-emerald-800 dark:to-teal-900 text-white p-4 md:p-5 shadow-lg shadow-emerald-600/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">{new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <h2 className="text-xl md:text-2xl font-bold mt-0.5">Welcome back, {userName} 👋</h2>
            <p className="text-emerald-100 text-xs mt-1">
              {kpis?.todayOrderCount ? `${kpis.todayOrderCount} orders booked today` : 'No orders booked yet today'}
              {kpis?.todayRecoveryCount ? ` · ${kpis.todayRecoveryCount} recoveries collected` : ''}
            </p>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-center">
              <p className="text-emerald-100 text-[10px] uppercase tracking-wider">Today's Sales</p>
              <p className="text-lg md:text-xl font-bold tabular-nums">{kpis ? formatCurrency(kpis.todaySales, cur) : '—'}</p>
            </div>
            <div className="w-px h-10 bg-emerald-300/30" />
            <div className="text-center">
              <p className="text-emerald-100 text-[10px] uppercase tracking-wider">Today's Recovery</p>
              <p className="text-lg md:text-xl font-bold tabular-nums">{kpis ? formatCurrency(kpis.todayPaymentReceived, cur) : '—'}</p>
            </div>
            <div className="w-px h-10 bg-emerald-300/30" />
            <div className="text-center">
              <p className="text-emerald-100 text-[10px] uppercase tracking-wider">Outstanding</p>
              <p className="text-lg md:text-xl font-bold tabular-nums">{kpis ? formatCurrency(kpis.outstanding, cur) : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <StatCard title="Today's Sales" value={kpis ? formatCurrency(kpis.todaySales, cur) : '—'} icon={TrendingUp} tone="emerald" hint={`${kpis?.todayOrderCount ?? 0} orders today`} loading={isLoading} />
        <StatCard title="Today's Recovery" value={kpis ? formatCurrency(kpis.todayPaymentReceived, cur) : '—'} icon={Wallet} tone="sky" hint={`${kpis?.todayRecoveryCount ?? 0} collections · Cash ${formatCurrency(kpis?.recoveryByMode?.cash || 0, cur)}`} loading={isLoading} />
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

      {/* Recovery Section: Top Recovering Bookers + Recent Recoveries + Mode Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Top Recovering Bookers Today */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Top Recovering Bookers (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : data?.topRecoveringBookers?.length ? (
              <div className="space-y-2">
                {data.topRecoveringBookers.map((b: any, i: number) => {
                  const max = data.topRecoveringBookers[0]?.total || 1
                  const pct = (b.total / max) * 100
                  return (
                    <div key={b.booker.id} className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : i === 1 ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' : i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400'}`}>
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{b.booker.name}</p>
                            <p className="text-[10px] text-muted-foreground">{b.booker.employeeCode} · {b.count} collections</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(b.total, cur)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState icon={Trophy} title="No recoveries today" hint="Booker collections will appear here once recorded via Quick Recovery." />
            )}
          </CardContent>
        </Card>

        {/* Recent Recoveries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Recent Recoveries (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : data?.recentRecoveries?.length ? (
              <ScrollArea className="h-[220px]">
                <div className="space-y-1.5">
                  {data.recentRecoveries.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${p.paymentMode === 'CASH' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : p.paymentMode === 'CHEQUE' ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400' : 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400'}`}>
                        {p.paymentMode === 'CASH' ? <Banknote className="w-4 h-4" /> : p.paymentMode === 'CHEQUE' ? <CreditCard className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.shop?.name || 'Unknown shop'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {p.booker?.name || 'Direct'} · {p.paymentMode}
                          {' · '}{new Date(p.paymentDate).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(p.amount, cur)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyState icon={Zap} title="No recoveries today" />
            )}
          </CardContent>
        </Card>

        {/* Recovery Mode Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-sky-500" /> Recovery by Mode (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : kpis?.todayPaymentReceived ? (
              <div className="space-y-3">
                {[
                  { label: 'Cash', value: kpis.recoveryByMode?.cash || 0, icon: Banknote, color: 'emerald', bar: 'bg-emerald-500' },
                  { label: 'Cheque', value: kpis.recoveryByMode?.cheque || 0, icon: CreditCard, color: 'sky', bar: 'bg-sky-500' },
                  { label: 'Transfer / Online', value: kpis.recoveryByMode?.transfer || 0, icon: Wallet, color: 'violet', bar: 'bg-violet-500' },
                ].map((m) => {
                  const pct = kpis.todayPaymentReceived > 0 ? (m.value / kpis.todayPaymentReceived) * 100 : 0
                  const Icon = m.icon
                  return (
                    <div key={m.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {m.label}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-bold tabular-nums">{formatCurrency(m.value, cur)}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div className={`h-full ${m.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Today</span>
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(kpis.todayPaymentReceived, cur)}</span>
                </div>
              </div>
            ) : (
              <EmptyState icon={Wallet} title="No recovery data" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
