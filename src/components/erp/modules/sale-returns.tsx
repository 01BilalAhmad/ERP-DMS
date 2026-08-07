'use client'

import { useState } from 'react'
import { useSaleReturns, useCreateSaleReturn, useInvoices, useAppStore } from '@/lib/api-hooks'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/erp-types'
import { RotateCcw, Plus, Loader2, Eye, Package, CheckCircle2 } from 'lucide-react'

export function SaleReturnsModule() {
  const { activeCompanyId } = useAppStore()
  const companyId = activeCompanyId === 'ALL' ? undefined : activeCompanyId
  const { data, isLoading } = useSaleReturns({ companyId })
  const [showDialog, setShowDialog] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const returns = data || []
  const totalReturned = returns.reduce((s: number, r: any) => s + r.totalAmount, 0)

  return (
    <div>
      <PageHeader title="Sale Returns" subtitle="Process returns — auto-credits shop ledger, restocks inventory"
        actions={<Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-1" /> New Return</Button>} />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard title="Total Returns" value={returns.length} icon={RotateCcw} tone="amber" loading={isLoading} />
        <StatCard title="Returned Amount" value={formatCurrency(totalReturned)} icon={Package} tone="rose" loading={isLoading} />
        <StatCard title="Processed" value={returns.filter((r: any) => r.status === 'PROCESSED').length} icon={CheckCircle2} tone="emerald" loading={isLoading} />
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        : returns.length === 0 ? <EmptyState icon={RotateCcw} title="No sale returns yet" hint="Create a return to reverse an invoice." />
        : <ScrollArea className="max-h-[65vh]"><Table>
          <TableHeader><TableRow>
            <TableHead>Return No.</TableHead><TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Shop</TableHead>
            <TableHead>Reason</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">View</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {returns.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">{r.returnNo}</TableCell>
                <TableCell className="text-xs">{new Date(r.returnDate).toLocaleDateString('en-PK')}</TableCell>
                <TableCell className="font-mono text-xs">{r.invoice?.invoiceNo}</TableCell>
                <TableCell className="text-sm">{r.shop?.name}</TableCell>
                <TableCell className="text-xs">{r.reason}</TableCell>
                <TableCell className="text-right text-sm font-semibold text-rose-600">{formatCurrency(r.totalAmount)}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(r)}><Eye className="w-3.5 h-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></ScrollArea>}
      </CardContent></Card>
      <ReturnDialog open={showDialog} onClose={() => setShowDialog(false)} />
      <DetailDialog item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function ReturnDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeCompanyId } = useAppStore()
  const { data: invoices } = useInvoices({ companyId: activeCompanyId === 'ALL' ? undefined : activeCompanyId })
  const [invoiceId, setInvoiceId] = useState('')
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<any[]>([])
  const createMut = useCreateSaleReturn()
  const { toast } = useToast()
  const selectedInvoice = (invoices || []).find((i: any) => i.id === invoiceId)
  const [lastInvoice, setLastInvoice] = useState('')
  if (invoiceId !== lastInvoice) {
    setLastInvoice(invoiceId)
    if (selectedInvoice) {
      fetch(`/api/orders/${selectedInvoice.orderId}`).then(r => r.json()).then((order) => {
        setItems(order.items?.map((it: any) => ({ productId: it.productId, name: it.product?.name, orderedQty: it.quantity, unitPrice: it.unitPrice, returnQty: 0 })) || [])
      })
    }
  }
  function updateReturnQty(idx: number, qty: number) { const n = [...items]; n[idx] = { ...n[idx], returnQty: Math.min(qty, n[idx].orderedQty) }; setItems(n) }
  const itemsToReturn = items.filter((it) => it.returnQty > 0)
  const totalReturn = itemsToReturn.reduce((s, it) => s + it.returnQty * it.unitPrice, 0)

  async function submit() {
    if (!invoiceId || !reason) { toast({ title: 'Missing fields', variant: 'destructive' }); return }
    if (itemsToReturn.length === 0) { toast({ title: 'No items', variant: 'destructive' }); return }
    try {
      await createMut.mutateAsync({ invoiceId, reason, items: itemsToReturn.map((it) => ({ productId: it.productId, quantity: it.returnQty, unitPrice: it.unitPrice })) })
      toast({ title: 'Return processed', description: `Returned ${formatCurrency(totalReturn)}` })
      onClose(); setInvoiceId(''); setReason(''); setItems([])
    } catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-amber-500" /> New Sale Return</DialogTitle><DialogDescription>Select invoice, choose items to return</DialogDescription></DialogHeader>
        <div className="space-y-3 flex-1 overflow-y-auto">
          <div><Label className="text-xs">Invoice *</Label><Select value={invoiceId} onValueChange={setInvoiceId}><SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger><SelectContent>{(invoices || []).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.invoiceNo} · {i.shop?.name} · {formatCurrency(i.grandTotal)}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Reason *</Label><Select value={reason} onValueChange={setReason}><SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger><SelectContent><SelectItem value="Damaged goods">Damaged goods</SelectItem><SelectItem value="Expired">Expired</SelectItem><SelectItem value="Wrong item delivered">Wrong item</SelectItem><SelectItem value="Excess quantity">Excess</SelectItem><SelectItem value="Shop refused">Refused</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
          {items.length > 0 && <div className="rounded-lg border overflow-hidden"><Table>
            <TableHeader><TableRow><TableHead className="text-[10px]">Product</TableHead><TableHead className="text-[10px] text-right">Ordered</TableHead><TableHead className="text-[10px] text-right">Price</TableHead><TableHead className="text-[10px] text-right">Return Qty</TableHead></TableRow></TableHeader>
            <TableBody>{items.map((it, idx) => (
              <TableRow key={idx}><TableCell className="text-xs">{it.name}</TableCell><TableCell className="text-xs text-right">{it.orderedQty}</TableCell><TableCell className="text-xs text-right">{it.unitPrice.toFixed(2)}</TableCell><TableCell><Input type="number" min={0} max={it.orderedQty} value={it.returnQty} onChange={(e) => updateReturnQty(idx, Number(e.target.value))} className="h-7 text-xs text-right w-20" /></TableCell></TableRow>
            ))}</TableBody>
          </Table></div>}
          {totalReturn > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 text-sm flex items-center justify-between"><span className="font-medium text-amber-800 dark:text-amber-300">Total Return Value</span><span className="text-lg font-bold text-amber-700">{formatCurrency(totalReturn)}</span></div>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={createMut.isPending} className="bg-amber-500 hover:bg-amber-600 text-white">{createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Process Return</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailDialog({ item, onClose }: { item: any; onClose: () => void }) {
  if (!item) return null
  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-amber-500" /><span className="font-mono">{item.returnNo}</span><StatusBadge status={item.status} /></DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><p className="text-[10px] uppercase text-muted-foreground">Invoice</p><p className="font-mono font-semibold">{item.invoice?.invoiceNo}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Shop</p><p className="font-medium">{item.shop?.name}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Date</p><p>{new Date(item.returnDate).toLocaleDateString('en-PK')}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Reason</p><p className="font-medium">{item.reason}</p></div>
          </div>
          <div className="rounded-lg border overflow-hidden"><Table>
            <TableHeader><TableRow><TableHead className="text-[10px]">Product</TableHead><TableHead className="text-[10px] text-right">Qty</TableHead><TableHead className="text-[10px] text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>{item.items?.map((it: any) => (<TableRow key={it.id}><TableCell className="text-xs">{it.product?.name}</TableCell><TableCell className="text-xs text-right">{it.quantity}</TableCell><TableCell className="text-xs text-right">{it.lineTotal.toFixed(2)}</TableCell></TableRow>))}</TableBody>
          </Table></div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 flex justify-between"><span className="text-sm font-medium">Total</span><span className="text-lg font-bold text-amber-700">{formatCurrency(item.totalAmount)}</span></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
