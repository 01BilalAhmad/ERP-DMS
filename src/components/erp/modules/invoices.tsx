'use client'

import { useState } from 'react'
import { useInvoices } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatusBadge, EmptyState, StatCard } from '@/components/erp/ui-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from '@/lib/erp-types'
import { useToast } from '@/hooks/use-toast'
import { Search, FileText, Eye, Printer, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react'

export function InvoicesModule() {
  const { activeCompanyId } = useAppStore()
  const [status, setStatus] = useState('ALL')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<any>(null)

  const companyId = activeCompanyId === 'ALL' ? undefined : activeCompanyId
  const { data, isLoading } = useInvoices({ companyId, status: status === 'ALL' ? undefined : status })

  const filtered = (data || []).filter((inv: any) =>
    !q || inv.invoiceNo?.toLowerCase().includes(q.toLowerCase()) || inv.shop?.name?.toLowerCase().includes(q.toLowerCase())
  )

  const total = filtered.reduce((s: number, i: any) => s + i.grandTotal, 0)
  const paid = filtered.reduce((s: number, i: any) => s + i.paidAmount, 0)
  const outstanding = total - paid

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Generated automatically when orders are marked Delivered" />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard title="Total Invoiced" value={formatCurrency(total)} icon={FileText} tone="emerald" />
        <StatCard title="Collected" value={formatCurrency(paid)} icon={CheckCircle2} tone="sky" />
        <StatCard title="Outstanding" value={formatCurrency(outstanding)} icon={AlertCircle} tone="amber" />
      </div>

      <Card className="mb-4">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search invoice no. or shop..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length ? (
            <ScrollArea className="max-h-[65vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv: any) => (
                    <TableRow key={inv.id} className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <TableCell className="font-mono text-xs font-semibold">{inv.invoiceNo}</TableCell>
                      <TableCell className="text-xs">{new Date(inv.invoiceDate).toLocaleDateString('en-PK')}</TableCell>
                      <TableCell className="text-xs">{inv.company?.code}</TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">{inv.shop?.name}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{formatCurrency(inv.grandTotal, inv.currency)}</TableCell>
                      <TableCell className="text-right text-xs text-emerald-600">{formatCurrency(inv.paidAmount, inv.currency)}</TableCell>
                      <TableCell className="text-right text-xs text-rose-600">{formatCurrency(inv.balance, inv.currency)}</TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(inv)}><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <EmptyState icon={FileText} title="No invoices" hint="Invoices are auto-generated when an order is delivered." />
          )}
        </CardContent>
      </Card>

      <InvoiceDetailSheet invoice={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function InvoiceDetailSheet({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  if (!invoice) return null
  const order = invoice.order
  return (
    <Sheet open={!!invoice} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" /> {invoice.invoiceNo}
            <StatusBadge status={invoice.status} />
          </SheetTitle>
          <SheetDescription>Tax invoice details</SheetDescription>
        </SheetHeader>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-[10px] uppercase text-muted-foreground">Invoice Date</p><p className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString('en-PK')}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Order No.</p><p className="font-mono text-xs font-semibold">{order?.orderNo}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Company</p><p className="font-medium">{invoice.company?.name}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Shop</p><p className="font-medium">{invoice.shop?.name}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Booker</p><p className="font-medium">{order?.booker?.name || '—'}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Currency</p><p className="font-medium">{invoice.currency} @ {invoice.currencyRate}</p></div>
          </div>

          {order?.items && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {order.items.map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell className="text-xs">{it.product?.name}</TableCell>
                      <TableCell className="text-right text-xs">{it.quantity} {it.product?.unit}</TableCell>
                      <TableCell className="text-right text-xs">{it.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{it.lineTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-900/50 p-3 space-y-1 text-xs">
            <div className="flex justify-between"><span>Subtotal</span><span>{invoice.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-{invoice.totalDiscount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Sales Tax</span><span>{invoice.salesTax.toFixed(2)}</span></div>
            {invoice.furtherTax > 0 && <div className="flex justify-between"><span>Further Tax</span><span>{invoice.furtherTax.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span>Withholding Tax</span><span>{invoice.withholdingTax.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-1 mt-1 font-bold text-sm"><span>Grand Total</span><span>{invoice.grandTotal.toFixed(2)} {invoice.currency}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{invoice.paidAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-rose-600 font-semibold"><span>Balance Due</span><span>{invoice.balance.toFixed(2)}</span></div>
          </div>

          <Button variant="outline" className="w-full" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print Invoice
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
