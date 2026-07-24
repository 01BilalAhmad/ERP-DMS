'use client'

import { useEffect, useMemo, useState } from 'react'
import { useWarehouse, useAdjustStock } from '@/lib/api-hooks'
import { PageHeader, StatCard, EmptyState } from '@/components/erp/ui-helpers'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/erp-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Warehouse as WarehouseIcon, Package, Boxes, AlertTriangle, CalendarClock,
  ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Undo2, MapPin, Layers, TrendingDown,
} from 'lucide-react'

type AdjustmentType = 'IN' | 'OUT' | 'ADJUST' | 'RETURN'

interface StockItem {
  id: string
  quantity: number
  batchNo?: string | null
  expiryDate?: string | null
  product: {
    id: string
    name: string
    code: string
    unit: string
    tradePrice: number
  }
}

interface Section {
  id: string
  name: string
  code: string
  status?: string
  company: { id: string; code: string; name: string }
  stocks: StockItem[]
  _count?: { stocks?: number; movements?: number }
}

interface WarehouseData {
  id?: string
  name?: string
  address?: string | null
  status?: string
  sections?: Section[]
}

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const ms = d.getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function expiryTone(days: number | null): { cls: string; label: string } | null {
  if (days == null) return null
  if (days < 0) return { cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', label: 'Expired' }
  if (days <= 30) return { cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', label: `Expires in ${days}d` }
  if (days <= 90) return { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', label: `Expires in ${days}d` }
  return null
}

function stockTone(qty: number): { cls: string; label: string } {
  if (qty <= 0) return { cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', label: 'Out' }
  if (qty <= 5) return { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', label: 'Low' }
  return { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', label: 'OK' }
}

export function WarehouseModule() {
  const { toast } = useToast()
  const { data, isLoading } = useWarehouse()
  const adjustStock = useAdjustStock()

  const warehouse: WarehouseData = data || {}
  const sections: Section[] = warehouse.sections || []

  const [userPickedTab, setUserPickedTab] = useState<string>('')

  // Resolve active tab during render: picked tab if it still exists, otherwise first section.
  const activeTab =
    (userPickedTab && sections.find((s) => s.id === userPickedTab)?.id) ||
    sections[0]?.id ||
    ''

  // Adjust dialog
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustStockItem, setAdjustStockItem] = useState<{ section: Section; stock?: StockItem; product?: StockItem['product'] } | null>(null)
  const [adjustType, setAdjustType] = useState<AdjustmentType>('IN')
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')

  const openAdjust = (section: Section, stock?: StockItem) => {
    setAdjustStockItem({ section, stock, product: stock?.product })
    // Sensible defaults
    setAdjustType('IN')
    setAdjustQty('')
    setAdjustNotes('')
    setAdjustOpen(true)
  }

  const submitAdjust = async () => {
    if (!adjustStockItem) return
    const product = adjustStockItem.product
    if (!product) {
      toast({ title: 'No product selected', variant: 'destructive' })
      return
    }
    const qtyNum = Number(adjustQty)
    if (!adjustQty || isNaN(qtyNum) || qtyNum === 0) {
      toast({ title: 'Enter a non-zero quantity', variant: 'destructive' })
      return
    }
    // Convert to DELTA based on type
    let delta = qtyNum
    if (adjustType === 'OUT') delta = -Math.abs(qtyNum)
    else if (adjustType === 'RETURN') delta = -Math.abs(qtyNum) // return TO supplier = remove from stock
    else if (adjustType === 'IN') delta = Math.abs(qtyNum)
    else delta = qtyNum // ADJUST allows direct +/-

    const current = adjustStockItem.stock?.quantity ?? 0
    if (current + delta < 0) {
      toast({
        title: 'Insufficient stock',
        description: `Current: ${current}, attempted delta: ${delta}. Result cannot be negative.`,
        variant: 'destructive',
      })
      return
    }

    try {
      await adjustStock.mutateAsync({
        sectionId: adjustStockItem.section.id,
        productId: product.id,
        quantity: delta,
        type: adjustType,
        notes: adjustNotes.trim() || undefined,
      })
      toast({
        title: 'Stock adjusted',
        description: `${product.code} · ${delta > 0 ? '+' : ''}${delta} units (new balance: ${current + delta})`,
      })
      setAdjustOpen(false)
    } catch (e: any) {
      toast({ title: 'Adjustment failed', description: e?.message || 'Unknown error', variant: 'destructive' })
    }
  }

  // Aggregate stats per section
  const sectionStats = useMemo(() => {
    return sections.map((s) => {
      const items = s.stocks || []
      const totalQty = items.reduce((sum, st) => sum + st.quantity, 0)
      const totalValue = items.reduce((sum, st) => sum + st.quantity * (st.product?.tradePrice || 0), 0)
      const lowStock = items.filter((st) => st.quantity > 0 && st.quantity <= 5).length
      const outOfStock = items.filter((st) => st.quantity <= 0).length
      const expiringSoon = items.filter((st) => {
        const d = daysUntil(st.expiryDate)
        return d != null && d >= 0 && d <= 30
      }).length
      return { section: s, items, totalQty, totalValue, lowStock, outOfStock, expiringSoon }
    })
  }, [sections])

  const grandTotal = sectionStats.reduce((acc, s) => ({
    qty: acc.qty + s.totalQty,
    value: acc.value + s.totalValue,
    low: acc.low + s.lowStock,
    out: acc.out + s.outOfStock,
  }), { qty: 0, value: 0, low: 0, out: 0 })

  const currentSection = sections.find((s) => s.id === activeTab)
  const currentStats = sectionStats.find((s) => s.section.id === activeTab)

  return (
    <div>
      <PageHeader
        title="Warehouse & Stock"
        subtitle="Single warehouse with company-wise sections. Adjust stock per product below."
      />

      {/* Warehouse info card */}
      <Card className="mb-5 border-emerald-200/60 dark:border-emerald-900/40">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <WarehouseIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Warehouse</p>
            <p className="text-base font-semibold leading-tight">{warehouse.name || 'Main Warehouse'}</p>
            {warehouse.address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {warehouse.address}
              </p>
            )}
          </div>
          <div className="sm:ml-auto flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900">
              <Boxes className="w-3 h-3 mr-1" /> {sections.length} sections
            </Badge>
            <Badge variant="outline" className="font-mono">
              <Package className="w-3 h-3 mr-1" /> {grandTotal.qty.toLocaleString()} units
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <StatCard title="Total Stock Value" value={formatCurrency(grandTotal.value, 'PKR')} icon={Layers} tone="emerald" loading={isLoading} hint="Across all sections" />
        <StatCard title="Total Units" value={grandTotal.qty.toLocaleString()} icon={Package} tone="sky" loading={isLoading} hint="Sum of all stock" />
        <StatCard title="Low Stock Items" value={grandTotal.low} icon={AlertTriangle} tone="amber" loading={isLoading} hint="≤ 5 units" />
        <StatCard title="Out of Stock" value={grandTotal.out} icon={TrendingDown} tone="rose" loading={isLoading} hint="0 units" />
      </div>

      {/* Sections */}
      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </CardContent>
        </Card>
      ) : sections.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={WarehouseIcon} title="No warehouse sections found" hint="Seed data should create one section per company. Contact your administrator." />
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setUserPickedTab} className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-emerald-50/60 dark:bg-emerald-950/30 h-auto flex w-max gap-1 p-1">
              {sections.map((s) => {
                const stat = sectionStats.find((x) => x.section.id === s.id)
                return (
                  <TabsTrigger
                    key={s.id}
                    value={s.id}
                    className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5 px-3 py-1.5"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground data-[state=active]:text-emerald-100">{s.company.code}</span>
                    <span className="hidden sm:inline">{s.company.name}</span>
                    {stat && stat.low + stat.out > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                        {stat.low + stat.out}
                      </span>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {sectionStats.map(({ section, items, totalQty, totalValue, lowStock, outOfStock, expiringSoon }) => (
            <TabsContent key={section.id} value={section.id} className="mt-3 space-y-4">
              {/* Section header */}
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">{section.code}</span>
                        {section.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Company: <span className="font-medium text-emerald-700 dark:text-emerald-300">{section.company.code} · {section.company.name}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline"><Package className="w-3 h-3 mr-1" /> {items.length} SKUs</Badge>
                      <Badge variant="outline" className="font-mono"><Layers className="w-3 h-3 mr-1" /> {totalQty.toLocaleString()} units</Badge>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900">
                        {formatCurrency(totalValue, 'PKR')}
                      </Badge>
                      {lowStock > 0 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900">
                          <AlertTriangle className="w-3 h-3 mr-1" /> {lowStock} low
                        </Badge>
                      )}
                      {expiringSoon > 0 && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900">
                          <CalendarClock className="w-3 h-3 mr-1" /> {expiringSoon} expiring
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Stock table */}
              <Card>
                <CardContent className="p-0">
                  {items.length === 0 ? (
                    <EmptyState icon={Package} title="No stock in this section" hint="Add stock via product opening stock or use Adjust Stock after adding a product to the catalog." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Code</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="hidden sm:table-cell">Unit</TableHead>
                          <TableHead className="hidden md:table-cell">Batch</TableHead>
                          <TableHead className="hidden md:table-cell">Expiry</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((st) => {
                          const tone = stockTone(st.quantity)
                          const days = daysUntil(st.expiryDate)
                          const exp = expiryTone(days)
                          const value = st.quantity * (st.product?.tradePrice || 0)
                          return (
                            <TableRow key={st.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                              <TableCell>
                                <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{st.product?.code}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{st.product?.name}</span>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="outline" className="font-mono text-[10px]">{st.product?.unit}</Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{st.batchNo || '—'}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {st.expiryDate ? (
                                  <div className="flex flex-col">
                                    <span className="text-xs">{new Date(st.expiryDate).toLocaleDateString('en-PK')}</span>
                                    {exp && (
                                      <span className={`inline-flex w-fit items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${exp.cls}`}>
                                        {exp.label}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground/60">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${tone.cls}`}>
                                  {st.quantity.toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(value, 'PKR')}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => openAdjust(section, st)}>
                                  <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {adjustStockItem?.section && (
                <>
                  Section <span className="font-mono">{adjustStockItem.section.code}</span> ·{' '}
                  {adjustStockItem.section.company.code}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {adjustStockItem?.product && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{adjustStockItem.product.code}</span>
                <Badge variant="outline" className="font-mono text-[10px]">{adjustStockItem.product.unit}</Badge>
              </div>
              <p className="text-sm font-medium">{adjustStockItem.product.name}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Trade Price: <span className="font-medium text-foreground">{formatCurrency(adjustStockItem.product.tradePrice, 'PKR')}</span></span>
                <span>Current Qty: <span className="font-semibold text-foreground">{adjustStockItem.stock?.quantity ?? 0}</span></span>
              </div>
              {adjustStockItem.stock?.batchNo && (
                <p className="text-[11px] text-muted-foreground">Batch: {adjustStockItem.stock.batchNo}</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Movement Type</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as AdjustmentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">
                    <span className="flex items-center gap-2"><ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" /> IN — Receive stock</span>
                  </SelectItem>
                  <SelectItem value="OUT">
                    <span className="flex items-center gap-2"><ArrowUpFromLine className="w-3.5 h-3.5 text-rose-600" /> OUT — Issue / consume</span>
                  </SelectItem>
                  <SelectItem value="ADJUST">
                    <span className="flex items-center gap-2"><SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" /> ADJUST — Direct +/− correction</span>
                  </SelectItem>
                  <SelectItem value="RETURN">
                    <span className="flex items-center gap-2"><Undo2 className="w-3.5 h-3.5 text-violet-600" /> RETURN — Send back to supplier</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {adjustType === 'IN' && 'Quantity will be ADDED to current stock.'}
                {adjustType === 'OUT' && 'Quantity will be DEDUCTED from current stock.'}
                {adjustType === 'ADJUST' && 'Use positive value to add, negative to remove (e.g. -3 to remove 3 units).'}
                {adjustType === 'RETURN' && 'Quantity will be DEDUCTED from current stock (returned to supplier).'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">
                Quantity {adjustType === 'ADJUST' ? '(+/- allowed)' : '(absolute)'} *
              </Label>
              <Input
                id="qty"
                type="number"
                step="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder={adjustType === 'ADJUST' ? 'e.g. 5 or -3' : 'e.g. 10'}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Optional — e.g. GRN #1234, damaged stock, etc."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={submitAdjust}
              disabled={adjustStock.isPending}
            >
              {adjustStock.isPending ? 'Saving…' : 'Apply Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WarehouseModule
