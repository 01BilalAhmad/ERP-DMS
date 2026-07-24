'use client'

import { useState } from 'react'
import { useReport } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatCard, EmptyState } from '@/components/erp/ui-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/erp-types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  BarChart3, Users, Store, AlertTriangle, TrendingUp, Award, Trophy, Wallet, Zap, Download,
} from 'lucide-react'

type ReportType = 'salesSummary' | 'bookerProductivity' | 'shopCoverage' | 'aging' | 'topShops' | 'recoveryByBooker'

export function ReportsModule() {
  const { activeCompanyId } = useAppStore()
  const [type, setType] = useState<ReportType>('salesSummary')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const companyId = activeCompanyId === 'ALL' ? undefined : activeCompanyId
  const { data, isLoading } = useReport(type, { companyId, from: fromDate || undefined, to: toDate || undefined })

  function handleExport() {
    const params = new URLSearchParams({ type })
    if (companyId) params.set('companyId', companyId)
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    window.open(`/api/export?${params.toString()}`, '_blank')
  }

  // Map report type → export type (only some reports have CSV exports)
  const canExport = ['recoveryByBooker'].includes(type)

  const tabs: { key: ReportType; label: string; icon: any }[] = [
    { key: 'salesSummary', label: 'Sales Summary', icon: TrendingUp },
    { key: 'bookerProductivity', label: 'Booker Productivity', icon: Users },
    { key: 'shopCoverage', label: 'Shop Coverage', icon: Store },
    { key: 'topShops', label: 'Top Shops', icon: Trophy },
    { key: 'recoveryByBooker', label: 'Recovery by Booker', icon: Zap },
    { key: 'aging', label: 'Outstanding Aging', icon: AlertTriangle },
  ]

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Performance insights across companies, bookers, and shops"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[140px] h-9 text-xs" />
              <span className="text-muted-foreground text-xs">→</span>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[140px] h-9 text-xs" />
            </div>
            {canExport && (
              <Button variant="outline" size="sm" onClick={handleExport} className="h-9">
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            )}
          </div>
        }
      />

      {/* Tab selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = type === t.key
          return (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      ) : (
        <>
          {type === 'salesSummary' && <SalesSummary data={data} />}
          {type === 'bookerProductivity' && <BookerProductivity data={data} />}
          {type === 'shopCoverage' && <ShopCoverage data={data} />}
          {type === 'topShops' && <TopShops data={data} />}
          {type === 'recoveryByBooker' && <RecoveryByBookerReport data={data} />}
          {type === 'aging' && <AgingReport data={data} />}
        </>
      )}
    </div>
  )
}

function SalesSummary({ data }: { data: any }) {
  if (!data) return <EmptyState icon={TrendingUp} title="No data" />
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard title="Total Sales" value={formatCurrency(data.total)} icon={TrendingUp} tone="emerald" />
        <StatCard title="Total Tax" value={formatCurrency(data.totalTax)} icon={BarChart3} tone="amber" />
        <StatCard title="Total Orders" value={data.totalOrders} icon={Trophy} tone="sky" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Sales by Company</CardTitle></CardHeader>
        <CardContent>
          {data.byCompany?.length ? (
            <ResponsiveContainer width="100%" height={Math.max(200, data.byCompany.length * 60)}>
              <BarChart data={data.byCompany.map((c: any) => ({ name: c.company.code, Sales: c.value, Tax: c.salesTax, WHT: c.withholdingTax }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="Sales" fill="#059669" radius={[0, 6, 6, 0]} maxBarSize={32} />
                <Bar dataKey="Tax" fill="#d97706" radius={[0, 6, 6, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={TrendingUp} title="No sales data" />}
        </CardContent>
      </Card>
    </div>
  )
}

function BookerProductivity({ data }: { data: any }) {
  if (!data?.length) return <EmptyState icon={Users} title="No booker data" hint="Booker productivity appears once orders are placed." />
  const sorted = [...data].sort((a, b) => b.totalValue - a.totalValue)
  const max = sorted[0]?.totalValue || 1
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Booker Productivity Ranking</CardTitle></CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Booker</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((b, i) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-zinc-200 text-zinc-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {i + 1}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-[10px] text-muted-foreground">{b.employeeCode}</p>
                  </TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{b.companies.map((c: string, i: number) => <Badge key={i} variant="outline" className="text-[9px]">{c}</Badge>)}</div></TableCell>
                  <TableCell className="text-right text-sm font-semibold">{b.orderCount}</TableCell>
                  <TableCell className="text-right text-xs text-emerald-600">{b.deliveredCount}</TableCell>
                  <TableCell className="text-right text-sm font-bold">{formatCurrency(b.totalValue)}</TableCell>
                  <TableCell>
                    <Progress value={(b.totalValue / max) * 100} className="w-24 h-2" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function ShopCoverage({ data }: { data: any }) {
  if (!data) return <EmptyState icon={Store} title="No data" />
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatCard title="Total Shops" value={data.total} icon={Store} tone="sky" />
        <StatCard title="Covered" value={data.covered} icon={TrendingUp} tone="emerald" />
        <StatCard title="Uncovered" value={data.uncovered} icon={AlertTriangle} tone="rose" />
        <StatCard title="Coverage Rate" value={`${data.coverageRate}%`} icon={Award} tone="amber" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Coverage by Shop Class</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {data.byClass?.map((c: any) => (
              <div key={c.class} className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{c.total}</p>
                <p className="text-xs text-muted-foreground">Class {c.class} Shops</p>
                <div className="mt-2">
                  <Progress value={c.total ? (c.covered / c.total) * 100 : 0} className="h-2" />
                  <p className="text-[10px] mt-1 text-muted-foreground">{c.covered} covered</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TopShops({ data }: { data: any }) {
  if (!data?.length) return <EmptyState icon={Trophy} title="No data" hint="Top shops by order value will appear here." />
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Top 20 Shops by Sales Value</CardTitle></CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Avg Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s: any, i: number) => (
                <TableRow key={s.shop?.id || i}>
                  <TableCell>
                    <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>{i + 1}</span>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{s.shop?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.shop?.code}</p>
                  </TableCell>
                  <TableCell className="text-right text-sm">{s.count}</TableCell>
                  <TableCell className="text-right text-sm font-bold">{formatCurrency(s.total)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatCurrency(s.total / s.count)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function AgingReport({ data }: { data: any }) {
  if (!data?.length) return <EmptyState icon={AlertTriangle} title="No outstanding" hint="Shops with outstanding balance will appear here." />
  const totals = data.reduce((acc: any, d: any) => {
    acc.current += d.current; acc.d30 += d.d30; acc.d60 += d.d60; acc.d90 += d.d90; acc.total += d.outstanding
    return acc
  }, { current: 0, d30: 0, d60: 0, d90: 0, total: 0 })
  return (
    <div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        <StatCard title="Current (0-30)" value={formatCurrency(totals.current)} icon={TrendingUp} tone="emerald" />
        <StatCard title="31-60 days" value={formatCurrency(totals.d30)} icon={AlertTriangle} tone="amber" />
        <StatCard title="61-90 days" value={formatCurrency(totals.d60)} icon={AlertTriangle} tone="rose" />
        <StatCard title="90+ days" value={formatCurrency(totals.d90)} icon={AlertTriangle} tone="rose" />
        <StatCard title="Total" value={formatCurrency(totals.total)} icon={Trophy} tone="sky" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Outstanding Aging by Shop</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">0-30</TableHead>
                  <TableHead className="text-right">31-60</TableHead>
                  <TableHead className="text-right">61-90</TableHead>
                  <TableHead className="text-right">90+</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{d.shop?.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{d.company?.code}</Badge></TableCell>
                    <TableCell className="text-right text-sm font-bold">{formatCurrency(d.outstanding)}</TableCell>
                    <TableCell className="text-right text-xs text-emerald-600">{d.current > 0 ? formatCurrency(d.current) : '—'}</TableCell>
                    <TableCell className="text-right text-xs text-amber-600">{d.d30 > 0 ? formatCurrency(d.d30) : '—'}</TableCell>
                    <TableCell className="text-right text-xs text-orange-600">{d.d60 > 0 ? formatCurrency(d.d60) : '—'}</TableCell>
                    <TableCell className="text-right text-xs text-rose-600 font-semibold">{d.d90 > 0 ? formatCurrency(d.d90) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function RecoveryByBookerReport({ data }: { data: any }) {
  if (!data?.length) return <EmptyState icon={Zap} title="No recovery data" hint="Recoveries recorded via Quick Recovery will appear here, grouped by order booker." />
  const sorted = [...data]
  const totalCollected = sorted.reduce((s, b) => s + b.totalCollected, 0)
  const totalRecoveries = sorted.reduce((s, b) => s + b.recoveryCount, 0)
  const totalCash = sorted.reduce((s, b) => s + b.cash, 0)
  const totalCheque = sorted.reduce((s, b) => s + b.cheque, 0)
  const totalTransfer = sorted.reduce((s, b) => s + b.transfer + b.online, 0)
  const max = sorted[0]?.totalCollected || 1

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard title="Total Recovered" value={formatCurrency(totalCollected)} icon={Wallet} tone="emerald" />
        <StatCard title="Total Collections" value={totalRecoveries} icon={Zap} tone="sky" />
        <StatCard title="Cash" value={formatCurrency(totalCash)} icon={Wallet} tone="emerald" />
        <StatCard title="Cheque" value={formatCurrency(totalCheque)} icon={Wallet} tone="violet" />
        <StatCard title="Transfer/Online" value={formatCurrency(totalTransfer)} icon={Wallet} tone="amber" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Recovery Ranking by Booker</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[70vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Booker</TableHead>
                  <TableHead>Companies</TableHead>
                  <TableHead className="text-right">Collections</TableHead>
                  <TableHead className="text-right">Shops</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Cheque</TableHead>
                  <TableHead className="text-right">Transfer</TableHead>
                  <TableHead className="text-right">Avg/Recovery</TableHead>
                  <TableHead className="text-right">Total Collected</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((b, i) => (
                  <TableRow key={b.booker.id}>
                    <TableCell>
                      <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400'}`}>{i + 1}</span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{b.booker.name}</p>
                      <p className="text-[10px] text-muted-foreground">{b.booker.employeeCode}</p>
                    </TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{b.companies.map((c: string, i: number) => <Badge key={i} variant="outline" className="text-[9px]">{c}</Badge>)}</div></TableCell>
                    <TableCell className="text-right text-sm font-semibold">{b.recoveryCount}</TableCell>
                    <TableCell className="text-right text-xs">{b.shopsCovered}</TableCell>
                    <TableCell className="text-right text-xs text-emerald-600">{b.cash > 0 ? formatCurrency(b.cash) : '—'}</TableCell>
                    <TableCell className="text-right text-xs text-sky-600">{b.cheque > 0 ? formatCurrency(b.cheque) : '—'}</TableCell>
                    <TableCell className="text-right text-xs text-violet-600">{(b.transfer + b.online) > 0 ? formatCurrency(b.transfer + b.online) : '—'}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(b.avgPerRecovery)}</TableCell>
                    <TableCell className="text-right text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(b.totalCollected)}</TableCell>
                    <TableCell>
                      <div className="w-28">
                        <Progress value={(b.totalCollected / max) * 100} className="h-2" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="bg-zinc-50 dark:bg-zinc-900/50 font-bold">
                  <TableCell colSpan={3}>TOTAL ({sorted.length} bookers)</TableCell>
                  <TableCell className="text-right text-sm">{totalRecoveries}</TableCell>
                  <TableCell className="text-right text-xs">—</TableCell>
                  <TableCell className="text-right text-xs text-emerald-600">{formatCurrency(totalCash)}</TableCell>
                  <TableCell className="text-right text-xs text-sky-600">{formatCurrency(totalCheque)}</TableCell>
                  <TableCell className="text-right text-xs text-violet-600">{formatCurrency(totalTransfer)}</TableCell>
                  <TableCell className="text-right text-xs">—</TableCell>
                  <TableCell className="text-right text-sm text-emerald-700 dark:text-emerald-400">{formatCurrency(totalCollected)}</TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      <p className="text-[11px] text-muted-foreground text-center mt-2">
        💡 Recovery = cash/cheque/transfer collected from shops by order bookers. Ranked by total collected (highest first).
      </p>
    </div>
  )
}
