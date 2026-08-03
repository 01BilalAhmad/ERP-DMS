'use client'

import { useState } from 'react'
import { usePurchaseInvoices, useCreatePurchaseInvoice, useCompanies, useProducts } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/erp-types'
import {
  PackagePlus, Plus, Loader2, Search, Trash2, Eye, Truck, Package,
} from 'lucide-react'

interface PurchaseItem {
  productId: string
  quantity: string
  unitPrice: string
}

export function PurchaseInvoicesModule() {
  const { activeCompanyId } = useAppStore()
  const companyId = activeCompanyId === 'ALL' ? undefined : activeCompanyId
  const { data, isLoading } = usePurchaseInvoices(companyId)
  const [showDialog, setShowDialog] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  const list = data || []
  const totalValue = list.reduce((s: number, p: any) => s + p.grandTotal, 0)

  return (
    <div>
      <PageHeader
        title="Purchase Invoices"
        subtitle="Record supplier purchases — stock auto-adds to warehouse"
        actions={
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Purchase
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard title="Total Purchases" value={list.length} icon={PackagePlus} tone="emerald" loading={isLoading} />
        <StatCard title="Total Value" value={formatCurrency(totalValue)} icon={Package} tone="sky" loading={isLoading} />
        <StatCard title="Suppliers" value={new Set(list.map((p: any) => p.supplierName)).size} icon={Truck} tone="violet" loading={isLoading} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : list.length === 0 ? (
            <EmptyState icon={PackagePlus} title="No purchase invoices yet" hint="Create a purchase invoice to add stock from suppliers into the warehouse." />
          ) : (
            <ScrollArea className="max-h-[65vh] mobile-table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">{p.invoiceNo}</TableCell>
                      <TableCell className="text-xs">{new Date(p.invoiceDate).toLocaleDateString('en-PK')}</TableCell>
                      <TableCell className="text-sm font-medium">{p.supplierName}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{p.company?.code}</Badge></TableCell>
                      <TableCell className="text-right text-xs">{p.items?.length || 0}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(p.grandTotal, p.currency)}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(p)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <PurchaseDialog open={showDialog} onClose={() => setShowDialog(false)} />
      <DetailDialog item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function PurchaseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeCompanyId } = useAppStore()
  const { data: companies } = useCompanies()
  const [companyId, setCompanyId] = useState(activeCompanyId === 'ALL' ? '' : activeCompanyId)
  const [supplierName, setSupplierName] = useState('')
  const [supplierNtn, setSupplierNtn] = useState('')
  const [taxAmount, setTaxAmount] = useState('')
  const [otherCharges, setOtherCharges] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([{ productId: '', quantity: '1', unitPrice: '' }])
  const [productSearch, setProductSearch] = useState('')
  const createMut = useCreatePurchaseInvoice()
  const { toast } = useToast()

  const { data: products } = useProducts({ companyId })

  const filteredProducts = productSearch
    ? (products || []).filter((p: any) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase()))
    : (products || [])

  function addItem() {
    setItems([...items, { productId: '', quantity: '1', unitPrice: '' }])
  }
  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }
  function updateItem(idx: number, field: keyof PurchaseItem, value: string) {
    const next = [...items]
    next[idx] = { ...next[idx], [field]: value }
    if (field === 'productId') {
      const p = (products || []).find((x: any) => x.id === value)
      if (p) next[idx].unitPrice = String(p.costPrice || p.tradePrice || 0)
    }
    setItems(next)
  }

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0)
  const grandTotal = subtotal + Number(taxAmount || 0) + Number(otherCharges || 0)

  async function submit() {
    if (!companyId || !supplierName) {
      toast({ title: 'Missing fields', description: 'Company and supplier name required', variant: 'destructive' })
      return
    }
    const validItems = items.filter((it) => it.productId && Number(it.quantity) > 0)
    if (validItems.length === 0) {
      toast({ title: 'No items', description: 'Add at least one product with quantity', variant: 'destructive' })
      return
    }
    try {
      const res = await createMut.mutateAsync({
        companyId,
        supplierName,
        supplierNtn,
        taxAmount: Number(taxAmount || 0),
        otherCharges: Number(otherCharges || 0),
        notes,
        items: validItems.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
      })
      toast({ title: '✓ Purchase invoice created', description: `${res.invoiceNo} — stock added to warehouse` })
      onClose()
      setSupplierName(''); setSupplierNtn(''); setTaxAmount(''); setOtherCharges(''); setNotes('')
      setItems([{ productId: '', quantity: '1', unitPrice: '' }])
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackagePlus className="w-5 h-5 text-emerald-600" /> New Purchase Invoice</DialogTitle>
          <DialogDescription>Record a purchase from a supplier. Stock automatically adds to warehouse.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 flex-1 overflow-y-auto">
          {/* Supplier info */}
          <div className="grid grid-cols-2 gap-2">
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
              <Label className="text-xs">Supplier Name *</Label>
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="e.g. Unilever Pakistan" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Supplier NTN</Label>
              <Input value={supplierNtn} onChange={(e) => setSupplierNtn(e.target.value)} placeholder="NTN" />
            </div>
            <div>
              <Label className="text-xs">Tax Amount</Label>
              <Input type="number" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Other Charges</Label>
              <Input type="number" value={otherCharges} onChange={(e) => setOtherCharges(e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Product search */}
          {companyId && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search products to add…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          )}

          {/* Items table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Product</TableHead>
                  <TableHead className="text-[10px] text-right w-16">Qty</TableHead>
                  <TableHead className="text-[10px] text-right w-20">Price</TableHead>
                  <TableHead className="text-[10px] text-right w-20">Total</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Select value={it.productId} onValueChange={(v) => updateItem(idx, 'productId', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>
                          {filteredProducts.slice(0, 30).map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.code} · {p.name} ({formatCurrency(p.tradePrice)})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="h-8 text-xs text-right w-16" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="0" value={it.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} className="h-8 text-xs text-right w-20" />
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-rose-500 hover:bg-rose-50 rounded p-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button variant="outline" size="sm" onClick={addItem} className="w-full">
            <Plus className="w-3 h-3 mr-1" /> Add Row
          </Button>

          {/* Totals */}
          <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-900/50 p-3 space-y-1 text-xs">
            <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span className="tabular-nums">{Number(taxAmount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Other Charges</span><span className="tabular-nums">{Number(otherCharges || 0).toFixed(2)}</span></div>
            <div className="border-t pt-1 flex justify-between font-bold text-sm"><span>Grand Total</span><span className="tabular-nums text-emerald-700 dark:text-emerald-400">{grandTotal.toFixed(2)}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMut.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Create & Add Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailDialog({ item, onClose }: { item: any; onClose: () => void }) {
  if (!item) return null
  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-600" />
            <span className="font-mono">{item.invoiceNo}</span>
            <StatusBadge status={item.status} />
          </DialogTitle>
          <DialogDescription>Purchase invoice detail</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><p className="text-[10px] uppercase text-muted-foreground">Supplier</p><p className="font-medium">{item.supplierName}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Date</p><p>{new Date(item.invoiceDate).toLocaleDateString('en-PK')}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Company</p><p className="font-medium">{item.company?.name}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">NTN</p><p>{item.supplierNtn || '—'}</p></div>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Product</TableHead>
                  <TableHead className="text-[10px] text-right">Qty</TableHead>
                  <TableHead className="text-[10px] text-right">Price</TableHead>
                  <TableHead className="text-[10px] text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.items?.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-xs py-1">{it.product?.name}</TableCell>
                    <TableCell className="text-xs text-right py-1">{it.quantity}</TableCell>
                    <TableCell className="text-xs text-right py-1">{it.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right py-1 font-semibold">{it.lineTotal.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center justify-between">
            <span className="text-sm font-medium">Grand Total</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(item.grandTotal, item.currency)}</span>
          </div>
          {item.notes && <p className="text-xs text-muted-foreground">Notes: {item.notes}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
