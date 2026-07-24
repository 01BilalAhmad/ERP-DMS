'use client'

import { useState } from 'react'
import {
  useBatches, useBatch, usePickList, useManifest,
  useCreateBatch, useUpdateBatchStatus, useCompanies, useSession,
} from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/erp-types'
import {
  Layers, Plus, Eye, ClipboardList, Package, Truck, CheckCheck, XCircle,
  Loader2, Boxes, MapPin, AlertTriangle, CheckCircle2, Printer, FileText,
} from 'lucide-react'

export function BatchesModule() {
  const { activeCompanyId } = useAppStore()
  const [status, setStatus] = useState('ALL')
  const [selectedId, setSelectedId] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)

  const companyId = activeCompanyId === 'ALL' ? undefined : activeCompanyId
  const { data, isLoading } = useBatches({ companyId, status })

  return (
    <div>
      <PageHeader
        title="Batches & Pick Lists"
        subtitle="Group multiple orders into a batch — approve / pick / dispatch / deliver in one action"
        actions={
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Batch
          </Button>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PICKED">Picked</SelectItem>
            <SelectItem value="DISPATCHED">Dispatched</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : data?.length ? (
            <ScrollArea className="max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                {data.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    className="text-left rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:border-emerald-400 hover:shadow-md transition-all bg-white dark:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">{b.batchNo}</p>
                        <p className="text-xs text-muted-foreground">{b.company?.code} · {b.company?.name}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mt-3">
                      <div>
                        <p className="text-lg font-bold">{b.totalOrders}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Orders</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{b.totalShops}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Shops</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{b.totalQuantity?.toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Units</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{new Date(b.batchDate).toLocaleDateString('en-PK')}</span>
                      <span className="text-sm font-bold text-emerald-700">{formatCurrency(b.grandTotal)}</span>
                    </div>
                    {b.booker && (
                      <p className="text-[10px] text-muted-foreground mt-1">Booker: {b.booker.name}</p>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <EmptyState
              icon={Layers}
              title="No batches yet"
              hint="Create a batch to group pending orders together. One batch = one pick list + one dispatch manifest."
            />
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateBatchDialog open={showCreate} onClose={() => setShowCreate(false)} />

      {/* Detail Sheet */}
      <BatchDetailSheet batchId={selectedId} onClose={() => setSelectedId('')} />
    </div>
  )
}

function CreateBatchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: companies } = useCompanies()
  const [companyId, setCompanyId] = useState('')
  const [notes, setNotes] = useState('')
  const createMut = useCreateBatch()
  const { toast } = useToast()

  async function submit() {
    if (!companyId) {
      toast({ title: 'Company required', variant: 'destructive' })
      return
    }
    try {
      const res = await createMut.mutateAsync({ companyId, notes })
      toast({
        title: 'Batch created',
        description: `${res.batchNo} — ${res.totalOrders} orders attached. You can now approve / pick / dispatch in one action.`,
      })
      onClose()
      setCompanyId(''); setNotes('')
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Order Batch</DialogTitle>
          <DialogDescription>
            All PENDING orders for the selected company will be automatically attached to this batch.
            You can then approve / pick / dispatch / deliver them together.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Company *</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Batch notes..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMut.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Create Batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BatchDetailSheet({ batchId, onClose }: { batchId: string; onClose: () => void }) {
  const [tab, setTab] = useState('orders')
  const { data: batch, isLoading } = useBatch(batchId)
  const updateMut = useUpdateBatchStatus()
  const { data: session } = useSession()
  const role = session?.role as string
  const [notes, setNotes] = useState('')
  const { toast } = useToast()

  async function handleBulkStatus(newStatus: string) {
    try {
      await updateMut.mutateAsync({ id: batchId, status: newStatus, notes })
      toast({
        title: 'Batch updated',
        description: `All orders in this batch moved to ${newStatus}`,
      })
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  const actions = getBatchActions(batch?.status, role)

  return (
    <Sheet open={!!batchId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {batch && <StatusBadge status={batch.status} />}
            <span className="font-mono">{batch?.batchNo}</span>
          </SheetTitle>
          <SheetDescription>Batch detail — manage all orders in one action</SheetDescription>
        </SheetHeader>

        {isLoading || !batch ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Batch summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold text-emerald-600">{batch.orders.length}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Orders</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold">{new Set(batch.orders.map((o: any) => o.shopId)).size}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Shops</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold">{batch.orders.reduce((s: number, o: any) => s + o.items.reduce((ss: number, i: any) => ss + i.quantity, 0), 0).toFixed(0)}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Units</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold">{formatCurrency(batch.orders.reduce((s: number, o: any) => s + o.grandTotal, 0))}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Total Value</p>
              </div>
            </div>

            {/* Bulk Actions */}
            {actions.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Bulk Actions — applies to all {batch.orders.length} orders
                </p>
                <div className="flex flex-wrap gap-2">
                  {actions.map((a) => (
                    <Button
                      key={a.status}
                      size="sm"
                      variant={a.variant}
                      onClick={() => handleBulkStatus(a.status)}
                      disabled={updateMut.isPending}
                      className={a.className}
                    >
                      {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <a.icon className="w-4 h-4 mr-1" />}
                      {a.label} All ({batch.orders.length})
                    </Button>
                  ))}
                </div>
                {batch.status === 'APPROVED' && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
                    💡 On "Mark Picked", switch to the Pick List tab to print the consolidated warehouse pick list.
                  </p>
                )}
              </div>
            )}

            {/* Tabs */}
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="orders" className="text-xs"><ClipboardList className="w-3.5 h-3.5 mr-1" /> Orders</TabsTrigger>
                <TabsTrigger value="picklist" className="text-xs"><Boxes className="w-3.5 h-3.5 mr-1" /> Pick List</TabsTrigger>
                <TabsTrigger value="manifest" className="text-xs"><Truck className="w-3.5 h-3.5 mr-1" /> Manifest</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-3">
                <OrdersTab batch={batch} />
              </TabsContent>
              <TabsContent value="picklist" className="mt-3">
                <PickListTab batchId={batchId} />
              </TabsContent>
              <TabsContent value="manifest" className="mt-3">
                <ManifestTab batchId={batchId} />
              </TabsContent>
            </Tabs>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add batch notes..." className="text-xs" rows={2} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function OrdersTab({ batch }: { batch: any }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <ScrollArea className="max-h-[50vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Booker</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batch.orders.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs font-semibold">{o.orderNo}</TableCell>
                <TableCell className="text-sm">{o.shop?.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{o.booker?.name || '—'}</TableCell>
                <TableCell className="text-right text-xs">{o.items.length}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{formatCurrency(o.grandTotal, o.currency)}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}

function PickListTab({ batchId }: { batchId: string }) {
  const { data, isLoading } = usePickList(batchId)
  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!data) return <EmptyState icon={Boxes} title="No pick list" />

  const pickList = data.pickList
  const shortages = pickList.filter((p: any) => p.shortage)

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard title="Products" value={data.batch.totalProducts} icon={Package} tone="emerald" />
        <StatCard title="Total Units" value={data.batch.totalUnits.toFixed(0)} icon={Boxes} tone="sky" />
        <StatCard title="Stock Value" value={formatCurrency(data.batch.totalValue)} icon={FileText} tone="amber" />
        <StatCard title="Shortages" value={shortages.length} icon={AlertTriangle} tone={shortages.length ? 'rose' : 'emerald'} />
      </div>

      {shortages.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-4 h-4" /> Stock Shortages ({shortages.length} products)
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Some products have insufficient stock. Orders will still be processed — adjust stock or inform the booker.
          </p>
        </div>
      )}

      {/* Pick List Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Boxes className="w-4 h-4 text-emerald-600" /> Consolidated Pick List
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[45vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">To Pick</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Shortage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pickList.map((p: any, i: number) => (
                  <TableRow key={p.product.id} className={p.shortage ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{p.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.product.code} · {p.product.unit} · {p.product.packSize}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-lg font-bold text-emerald-700">{p.totalQty.toFixed(0)}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">{p.product.unit}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs">{p.availableStock.toFixed(0)}</TableCell>
                    <TableCell className="text-right text-xs">
                      {p.shortage ? <span className="text-rose-600 font-semibold">-{p.shortageQty.toFixed(0)}</span> : <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.shortage ? 'destructive' : 'secondary'} className="text-[10px]">
                        {p.shortage ? 'Short' : 'OK'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      <p className="text-[11px] text-muted-foreground text-center">
        💡 This consolidated list shows the TOTAL quantity to pick across all {data.batch.totalOrders} orders in batch {data.batch.batchNo}. Pick once — distribute per shop using the Manifest tab.
      </p>
    </div>
  )
}

function ManifestTab({ batchId }: { batchId: string }) {
  const { data, isLoading } = useManifest(batchId)
  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!data) return <EmptyState icon={Truck} title="No manifest" />

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <StatCard title="Stops" value={data.batch.totalShops} icon={MapPin} tone="emerald" />
        <StatCard title="Orders" value={data.batch.totalOrders} icon={ClipboardList} tone="sky" />
        <StatCard title="Total Value" value={formatCurrency(data.batch.totalValue)} icon={FileText} tone="amber" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" /> Dispatch Manifest
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print Manifest
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[45vh]">
            <div className="divide-y">
              {data.stops.map((s: any) => (
                <div key={s.orderId} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold">
                        {s.sequence}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{s.shop.name}</p>
                        <p className="text-[10px] text-muted-foreground">{s.shop.code} · {s.shop.address || 'No address'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {s.shop.phone ? `📞 ${s.shop.phone} · ` : ''}
                          Class {s.shopClass} · {s.taxType}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-700">{formatCurrency(s.grandTotal)}</p>
                      <p className="text-[10px] text-muted-foreground">{s.orderNo}</p>
                    </div>
                  </div>
                  <div className="ml-9 rounded-lg border bg-zinc-50 dark:bg-zinc-900/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] h-7">Product</TableHead>
                          <TableHead className="text-[10px] h-7 text-right">Qty</TableHead>
                          <TableHead className="text-[10px] h-7 text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {s.items.map((it: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs py-1">
                              <p>{it.product.name}</p>
                              <p className="text-[9px] text-muted-foreground">{it.product.code}</p>
                            </TableCell>
                            <TableCell className="text-xs py-1 text-right font-semibold">{it.qty.toFixed(0)} {it.product.unit}</TableCell>
                            <TableCell className="text-xs py-1 text-right">{it.unitPrice.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <p className="text-[11px] text-muted-foreground text-center">
        💡 Shops are sorted by class (A → B → C) for optimal route sequence. Hand this manifest to the delivery rider.
      </p>
    </div>
  )
}

function getBatchActions(status: string | undefined, role: string) {
  if (!status) return []
  const canApprove = ['SUPER_ADMIN', 'COMPANY_MANAGER'].includes(role)
  const canWarehouse = ['SUPER_ADMIN', 'COMPANY_MANAGER', 'WAREHOUSE'].includes(role)
  const actions: { status: string; label: string; icon: any; variant: any; className?: string }[] = []

  if (status === 'OPEN') {
    if (canApprove) actions.push({ status: 'APPROVED', label: 'Approve', icon: CheckCircle2, variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-700' })
    if (canApprove) actions.push({ status: 'CANCELLED', label: 'Cancel Batch', icon: XCircle, variant: 'destructive' })
  } else if (status === 'APPROVED') {
    if (canWarehouse) actions.push({ status: 'PICKED', label: 'Mark Picked', icon: Package, variant: 'default', className: 'bg-sky-600 hover:bg-sky-700' })
  } else if (status === 'PICKED') {
    if (canWarehouse) actions.push({ status: 'DISPATCHED', label: 'Mark Dispatched', icon: Truck, variant: 'default', className: 'bg-violet-600 hover:bg-violet-700' })
  } else if (status === 'DISPATCHED') {
    if (canApprove) actions.push({ status: 'DELIVERED', label: 'Mark Delivered', icon: CheckCheck, variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-700' })
  } else if (status === 'DELIVERED') {
    if (canApprove) actions.push({ status: 'CLOSED', label: 'Close Batch', icon: CheckCheck, variant: 'default' })
  }
  return actions
}
