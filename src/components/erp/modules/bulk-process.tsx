'use client'

import { useState } from 'react'
import { useOrders, useOrder, useUpdateOrderItems, useAddOrderItem, useDeleteOrderItem, useDeleteOrder, useCreateBatch, useBookers, useProducts, useSession } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/erp-types'
import { Layers, Edit3, Trash2, Plus, CheckSquare, Loader2, ShoppingCart, Store, FileText, CheckCircle2 } from 'lucide-react'

export function BulkProcessModule() {
  const { activeCompanyId } = useAppStore()
  const { data: session } = useSession()
  const isBooker = session?.role === 'ORDER_BOOKER'
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingOrderId, setEditingOrderId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [bookerFilter, setBookerFilter] = useState<string>('ALL')
  const createBatchMut = useCreateBatch()
  const { data: bookers } = useBookers()
  const { toast } = useToast()

  const companyId = activeCompanyId === 'ALL' ? undefined : activeCompanyId
  const bookerIdParam = isBooker ? (session?.booker?.id as string) : (bookerFilter !== 'ALL' ? bookerFilter : undefined)
  const { data, isLoading } = useOrders({ companyId, status: 'PENDING', bookerId: bookerIdParam, limit: 500 })

  const pending = (data || []).filter((o: any) =>
    !search || o.orderNo?.toLowerCase().includes(search.toLowerCase()) || o.shop?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalAmount = pending.reduce((s: number, o: any) => s + o.grandTotal, 0)
  const totalShops = new Set(pending.map((o: any) => o.shopId)).size
  const allSelected = pending.length > 0 && selectedIds.size === pending.length

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next)
  }
  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(pending.map((o: any) => o.id)))
  }

  async function processSelected() {
    if (selectedIds.size === 0) { toast({ title: 'No orders selected', variant: 'destructive' }); return }
    if (!companyId && !isBooker) { toast({ title: 'Select a company', variant: 'destructive' }); return }
    try {
      const res = await createBatchMut.mutateAsync({ companyId: companyId || (session?.booker?.companyIds?.[0] as string), orderIds: Array.from(selectedIds), notes: `Bulk processed ${selectedIds.size} orders` })
      toast({ title: '✓ Batch created', description: `${res.batchNo} — ${res.totalOrders} orders processed. LoadForm + PickList auto-generated.` })
      setSelectedIds(new Set())
      useAppStore.setState({ activeModule: 'batches' })
    } catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }) }
  }

  return (
    <div>
      <PageHeader title="Bulk Process Orders" subtitle="Pending orders queued for processing — select and create a batch"
        actions={<div className="flex items-center gap-2 flex-wrap">
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-[150px] h-9" />
          {!isBooker && (
            <Select value={bookerFilter} onValueChange={setBookerFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All Bookers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Bookers</SelectItem>
                {(bookers || []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.employeeCode} · {b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={processSelected} disabled={selectedIds.size === 0 || createBatchMut.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {createBatchMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Layers className="w-4 h-4 mr-1" />}
            Process ({selectedIds.size})
          </Button>
        </div>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard title="Pending Orders" value={pending.length} icon={ShoppingCart} tone="amber" loading={isLoading} />
        <StatCard title="Shops Involved" value={totalShops} icon={Store} tone="emerald" loading={isLoading} />
        <StatCard title="Total Value" value={formatCurrency(totalAmount)} icon={FileText} tone="sky" loading={isLoading} />
        <StatCard title="Selected" value={selectedIds.size} icon={CheckSquare} tone="violet" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : pending.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No pending orders" hint="Orders booked via New Order will appear here for bulk processing." />
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3 p-2 rounded-lg border bg-zinc-50 dark:bg-zinc-900/50">
            <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
            <span className="text-xs font-medium text-muted-foreground">{allSelected ? `All ${pending.length} selected` : `Select all ${pending.length} orders`}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pending.map((o: any) => {
              const selected = selectedIds.has(o.id)
              return (
                <Card key={o.id} className={`cursor-pointer transition-all hover:shadow-md ${selected ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-zinc-200 dark:border-zinc-800'}`} onClick={() => toggleSelect(o.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox checked={selected} />
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 truncate">{o.orderNo}</p>
                          <p className="text-sm font-medium truncate">{o.shop?.name}</p>
                        </div>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div><p className="text-muted-foreground text-[10px] uppercase">Company</p><Badge variant="outline" className="text-[9px]">{o.company?.code}</Badge></div>
                      <div><p className="text-muted-foreground text-[10px] uppercase">Items</p><p className="text-sm font-semibold">{o.items?.length || 0}</p></div>
                    </div>
                    <div className="mt-3 pt-2 border-t flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{new Date(o.orderDate).toLocaleDateString('en-PK')}</span>
                      <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(o.totalPayable || o.grandTotal, o.currency)}</span>
                    </div>
                    {o.booker && <p className="text-[10px] text-muted-foreground mt-1">Booker: {o.booker.name}</p>}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
      <OrderEditSheet orderId={editingOrderId} onClose={() => setEditingOrderId('')} />
    </div>
  )
}

function OrderEditSheet({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { data: order, isLoading } = useOrder(orderId)
  const { toast } = useToast()
  if (!orderId) return null
  return (
    <Sheet open={!!orderId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{order?.orderNo || 'Loading...'}</SheetTitle>
          <SheetDescription>Order details</SheetDescription>
        </SheetHeader>
        {isLoading ? <Skeleton className="h-64 w-full" /> : order ? (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-[10px] uppercase text-muted-foreground">Shop</p><p className="font-medium">{order.shop?.name}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Company</p><p className="font-medium">{order.company?.name}</p></div>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead className="text-[10px]">Product</TableHead><TableHead className="text-[10px] text-right">Qty</TableHead><TableHead className="text-[10px] text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {order.items?.map((it: any) => (
                    <TableRow key={it.id}><TableCell className="text-xs">{it.product?.name}</TableCell><TableCell className="text-xs text-right">{it.quantity}</TableCell><TableCell className="text-xs text-right">{it.lineTotal.toFixed(2)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="rounded-lg border bg-zinc-50 p-3 text-xs space-y-1">
              <div className="flex justify-between"><span>Grand Total</span><span className="font-bold">{order.grandTotal.toFixed(2)}</span></div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
