'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  useCompanies,
  useShops,
  useProducts,
  useCurrencies,
  useCreateOrder,
  useBookers,
  useSession,
} from '@/lib/api-hooks'
import { useToast } from '@/hooks/use-toast'
import {
  calculateOrderTotals,
  formatCurrency,
  type CartItem,
  type TaxType,
} from '@/lib/erp-types'
import { PageHeader, EmptyState } from '@/components/erp/ui-helpers'
import { QuickRecovery } from '@/components/erp/quick-recovery'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Building2,
  Store,
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  RotateCcw,
  Wallet,
  ShieldAlert,
  Tag,
  StickyNote,
  FileCheck2,
  Users,
} from 'lucide-react'

// ---------- local types ----------
interface Company {
  id: string
  code: string
  name: string
  salesTaxRate: number
  filerTaxRate: number
  nonFilerTaxRate: number
  furtherTaxRate: number
  defaultCurrency: string
}
interface ShopLink {
  id: string
  companyId: string
  creditLimit: number
  outstandingBalance: number
}
interface Shop {
  id: string
  code: string
  name: string
  ownerName?: string
  phone?: string
  shopClass: string
  taxType: string
  companyLinks: ShopLink[]
}
interface Product {
  id: string
  code: string
  name: string
  unit: string
  tradePrice: number
  retailerPrice?: number | null
  taxRate: number
  packSize?: string | null
  availableStock: number
  schemes?: any[]
}
interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  rate: number
  isDefault: boolean
}

// ---------- main component ----------
export function OrderEntryModule() {
  const { toast } = useToast()
  const session = useSession()
  const role = session.data?.role as string | undefined

  const companiesQ = useCompanies()
  const currenciesQ = useCurrencies()
  const createOrderMut = useCreateOrder()
  const bookersQ = useBookers()
  const isBookerRole = role === 'ORDER_BOOKER'
  const effectiveBookerId = isBookerRole ? (session.data?.booker?.id as string) : ''

  const [companyId, setCompanyId] = useState<string>('')
  const [shopId, setShopId] = useState<string>('')
  const [productSearch, setProductSearch] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [manualDiscount, setManualDiscount] = useState<number>(0)
  const [currencyCode, setCurrencyCode] = useState<string>('PKR')
  const [notes, setNotes] = useState<string>('')
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null)
  const [selectedBookerId, setSelectedBookerId] = useState<string>('')

  // Shops: filter by booker if admin selected one, or auto for booker users
  const shopsQ = useShops({ companyId, bookerId: (isBookerRole ? effectiveBookerId : selectedBookerId) || undefined })
  const productsQ = useProducts({ companyId, q: productSearch })

  // Reset dependent state when company changes (React-recommended render-time reset)
  const [prevCompany, setPrevCompany] = useState(companyId)
  if (companyId !== prevCompany) {
    setPrevCompany(companyId)
    setShopId('')
    setCart([])
    setManualDiscount(0)
    setProductSearch('')
    setSubmittedOrder(null)
  }

  // Reset cart state when shop changes
  const [prevShop, setPrevShop] = useState(shopId)
  if (shopId !== prevShop) {
    setPrevShop(shopId)
    setCart([])
    setManualDiscount(0)
    setSubmittedOrder(null)
  }

  // Auto-select first company if user only has one (render-time derivation)
  if (!companyId && companiesQ.data && companiesQ.data.length === 1) {
    setCompanyId(companiesQ.data[0].id)
  }

  const companies = (companiesQ.data || []) as Company[]
  const currencies = (currenciesQ.data || []) as Currency[]
  const company = companies.find((c) => c.id === companyId)
  const shop = ((shopsQ.data || []) as Shop[]).find((s) => s.id === shopId)
  const companyLink = shop?.companyLinks?.find((l) => l.companyId === companyId)
  const currency = currencies.find((c) => c.code === currencyCode)

  // Compute totals using shared helper (no recompute)
  const totals = useMemo(() => {
    if (!company || !shop || cart.length === 0) return null
    return calculateOrderTotals(cart, {
      manualDiscount: Number(manualDiscount) || 0,
      salesTaxRate: company.salesTaxRate,
      filerTaxRate: company.filerTaxRate,
      nonFilerTaxRate: company.nonFilerTaxRate,
      furtherTaxRate: company.furtherTaxRate,
      shopTaxType: shop.taxType as TaxType,
      creditLimit: companyLink?.creditLimit || 0,
      outstandingBalance: companyLink?.outstandingBalance || 0,
      currencyRate: currency?.rate || 1,
    })
  }, [cart, manualDiscount, company, shop, companyLink, currency])

  // ---------- cart operations ----------
  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === product.id)
      if (ex) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          quantity: 1,
          unitPrice: product.tradePrice,
          discountPct: 0,
          taxRate: product.taxRate,
        },
      ]
    })
    setSubmittedOrder(null)
  }, [])

  const updateItem = useCallback(
    (productId: string, patch: Partial<CartItem>) => {
      setCart((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, ...patch } : i))
      )
    },
    []
  )

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const resetAll = useCallback(() => {
    setCart([])
    setManualDiscount(0)
    setNotes('')
    setSubmittedOrder(null)
  }, [])

  // ---------- submit ----------
  const handleSubmit = async () => {
    if (!company || !shop || cart.length === 0) {
      toast({
        title: 'Cannot submit',
        description: 'Select company, shop and add at least one item.',
        variant: 'destructive',
      })
      return
    }
    if (!isBookerRole && !selectedBookerId) {
      toast({
        title: 'Order Booker required',
        description: 'Select which order booker this sale belongs to.',
        variant: 'destructive',
      })
      return
    }
    try {
      const result: any = await createOrderMut.mutateAsync({
        companyId,
        shopId,
        items: cart,
        manualDiscount: Number(manualDiscount) || 0,
        currency: currencyCode,
        currencyRate: currency?.rate || 1,
        notes: notes.trim() || undefined,
        bookerId: isBookerRole ? effectiveBookerId : selectedBookerId,
      })
      setSubmittedOrder(result.order)
      const warnings: string[] = result.warnings || []
      toast({
        title: `Order ${result.order.orderNo} created`,
        description: warnings.length
          ? `Grand total ${formatCurrency(result.order.grandTotal, result.order.currency, result.order.currencyRate)}. ${warnings.length} warning(s) flagged.`
          : `Grand total ${formatCurrency(result.order.grandTotal, result.order.currency, result.order.currencyRate)}. Order is now pending approval.`,
      })
      setCart([])
      setManualDiscount(0)
      setNotes('')
      setMobileCartOpen(false)
    } catch (e: any) {
      toast({
        title: 'Failed to create order',
        description: e.message || 'Unexpected error',
        variant: 'destructive',
      })
    }
  }

  const cartCount = cart.length
  const submitting = createOrderMut.isPending

  // ---------- derived UI bits ----------
  const filteredProducts = (productsQ.data || []) as Product[]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Order Entry"
        subtitle="Book a new sales order with full tax computation & warnings"
        actions={
          <div className="flex items-center gap-2">
            <QuickRecovery presetCompanyId={companyId} presetShopId={shopId} />
            {cartCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetAll}
                className="border-zinc-300 dark:border-zinc-700"
              >
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
            )}
            {role && !['ORDER_BOOKER', 'VIEWER'].includes(role) && (
              <Badge
                variant="outline"
                className="hidden sm:inline-flex bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
              >
                Role: {role.replace('_', ' ')}
              </Badge>
            )}
          </div>
        }
      />

      {/* Stepper */}
      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm overflow-x-auto pb-1">
        <StepChip
          num={1}
          label="Company"
          active={!companyId}
          done={!!companyId}
          value={company ? company.code : undefined}
        />
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <StepChip
          num={2}
          label="Shop"
          active={!!companyId && !shopId}
          done={!!shopId}
          value={shop ? shop.code : undefined}
        />
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <StepChip
          num={3}
          label="Products"
          active={!!shopId && cartCount === 0}
          done={cartCount > 0}
          value={cartCount > 0 ? `${cartCount} items` : undefined}
        />
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <StepChip num={4} label="Submit" active={cartCount > 0} done={false} />
      </div>

      {/* Success banner */}
      {submittedOrder && (
        <Card className="border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                Order {submittedOrder.orderNo} created successfully
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">
                Shop: {submittedOrder.shop?.name} · Grand total{' '}
                {formatCurrency(
                  submittedOrder.grandTotal,
                  submittedOrder.currency,
                  submittedOrder.currencyRate
                )}{' '}
                · Status: <span className="font-semibold">{submittedOrder.status}</span>
              </p>
              {submittedOrder.creditLimitExceeded || submittedOrder.stockShortage ? (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Order was flagged with warnings (credit / stock). Still saved successfully.
                </p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
              onClick={() => setSubmittedOrder(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main grid: left = selection + products, right = cart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Step 1: Company */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                1. Select Company & Booker
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companiesQ.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : companies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No companies assigned to you. Contact admin.
                </p>
              ) : (
                <>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose company…" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="font-mono text-xs mr-2">{c.code}</span>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Order Booker selector — required for admin, auto for booker */}
                  {companyId && !isBookerRole && (
                    <div className="mt-2">
                      <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                        <Users className="w-3 h-3 text-amber-600" />
                        Order Booker * <span className="text-muted-foreground font-normal">(sale attribution)</span>
                      </Label>
                      <Select value={selectedBookerId} onValueChange={setSelectedBookerId}>
                        <SelectTrigger className="w-full border-amber-200 dark:border-amber-900/50">
                          <SelectValue placeholder="Select which booker this sale belongs to…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(bookersQ.data || [])
                            .filter((b: any) => {
                              if (!b.companyMaps) return true
                              return b.companyMaps.some((m: any) => m.companyId === companyId)
                            })
                            .map((b: any) => (
                              <SelectItem key={b.id} value={b.id}>
                                <span className="font-mono text-xs mr-2">{b.employeeCode}</span>
                                {b.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {!selectedBookerId && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Required — without this, the sale won't be attributed to any booker.
                        </p>
                      )}
                    </div>
                  )}
                  {isBookerRole && (
                    <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 px-2.5 py-1.5 text-xs flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-emerald-600" />
                      <span>Booking as: <strong>{session.data?.booker?.employeeCode || 'You'}</strong></span>
                    </div>
                  )}
                </>
              )}
              {company && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <TaxInfo label="Sales Tax" value={`${company.salesTaxRate}%`} />
                  <TaxInfo label="Filer WHT" value={`${company.filerTaxRate}%`} />
                  <TaxInfo label="Non-Filer WHT" value={`${company.nonFilerTaxRate}%`} />
                  <TaxInfo label="Further Tax" value={`${company.furtherTaxRate}%`} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Shop */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                2. Select Shop
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!companyId ? (
                <p className="text-sm text-muted-foreground">
                  Select a company first.
                </p>
              ) : shopsQ.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : ((shopsQ.data || []) as Shop[]).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No shops linked to this company.
                </p>
              ) : (
                <>
                  <Select value={shopId} onValueChange={setShopId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose shop…" />
                    </SelectTrigger>
                    <SelectContent>
                      {((shopsQ.data || []) as Shop[]).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="font-mono text-xs mr-2">{s.code}</span>
                          {s.name}
                          <span className="ml-2 text-[10px] text-muted-foreground">
                            ({s.taxType})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {shop && companyLink && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                      <ShopInfoMini
                        label="Tax Type"
                        value={shop.taxType}
                        tone={shop.taxType === 'FILER' ? 'emerald' : 'amber'}
                      />
                      <ShopInfoMini label="Class" value={shop.shopClass} />
                      <ShopInfoMini
                        label="Outstanding"
                        value={formatCurrency(companyLink.outstandingBalance)}
                      />
                      <ShopInfoMini
                        label="Credit Limit"
                        value={
                          companyLink.creditLimit > 0
                            ? formatCurrency(companyLink.creditLimit)
                            : 'Unlimited'
                        }
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Products */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  3. Add Products
                </CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or code…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-8 h-9"
                    disabled={!shopId}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!shopId ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Select a shop to start adding products.
                </p>
              ) : productsQ.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No products found"
                  hint="Try a different search term, or add products for this company first."
                />
              ) : (
                <ScrollArea className="max-h-[420px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                    {filteredProducts.slice(0, 60).map((p) => {
                      const inCart = cart.find((i) => i.productId === p.id)
                      const lowStock =
                        p.availableStock !== undefined && p.availableStock <= 5
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            'group rounded-lg border p-3 transition-colors',
                            inCart
                              ? 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {p.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                {p.code}
                                {p.packSize ? ` · ${p.packSize}` : ''}
                              </p>
                            </div>
                            {inCart ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px]">
                                In cart: {inCart.quantity}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-xs space-y-0.5">
                              <p className="font-semibold">
                                {formatCurrency(p.tradePrice)}
                                <span className="text-muted-foreground font-normal">
                                  {' '}/ {p.unit}
                                </span>
                              </p>
                              <p
                                className={cn(
                                  'flex items-center gap-1',
                                  lowStock
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-muted-foreground'
                                )}
                              >
                                Stock: {p.availableStock ?? 0} {p.unit}
                                {lowStock && (
                                  <AlertTriangle className="w-3 h-3" />
                                )}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addToCart(p)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              {inCart ? 'More' : 'Add'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {filteredProducts.length > 60 && (
                    <p className="text-center text-xs text-muted-foreground mt-3">
                      Showing first 60 of {filteredProducts.length}. Refine search to narrow down.
                    </p>
                  )}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart panel - desktop sticky */}
        <div className="hidden lg:block">
          <div className="sticky top-4">
            <CartPanel
              shop={shop}
              cart={cart}
              totals={totals}
              manualDiscount={manualDiscount}
              setManualDiscount={setManualDiscount}
              currencyCode={currencyCode}
              setCurrencyCode={setCurrencyCode}
              currencies={currencies}
              notes={notes}
              setNotes={setNotes}
              updateItem={updateItem}
              removeItem={removeItem}
              onSubmit={handleSubmit}
              submitting={submitting}
              currency={currency}
              company={company}
              previousBalance={companyLink?.outstandingBalance || 0}
            />
          </div>
        </div>
      </div>

      {/* Mobile cart trigger */}
      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-4 right-4 z-30">
          <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
            <SheetTrigger asChild>
              <Button className="rounded-full h-14 w-14 p-0 shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                <div className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 bg-amber-400 text-emerald-950 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] p-0">
              <SheetHeader className="px-4 pt-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  Order Cart
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(90vh-60px)]">
                <div className="p-4">
                  <CartPanel
                    shop={shop}
                    cart={cart}
                    totals={totals}
                    manualDiscount={manualDiscount}
                    setManualDiscount={setManualDiscount}
                    currencyCode={currencyCode}
                    setCurrencyCode={setCurrencyCode}
                    currencies={currencies}
                    notes={notes}
                    setNotes={setNotes}
                    updateItem={updateItem}
                    removeItem={removeItem}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    currency={currency}
                    company={company}
                    previousBalance={companyLink?.outstandingBalance || 0}
                    compact
                  />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  )
}

// ---------- Step chip ----------
function StepChip({
  num,
  label,
  active,
  done,
  value,
}: {
  num: number
  label: string
  active?: boolean
  done?: boolean
  value?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border shrink-0 transition-colors',
        done
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
          : active
            ? 'border-emerald-500 bg-emerald-600 text-white'
            : 'border-zinc-200 bg-white text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900'
      )}
    >
      <span
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
          done
            ? 'bg-emerald-600 text-white'
            : active
              ? 'bg-white text-emerald-700'
              : 'bg-zinc-100 text-muted-foreground dark:bg-zinc-800'
        )}
      >
        {done ? <CheckCircle2 className="w-3 h-3" /> : num}
      </span>
      <span className="font-medium">{label}</span>
      {value && <span className="text-[10px] opacity-80">· {value}</span>}
    </div>
  )
}

// ---------- tax info mini ----------
function TaxInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 dark:bg-zinc-900 px-2 py-1.5 border border-zinc-100 dark:border-zinc-800">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

// ---------- shop info mini ----------
function ShopInfoMini({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'emerald' | 'amber'
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
        {label}
      </p>
      <p
        className={cn(
          'text-sm font-semibold',
          tone === 'emerald' && 'text-emerald-700 dark:text-emerald-300',
          tone === 'amber' && 'text-amber-700 dark:text-amber-300'
        )}
      >
        {value}
      </p>
    </div>
  )
}

// ---------- Cart panel ----------
function CartPanel({
  shop,
  cart,
  totals,
  manualDiscount,
  setManualDiscount,
  currencyCode,
  setCurrencyCode,
  currencies,
  notes,
  setNotes,
  updateItem,
  removeItem,
  onSubmit,
  submitting,
  currency,
  company,
  previousBalance = 0,
  compact = false,
}: {
  shop?: Shop
  cart: CartItem[]
  totals: ReturnType<typeof calculateOrderTotals> | null
  manualDiscount: number
  setManualDiscount: (v: number) => void
  currencyCode: string
  setCurrencyCode: (v: string) => void
  currencies: Currency[]
  notes: string
  setNotes: (v: string) => void
  updateItem: (id: string, patch: Partial<CartItem>) => void
  removeItem: (id: string) => void
  onSubmit: () => void
  submitting: boolean
  currency?: Currency
  company?: Company
  previousBalance?: number
  compact?: boolean
}) {
  if (!shop) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-800 sticky top-4">
        <CardContent className="p-4">
          <EmptyState
            icon={ShoppingCart}
            title="Cart is empty"
            hint="Pick a shop first to start adding items."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-900">
      <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Cart
            {cart.length > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px]">
                {cart.length}
              </Badge>
            )}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{shop.name}</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {cart.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items yet"
            hint="Click 'Add' on any product to put it in the cart."
          />
        ) : (
          <>
            {/* Cart lines */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scroll">
              {cart.map((item) => {
                const lineGross = item.quantity * item.unitPrice
                const lineTotal =
                  lineGross - (lineGross * item.discountPct) / 100
                return (
                  <div
                    key={item.productId}
                    className="rounded-md border border-zinc-200 dark:border-zinc-800 p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {item.code} · {item.unit} · tax {item.taxRate}%
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      <Field label="Qty">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.productId, {
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </Field>
                      <Field label="Unit Price">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(item.productId, {
                              unitPrice: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </Field>
                      <Field label="Disc %">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={item.discountPct}
                          onChange={(e) =>
                            updateItem(item.productId, {
                              discountPct: Math.min(
                                100,
                                Math.max(0, Number(e.target.value) || 0)
                              ),
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </Field>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <span className="text-muted-foreground">
                        Line gross: {formatCurrency(lineGross)}
                      </span>
                      <span className="font-semibold">
                        Net: {formatCurrency(lineTotal)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Manual discount + currency */}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Manual Discount (overall)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={manualDiscount}
                  onChange={(e) =>
                    setManualDiscount(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="h-8 text-sm"
                />
              </Field>
              <Field label="Currency">
                <Select value={currencyCode} onValueChange={setCurrencyCode}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.id} value={c.code}>
                        {c.code} · {c.symbol} (rate {c.rate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Totals breakdown */}
            {totals && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-1.5">
                <TotalsRow label="Subtotal" value={formatCurrency(totals.subtotal, currencyCode, currency?.rate || 1)} />
                {totals.schemeDiscount > 0 && (
                  <TotalsRow
                    label="Scheme Discount"
                    value={`− ${formatCurrency(totals.schemeDiscount, currencyCode, currency?.rate || 1)}`}
                    tone="rose"
                    icon={<Tag className="w-3 h-3" />}
                  />
                )}
                {totals.manualDiscount > 0 && (
                  <TotalsRow
                    label="Manual Discount"
                    value={`− ${formatCurrency(totals.manualDiscount, currencyCode, currency?.rate || 1)}`}
                    tone="rose"
                  />
                )}
                <TotalsRow
                  label="Taxable Amount"
                  value={formatCurrency(totals.taxableAmount, currencyCode, currency?.rate || 1)}
                  strong
                />
                <TotalsRow
                  label={`Sales Tax (${company?.salesTaxRate ?? 17}%)`}
                  value={formatCurrency(totals.salesTax, currencyCode, currency?.rate || 1)}
                />
                {shop?.taxType === 'NON_FILER' && (
                  <TotalsRow
                    label={`Further Tax (Non-Filer ${company?.furtherTaxRate ?? 3}%)`}
                    value={formatCurrency(totals.furtherTax, currencyCode, currency?.rate || 1)}
                    tone="amber"
                  />
                )}
                <TotalsRow
                  label={`Withholding Tax (${shop?.taxType === 'FILER' ? `${company?.filerTaxRate ?? 4.5}% Filer` : `${company?.nonFilerTaxRate ?? 8}% Non-Filer`})`}
                  value={formatCurrency(totals.withholdingTax, currencyCode, currency?.rate || 1)}
                  tone="amber"
                />
                <div className="border-t border-emerald-300/50 dark:border-emerald-800/50 pt-1.5 mt-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Grand Total</span>
                    <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(totals.grandTotal, currencyCode, currency?.rate || 1)}
                    </span>
                  </div>
                </div>

                {/* Previous Balance + Total Payable */}
                {previousBalance > 0 && (
                  <>
                    <div className="border-t border-amber-300/50 dark:border-amber-800/50 pt-1.5 mt-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          Previous Balance (outstanding)
                        </span>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                          {formatCurrency(previousBalance, currencyCode, currency?.rate || 1)}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-md bg-amber-500 text-white p-2 mt-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold uppercase tracking-wide">Total Payable</span>
                        <span className="text-lg font-extrabold">
                          {formatCurrency(totals.grandTotal + previousBalance, currencyCode, currency?.rate || 1)}
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-50 mt-0.5">Current bill + previous balance</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Warnings */}
            {totals && totals.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Warnings ({totals.warnings.length}) — order can still be submitted
                  </p>
                </div>
                <ul className="space-y-1 text-[11px] text-amber-700 dark:text-amber-400 list-disc pl-5">
                  {totals.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            <Field label="Notes (optional)">
              <Textarea
                placeholder="Any remark for this order…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </Field>

            {/* Submit */}
            <Button
              onClick={onSubmit}
              disabled={submitting || cart.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4 mr-2" /> Submit Order
                </>
              )}
            </Button>
            {!compact && (
              <p className="text-[10px] text-muted-foreground text-center">
                Order will be created with status <span className="font-semibold">PENDING</span> for approval.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------- small field wrapper ----------
function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}

function TotalsRow({
  label,
  value,
  tone = 'default',
  strong = false,
  icon,
}: {
  label: string
  value: string
  tone?: 'default' | 'rose' | 'amber'
  strong?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span
        className={cn(
          'flex items-center gap-1.5',
          tone === 'rose' && 'text-rose-600 dark:text-rose-400',
          tone === 'amber' && 'text-amber-700 dark:text-amber-400',
          !tone || tone === 'default' ? 'text-muted-foreground' : ''
        )}
      >
        {icon}
        {label}
      </span>
      <span
        className={cn(
          strong ? 'font-bold text-sm' : 'font-medium',
          tone === 'rose' && 'text-rose-600 dark:text-rose-400',
          tone === 'amber' && 'text-amber-700 dark:text-amber-400'
        )}
      >
        {value}
      </span>
    </div>
  )
}

export default OrderEntryModule
