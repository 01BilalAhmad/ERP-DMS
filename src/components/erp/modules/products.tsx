'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useProducts,
  useCategories,
  useCompanies,
  useCreateProduct,
  useUpdateProduct,
  useCreateCategory,
} from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/erp-types'
import { Card, CardContent } from '@/components/ui/card'
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Package, Plus, Search, Tag, Pencil, Boxes, PackageSearch, Layers, AlertTriangle,
} from 'lucide-react'

type UnitType = 'CTN' | 'DOZ' | 'PCS' | 'BOX'
const UNITS: UnitType[] = ['CTN', 'DOZ', 'PCS', 'BOX']

interface Category {
  id: string
  name: string
  code?: string
  status?: string
  _count?: { products: number }
}

interface Product {
  id: string
  code: string
  name: string
  description?: string | null
  packSize?: string | null
  unit: string
  piecesPerPack: number
  tradePrice: number
  retailerPrice?: number | null
  costPrice: number
  taxRate: number
  status: string
  category?: { id: string; name: string } | null
  company?: { id: string; code: string; name: string }
  stocks?: { quantity: number }[]
  schemes?: { id: string }[]
  availableStock: number
}

const emptyForm = {
  code: '',
  name: '',
  description: '',
  packSize: '',
  unit: 'CTN' as UnitType,
  piecesPerPack: '1',
  categoryId: '__none__',
  tradePrice: '',
  retailerPrice: '',
  costPrice: '',
  taxRate: '17',
  openingStock: '',
}

function stockTone(qty: number): { cls: string; label: string } {
  if (qty <= 0) return { cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', label: 'Out of stock' }
  if (qty <= 5) return { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', label: 'Low stock' }
  if (qty <= 10) return { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300', label: 'Watch' }
  return { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', label: 'In stock' }
}

export function ProductsModule() {
  const { toast } = useToast()
  const { activeCompanyId, setCompany } = useAppStore()

  // Company list
  const { data: companies, isLoading: companiesLoading } = useCompanies()
  const companyList: { id: string; code: string; name: string }[] = companies || []

  // Local override so user can switch company without affecting global store immediately.
  const [userPickedCompanyId, setUserPickedCompanyId] = useState<string>('')

  // Resolve the working companyId during render: explicit override → store's activeCompanyId (if not ALL) → first company.
  const companyId =
    userPickedCompanyId ||
    (activeCompanyId && activeCompanyId !== 'ALL' ? activeCompanyId : '') ||
    companyList[0]?.id ||
    ''

  // Keep global store in sync (Zustand dispatch, not React setState)
  useEffect(() => {
    if (companyId && companyId !== activeCompanyId) {
      setCompany(companyId)
    }
  }, [companyId, activeCompanyId, setCompany])

  // Search & filter state
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [categoryId, setCategoryId] = useState<string>('ALL')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350)
    return () => clearTimeout(t)
  }, [q])

  const { data: products, isLoading: productsLoading } = useProducts({
    companyId,
    q: debouncedQ,
    categoryId: categoryId === 'ALL' ? undefined : categoryId,
  })
  const { data: categories } = useCategories(companyId)

  const productList: Product[] = products || []
  const categoryList: Category[] = categories || []

  // Mutations
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const createCategory = useCreateCategory()

  // Dialogs
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', code: '' })

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, categoryId: categoryList[0]?.id || '__none__' })
    setProductDialogOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditingId(p.id)
    setForm({
      code: p.code,
      name: p.name,
      description: p.description || '',
      packSize: p.packSize || '',
      unit: (p.unit as UnitType) || 'CTN',
      piecesPerPack: String(p.piecesPerPack ?? 1),
      categoryId: p.category?.id || '__none__',
      tradePrice: String(p.tradePrice ?? ''),
      retailerPrice: p.retailerPrice != null ? String(p.retailerPrice) : '',
      costPrice: String(p.costPrice ?? 0),
      taxRate: String(p.taxRate ?? 17),
      openingStock: '',
    })
    setProductDialogOpen(true)
  }

  const submitProduct = async () => {
    if (!companyId) return
    if (!form.code.trim() || !form.name.trim() || form.tradePrice === '') {
      toast({ title: 'Missing fields', description: 'Code, name and trade price are required.', variant: 'destructive' })
      return
    }
    const payload: any = {
      companyId,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      packSize: form.packSize.trim() || undefined,
      unit: form.unit,
      piecesPerPack: Number(form.piecesPerPack) || 1,
      categoryId: form.categoryId === '__none__' ? null : form.categoryId,
      tradePrice: Number(form.tradePrice),
      retailerPrice: form.retailerPrice ? Number(form.retailerPrice) : null,
      costPrice: Number(form.costPrice) || 0,
      taxRate: Number(form.taxRate) || 17,
    }
    try {
      if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, ...payload })
        toast({ title: 'Product updated', description: `${payload.code} · ${payload.name}` })
      } else {
        if (form.openingStock && Number(form.openingStock) > 0) {
          payload.openingStock = Number(form.openingStock)
        }
        await createProduct.mutateAsync(payload)
        toast({ title: 'Product created', description: `${payload.code} · ${payload.name}` })
      }
      setProductDialogOpen(false)
    } catch (e: any) {
      toast({ title: 'Failed to save product', description: e?.message || 'Unknown error', variant: 'destructive' })
    }
  }

  const submitCategory = async () => {
    if (!companyId) return
    if (!catForm.name.trim()) {
      toast({ title: 'Category name required', variant: 'destructive' })
      return
    }
    try {
      await createCategory.mutateAsync({
        companyId,
        name: catForm.name.trim(),
        code: catForm.code.trim() || undefined,
      })
      toast({ title: 'Category created', description: catForm.name.trim() })
      setCatForm({ name: '', code: '' })
      setCategoryDialogOpen(false)
    } catch (e: any) {
      toast({ title: 'Failed to create category', description: e?.message || 'Unknown error', variant: 'destructive' })
    }
  }

  // KPIs
  const stats = useMemo(() => {
    const total = productList.length
    const lowStock = productList.filter((p) => p.availableStock <= 5).length
    const outOfStock = productList.filter((p) => p.availableStock <= 0).length
    const catalogValue = productList.reduce((s, p) => s + (p.availableStock * p.tradePrice), 0)
    return { total, lowStock, outOfStock, catalogValue }
  }, [productList])

  const currentCompany = companyList.find((c) => c.id === companyId)

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Each company maintains its own product catalog. Select a company to view its products."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)} disabled={!companyId}>
              <Tag className="w-4 h-4" /> Add Category
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreate} disabled={!companyId}>
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </>
        }
      />

      {/* Company selector — mandatory because catalogs are separate */}
      <Card className="mb-5 border-emerald-200/60 dark:border-emerald-900/40">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Catalog</p>
              <p className="text-sm font-semibold">{currentCompany ? `${currentCompany.code} · ${currentCompany.name}` : 'Select a company'}</p>
            </div>
          </div>
          <div className="md:ml-auto w-full md:w-72">
            <Label className="text-[11px] text-muted-foreground">Company</Label>
            <Select value={companyId} onValueChange={(v) => { setUserPickedCompanyId(v); setCategoryId('ALL') }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={companiesLoading ? 'Loading…' : 'Select company'} />
              </SelectTrigger>
              <SelectContent>
                {companyList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-mono text-xs mr-2 text-muted-foreground">{c.code}</span>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <StatCard title="Products" value={stats.total} icon={Package} tone="emerald" loading={productsLoading} hint="In this catalog" />
        <StatCard title="Low Stock" value={stats.lowStock} icon={AlertTriangle} tone="amber" loading={productsLoading} hint="≤ 5 units" />
        <StatCard title="Out of Stock" value={stats.outOfStock} icon={AlertTriangle} tone="rose" loading={productsLoading} hint="Zero units" />
        <StatCard title="Catalog Value" value={formatCurrency(stats.catalogValue, 'PKR')} icon={Layers} tone="violet" loading={productsLoading} hint="Stock × trade price" />
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by product name or code…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categoryList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c._count?.products != null && <span className="text-muted-foreground ml-1">({c._count.products})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products table */}
      <Card>
        <CardContent className="p-0">
          {!companyId ? (
            <EmptyState icon={Package} title="Select a company" hint="Choose a company above to view its product catalog." />
          ) : productsLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : productList.length === 0 ? (
            <EmptyState icon={PackageSearch} title="No products found" hint="Add your first product or adjust the filters above." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Pack</TableHead>
                  <TableHead className="hidden sm:table-cell">Unit</TableHead>
                  <TableHead className="text-right">Trade Price</TableHead>
                  <TableHead className="hidden md:table-cell text-center">Tax</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="hidden lg:table-cell">Category</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productList.map((p) => {
                  const tone = stockTone(p.availableStock)
                  return (
                    <TableRow key={p.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                      <TableCell>
                        <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{p.code}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                          {p.packSize && <span className="text-[11px] text-muted-foreground">{p.packSize}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{p.packSize || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="font-mono text-[10px]">{p.unit}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.tradePrice, 'PKR')}</TableCell>
                      <TableCell className="hidden md:table-cell text-center text-xs text-muted-foreground">{p.taxRate}%</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone.cls}`}>
                          {p.availableStock}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {p.category ? (
                          <span className="text-muted-foreground">{p.category.name}</span>
                        ) : (
                          <span className="text-muted-foreground/60">Uncategorized</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" /> Edit
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

      {/* Product Create/Edit Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update product details. Opening stock is only used when creating new products.'
                : 'Fill in product details. The product will be added to the selected company catalog.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-code">Code *</Label>
              <Input id="p-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. BISC-001" className="font-mono uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name *</Label>
              <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-pack">Pack Size</Label>
              <Input id="p-pack" value={form.packSize} onChange={(e) => setForm({ ...form, packSize: e.target.value })} placeholder="e.g. 12x500ml" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as UnitType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-ppp">Pieces per pack</Label>
              <Input id="p-ppp" type="number" min="1" value={form.piecesPerPack} onChange={(e) => setForm({ ...form, piecesPerPack: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No category —</SelectItem>
                  {categoryList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-tp">Trade Price *</Label>
              <Input id="p-tp" type="number" min="0" step="0.01" value={form.tradePrice} onChange={(e) => setForm({ ...form, tradePrice: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-rp">Retailer Price (MRP)</Label>
              <Input id="p-rp" type="number" min="0" step="0.01" value={form.retailerPrice} onChange={(e) => setForm({ ...form, retailerPrice: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cp">Cost Price</Label>
              <Input id="p-cp" type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-tax">Tax Rate (%)</Label>
              <Input id="p-tax" type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
            </div>
            {!editingId && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-open">Opening Stock (optional)</Label>
                <Input id="p-open" type="number" min="0" step="1" value={form.openingStock} onChange={(e) => setForm({ ...form, openingStock: e.target.value })} placeholder="e.g. 100 — creates initial stock in this company's warehouse section" />
                <p className="text-[11px] text-muted-foreground">Creates an OPENING stock batch in the company's warehouse section.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={submitProduct}
              disabled={createProduct.isPending || updateProduct.isPending}
            >
              {(createProduct.isPending || updateProduct.isPending) ? 'Saving…' : editingId ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Create a new product category for{' '}
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">{currentCompany?.code}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Category Name *</Label>
              <Input id="c-name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Beverages" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-code">Code (optional)</Label>
              <Input id="c-code" value={catForm.code} onChange={(e) => setCatForm({ ...catForm, code: e.target.value })} placeholder="Auto-generated from name" className="font-mono uppercase" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={submitCategory}
              disabled={createCategory.isPending}
            >
              {createCategory.isPending ? 'Creating…' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductsModule
