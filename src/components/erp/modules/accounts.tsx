'use client'

import { useState } from 'react'
import { useLedger, useCompanies } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatCard, EmptyState } from '@/components/erp/ui-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from '@/lib/erp-types'
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, BookOpen } from 'lucide-react'

export function AccountsModule() {
  const { activeCompanyId } = useAppStore()
  const [companyId, setCompanyId] = useState(activeCompanyId === 'ALL' ? 'ALL' : activeCompanyId)
  const { data: companies } = useCompanies()
  const { data, isLoading } = useLedger(companyId !== 'ALL' ? companyId : undefined)

  const entries = data?.entries || []
  const balances = data?.balances || []

  const totalOutstanding = balances.reduce((s: number, b: any) => s + (b.outstandingBalance || 0), 0)
  const totalDebit = entries.filter((e: any) => e.entryType === 'DEBIT').reduce((s: number, e: any) => s + e.amount, 0)
  const totalCredit = entries.filter((e: any) => e.entryType === 'CREDIT').reduce((s: number, e: any) => s + e.amount, 0)

  return (
    <div>
      <PageHeader
        title="Customer Ledger"
        subtitle="Per-company ledger with outstanding balances and aging"
        actions={
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Companies" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Companies</SelectItem>
              {companies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard title="Total Outstanding" value={formatCurrency(totalOutstanding)} icon={Wallet} tone="amber" />
        <StatCard title="Total Invoiced (Debit)" value={formatCurrency(totalDebit)} icon={TrendingUp} tone="rose" />
        <StatCard title="Total Collected (Credit)" value={formatCurrency(totalCredit)} icon={TrendingDown} tone="emerald" />
      </div>

      {/* Outstanding by shop */}
      {balances.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <p className="font-semibold text-sm">Outstanding by Shop</p>
              <p className="text-xs text-muted-foreground">Shops with outstanding balance</p>
            </div>
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead>Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((b: any) => {
                    const util = b.creditLimit > 0 ? (b.outstandingBalance / b.creditLimit) * 100 : 0
                    const color = util > 100 ? 'bg-rose-500' : util > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="text-sm font-medium">{b.shop?.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{b.company?.code}</Badge></TableCell>
                        <TableCell className="text-right text-xs">{b.creditLimit > 0 ? formatCurrency(b.creditLimit) : 'Unlimited'}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{formatCurrency(b.outstandingBalance)}</TableCell>
                        <TableCell className="text-right text-xs">{b.creditLimit > 0 ? formatCurrency(Math.max(0, b.creditLimit - b.outstandingBalance)) : '—'}</TableCell>
                        <TableCell>
                          {b.creditLimit > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden min-w-[80px]">
                                <div className={`h-full ${color}`} style={{ width: `${Math.min(100, util)}%` }} />
                              </div>
                              <span className="text-[10px] font-semibold w-10">{util.toFixed(0)}%</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">N/A</span>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Ledger entries */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <p className="font-semibold text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-600" /> Ledger Entries</p>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : entries.length ? (
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{new Date(e.date).toLocaleDateString('en-PK')}</TableCell>
                      <TableCell className="text-xs">{e.shop?.name}</TableCell>
                      <TableCell className="text-xs">{e.company?.code}</TableCell>
                      <TableCell>
                        <Badge variant={e.entryType === 'DEBIT' ? 'destructive' : 'default'} className="text-[10px]">
                          {e.entryType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{e.reference}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{e.description}</TableCell>
                      <TableCell className="text-right text-xs text-rose-600">{e.entryType === 'DEBIT' ? formatCurrency(e.amount) : '—'}</TableCell>
                      <TableCell className="text-right text-xs text-emerald-600">{e.entryType === 'CREDIT' ? formatCurrency(e.amount) : '—'}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{formatCurrency(e.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <EmptyState icon={Wallet} title="No ledger entries" hint="Ledger entries appear when invoices are generated or payments recorded." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
