'use client'

import { useState } from 'react'
import {
  useOrders, useOrder, useUpdateOrderStatus, useCompanies, useSession,
} from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/erp-types'
import {
  Search, ClipboardList, Eye, AlertTriangle, CheckCircle2, XCircle,
  Package, Truck, CheckCheck, Loader2, FileText,
} from 'lucide-react'

const STATUS_FILTERS = ['PENDING', 'APPROVED', 'PICKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const

export function OrdersModule() {
  const { activeCompanyId } = useAppStore()
  const { toast } = useToast()
  const [status, setStatus] = useState<string>('ALL')
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [notes, setNotes] = useState('')

  const companyId = activeCompanyId === 'ALL' ? undefined : activeCompanyId
  const { data, isLoading } = useOrders({ companyId, status: status === 'ALL' ? undefined : status, q, limit: 200 })

  return (
    <div>
      <PageHeader title="Orders" subtitle="Manage order lifecycle: Pending → Approved → Picked → Dispatched → Delivered" />

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search order no. or shop name..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {STATUS_FILTERS.map((s) => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : data?.length ? (
            <ScrollArea className="max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((o: any) => (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50" onClick={() => { setSelectedId(o.id); setNotes(o.notes || '') }}>
                      <TableCell className="font-mono text-xs font-semibold">{o.orderNo}</TableCell>
                      <TableCell className="text-xs">{new Date(o.orderDate).toLocaleDateString('en-PK')}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{o.company?.code}</Badge></TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">{o.shop?.name}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatCurrency(o.grandTotal, o.currency)}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {o.creditLimitExceeded && <span title="Credit limit exceeded"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>}
                          {o.stockShortage && <span title="Stock shortage"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /></span>}
                          {!o.creditLimitExceeded && !o.stockShortage && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedId(o.id); setNotes(o.notes || '') }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <EmptyState icon={ClipboardList} title="No orders found" hint="Try changing filters or create a new order." />
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <OrderDetailSheet
        orderId={selectedId}
        onClose={() => setSelectedId('')}
        notes={notes}
        setNotes={setNotes}
        onToast={toast}
      />
    </div>
  )
}

function OrderDetailSheet({ orderId, onClose, notes, setNotes, onToast }: {
  orderId: string; onClose: () => void; notes: string; setNotes: (s: string) => void; onToast: any
}) {
  const { data: order, isLoading } = useOrder(orderId)
  const updateStatus = useUpdateOrderStatus()
  const { data: session } = useSession()
  const role = session?.role as string

  const nextActions = getActions(order?.status, role)

  async function handleStatusChange(newStatus: string) {
    try {
      await updateStatus.mutateAsync({ id: orderId, status: newStatus, notes })
      onToast({ title: 'Status updated', description: `Order moved to ${newStatus}` })
    } catch (e: any) {
      onToast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <Sheet open={!!orderId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {order && <StatusBadge status={order.status} />}
            <span className="font-mono">{order?.orderNo}</span>
          </SheetTitle>
          <SheetDescription>Order details and workflow</SheetDescription>
        </SheetHeader>

        {isLoading || !order ? (
          <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Date" value={new Date(order.orderDate).toLocaleString('en-PK')} />
              <Info label="Company" value={`${order.company?.code} · ${order.company?.name}`} />
              <Info label="Shop" value={order.shop?.name} />
              <Info label="Shop Tax Type" value={order.shop?.taxType} />
              <Info label="Booker" value={order.booker?.name || 'Direct'} />
              <Info label="Currency" value={`${order.currency} @ ${order.currencyRate}`} />
              <Info label="Created By" value={order.createdBy?.name} />
              {order.approvedBy && <Info label="Approved By" value={order.approvedBy?.name} />}
              {order.invoice && <Info label="Invoice" value={order.invoice.invoiceNo} />}
            </div>

            {/* Warnings */}
            {order.warnings && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4" /> Warnings
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5 list-disc list-inside">
                  {JSON.parse(order.warnings).map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {/* Items */}
            <div>
              <p className="text-sm font-semibold mb-2">Items ({order.items?.length})</p>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Disc%</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items?.map((it: any) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <p className="text-xs font-medium">{it.product?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{it.product?.code} · {it.product?.unit}</p>
                        </TableCell>
                        <TableCell className="text-right text-xs">{it.quantity}</TableCell>
                        <TableCell className="text-right text-xs">{it.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs">{it.discountPct}%</TableCell>
                        <TableCell className="text-right text-xs">{it.taxAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{it.lineTotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-900/50 p-3 space-y-1 text-xs">
              <Row label="Subtotal" value={order.subtotal} />
              <Row label="Scheme Discount" value={-order.schemeDiscount} />
              <Row label="Manual Discount" value={-order.manualDiscount} />
              <Row label="Taxable Amount" value={order.taxableAmount} bold />
              <Row label={`Sales Tax`} value={order.salesTax} />
              {order.furtherTax > 0 && <Row label="Further Tax (Non-Filer)" value={order.furtherTax} />}
              <Row label={`Withholding Tax`} value={order.withholdingTax} />
              <div className="border-t pt-1 mt-1">
                <Row label="GRAND TOTAL" value={order.grandTotal} bold large />
              </div>
              {order.previousBalance > 0 && (
                <>
                  <div className="border-t pt-1 mt-1" style={{ color: '#b45309' }}>
                    <Row label="Previous Balance" value={order.previousBalance} bold />
                  </div>
                  <div className="rounded bg-amber-500 text-white px-2 py-1 mt-1">
                    <Row label="TOTAL PAYABLE" value={order.totalPayable} bold large />
                  </div>
                </>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." className="text-xs" rows={2} />
            </div>

            {/* Actions */}
            {nextActions.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {nextActions.map((a) => (
                  <Button
                    key={a.status}
                    size="sm"
                    variant={a.variant}
                    onClick={() => handleStatusChange(a.status)}
                    disabled={updateStatus.isPending}
                    className={a.className}
                  >
                    {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <a.icon className="w-4 h-4 mr-1" />}
                    {a.label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No further actions available</p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  )
}
function Row({ label, value, bold, large }: { label: string; value: number; bold?: boolean; large?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? 'font-semibold' : ''}>{label}</span>
      <span className={`${bold ? 'font-bold' : ''} ${large ? 'text-base' : ''}`}>{value.toFixed(2)}</span>
    </div>
  )
}

function getActions(status: string | undefined, role: string) {
  if (!status) return []
  const canApprove = ['SUPER_ADMIN', 'COMPANY_MANAGER'].includes(role)
  const canWarehouse = ['SUPER_ADMIN', 'COMPANY_MANAGER', 'WAREHOUSE'].includes(role)
  const actions: { status: string; label: string; icon: any; variant: any; className?: string }[] = []

  if (status === 'PENDING') {
    if (canApprove) actions.push({ status: 'APPROVED', label: 'Approve', icon: CheckCircle2, variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-700' })
    if (canApprove) actions.push({ status: 'CANCELLED', label: 'Cancel', icon: XCircle, variant: 'destructive' })
  } else if (status === 'APPROVED') {
    if (canWarehouse) actions.push({ status: 'PICKED', label: 'Mark Picked', icon: Package, variant: 'default', className: 'bg-sky-600 hover:bg-sky-700' })
    if (canApprove) actions.push({ status: 'CANCELLED', label: 'Cancel', icon: XCircle, variant: 'destructive' })
  } else if (status === 'PICKED') {
    if (canWarehouse) actions.push({ status: 'DISPATCHED', label: 'Mark Dispatched', icon: Truck, variant: 'default', className: 'bg-violet-600 hover:bg-violet-700' })
  } else if (status === 'DISPATCHED') {
    if (canApprove) actions.push({ status: 'DELIVERED', label: 'Mark Delivered', icon: CheckCheck, variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-700' })
  }
  return actions
}
