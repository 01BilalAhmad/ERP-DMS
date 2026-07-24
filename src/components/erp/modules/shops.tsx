'use client'

import { useState, useEffect, Fragment } from 'react'
import { useShops, useCompanies, useCreateShop, useUpdateShop } from '@/lib/api-hooks'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
import { QuickRecovery } from '@/components/erp/quick-recovery'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency } from '@/lib/erp-types'
import {
  Store, Plus, Pencil, Search, MapPin, Phone, User, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, Filter, Building2,
} from 'lucide-react'

type CompanyLink = {
  id: string
  shopId: string
  companyId: string
  creditLimit: number
  outstandingBalance: number
  status: string
  company: { id: string; code: string; name: string }
}

type Shop = {
  id: string
  code: string
  name: string
  ownerName?: string | null
  phone?: string | null
  address?: string | null
  gpsLat?: number | null
  gpsLng?: number | null
  shopClass: string
  taxType: string
  ntn?: string | null
  strn?: string | null
  visitDay?: string | null
  status: string
  companyLinks: CompanyLink[]
  _count?: { orders: number }
}

const emptyForm = {
  name: '',
  ownerName: '',
  phone: '',
  address: '',
  gpsLat: '',
  gpsLng: '',
  shopClass: 'C',
  taxType: 'NON_FILER',
  ntn: '',
  strn: '',
  visitDay: '',
  status: 'ACTIVE',
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function classBadge(cls: string) {
  const map: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    B: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    C: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
  }
  return map[cls] || map.C
}

function taxBadge(t: string) {
  return t === 'FILER'
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
}

export function ShopsModule() {
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [classFilter, setClassFilter] = useState('ALL')

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useShops({
    q: debouncedSearch || undefined,
    companyId: companyFilter !== 'ALL' ? companyFilter : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    class: classFilter !== 'ALL' ? classFilter : undefined,
  })
  const { data: companiesData } = useCompanies()
  const { toast } = useToast()
  const createMut = useCreateShop()
  const updateMut = useUpdateShop()

  const shops: Shop[] = (data as Shop[]) || []
  const companies = (companiesData as any[]) || []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Shop | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])
  const [creditLimits, setCreditLimits] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const stats = (() => {
    const totalOutstanding = shops.reduce(
      (sum, s) => sum + (s.companyLinks?.reduce((acc, l) => acc + (l.outstandingBalance || 0), 0) || 0),
      0
    )
    const nearLimit = shops.filter((s) =>
      s.companyLinks?.some((l) => l.creditLimit > 0 && l.outstandingBalance / l.creditLimit > 0.8)
    ).length
    return {
      total: shops.length,
      active: shops.filter((s) => s.status === 'ACTIVE').length,
      blacklisted: shops.filter((s) => s.status === 'BLACKLISTED').length,
      totalOutstanding,
      nearLimit,
    }
  })()

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setSelectedCompanyIds([])
    setCreditLimits({})
    setDialogOpen(true)
  }

  function openEdit(s: Shop) {
    setEditing(s)
    setForm({
      name: s.name,
      ownerName: s.ownerName || '',
      phone: s.phone || '',
      address: s.address || '',
      gpsLat: s.gpsLat ? String(s.gpsLat) : '',
      gpsLng: s.gpsLng ? String(s.gpsLng) : '',
      shopClass: s.shopClass,
      taxType: s.taxType,
      ntn: s.ntn || '',
      strn: s.strn || '',
      visitDay: s.visitDay || '',
      status: s.status,
    })
    const ids = s.companyLinks?.map((l) => l.companyId) || []
    setSelectedCompanyIds(ids)
    const limits: Record<string, string> = {}
    s.companyLinks?.forEach((l) => {
      limits[l.companyId] = String(l.creditLimit || 0)
    })
    setCreditLimits(limits)
    setDialogOpen(true)
  }

  function toggleCompany(id: string) {
    setSelectedCompanyIds((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id)
      return [...prev, id]
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) {
      toast({ title: 'Shop name required', variant: 'destructive' })
      return
    }
    if (selectedCompanyIds.length === 0) {
      toast({ title: 'Company link required', description: 'Link at least one company with a credit limit', variant: 'destructive' })
      return
    }

    const payload: any = {
      ...form,
      gpsLat: form.gpsLat ? Number(form.gpsLat) : null,
      gpsLng: form.gpsLng ? Number(form.gpsLng) : null,
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          ...payload,
          companyLinks: selectedCompanyIds.map((cid) => ({
            companyId: cid,
            creditLimit: Number(creditLimits[cid] || 0),
          })),
        })
        toast({ title: 'Shop updated', description: `${form.name} saved` })
      } else {
        await createMut.mutateAsync({
          ...payload,
          companyIds: selectedCompanyIds,
          creditLimits: selectedCompanyIds.map((cid) => Number(creditLimits[cid] || 0)),
        })
        toast({ title: 'Shop created', description: `${form.name} added with ${selectedCompanyIds.length} company link(s)` })
      }
      setDialogOpen(false)
    } catch (err: any) {
      toast({ title: 'Failed to save shop', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Shops"
        subtitle={`${stats.total} retailers · Outstanding ${formatCurrency(stats.totalOutstanding)}`}
        actions={
          <div className="flex items-center gap-2">
            <QuickRecovery />
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4" /> Add Shop
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <StatCard title="Shops" value={stats.total} icon={Store} tone="emerald" loading={isLoading} />
        <StatCard title="Active" value={stats.active} icon={CheckCircle2} tone="sky" loading={isLoading} />
        <StatCard title="Near Credit Limit" value={stats.nearLimit} icon={AlertTriangle} tone="amber" hint=">80% of limit" loading={isLoading} />
        <StatCard title="Blacklisted" value={stats.blacklisted} icon={AlertTriangle} tone="rose" loading={isLoading} />
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, owner, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <SelectValue placeholder="All Companies" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Companies</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[110px] h-9">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  <SelectItem value="A">Class A</SelectItem>
                  <SelectItem value="B">Class B</SelectItem>
                  <SelectItem value="C">Class C</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue placeholder="All Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : shops.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No shops found"
              hint="Try adjusting filters or add a new shop. Shops can be linked to multiple companies with separate credit limits."
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {shops.map((s) => (
                  <MobileShopCard
                    key={s.id}
                    shop={s}
                    onEdit={() => openEdit(s)}
                  />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Code / Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Tax Type</TableHead>
                      <TableHead>Companies</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shops.map((s) => {
                      const expanded = expandedId === s.id
                      return (
                        <Fragment key={s.id}>
                          <TableRow className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                            <TableCell>
                              <button
                                onClick={() => setExpandedId(expanded ? null : s.id)}
                                className="text-muted-foreground hover:text-emerald-700"
                                aria-label={expanded ? 'Collapse' : 'Expand'}
                              >
                                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">
                                  {s.code.slice(-3)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{s.name}</p>
                                  <p className="text-[11px] text-muted-foreground font-mono">{s.code}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{s.ownerName || '—'}</TableCell>
                            <TableCell className="text-xs font-mono">{s.phone || '—'}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${classBadge(s.shopClass)}`}>
                                {s.shopClass}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${taxBadge(s.taxType)}`}>
                                {s.taxType === 'FILER' ? 'Filer' : 'Non-Filer'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[280px]">
                                {s.companyLinks?.map((l) => {
                                  const ratio = l.creditLimit > 0 ? l.outstandingBalance / l.creditLimit : 0
                                  const isWarn = ratio > 0.8
                                  return (
                                    <span
                                      key={l.id}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                        isWarn
                                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                      }`}
                                      title={`${l.company.code}: Outstanding ${formatCurrency(l.outstandingBalance)} / ${formatCurrency(l.creditLimit)}`}
                                    >
                                      {l.company.code}
                                      {isWarn && <AlertTriangle className="w-2.5 h-2.5" />}
                                    </span>
                                  )
                                })}
                              </div>
                            </TableCell>
                            <TableCell><StatusBadge status={s.status} /></TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(s)}
                                className="h-8 w-8 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expanded && (
                            <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/30">
                              <TableCell colSpan={9} className="p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                  {s.companyLinks?.map((l) => {
                                    const ratio = l.creditLimit > 0 ? Math.min(100, (l.outstandingBalance / l.creditLimit) * 100) : 0
                                    const isWarn = ratio > 80
                                    const isCritical = ratio > 100
                                    return (
                                      <Card key={l.id} className={`border ${isCritical ? 'border-rose-300 dark:border-rose-800' : isWarn ? 'border-amber-300 dark:border-amber-800' : 'border-zinc-200 dark:border-zinc-800'}`}>
                                        <CardContent className="p-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold">{l.company.name}</p>
                                            <Badge variant="outline" className="font-mono text-[10px]">{l.company.code}</Badge>
                                          </div>
                                          <div className="flex items-baseline justify-between mb-1">
                                            <span className="text-[11px] text-muted-foreground">Outstanding</span>
                                            <span className={`text-sm font-semibold ${isCritical ? 'text-rose-600' : isWarn ? 'text-amber-600' : ''}`}>
                                              {formatCurrency(l.outstandingBalance)}
                                            </span>
                                          </div>
                                          <div className="flex items-baseline justify-between mb-1.5">
                                            <span className="text-[11px] text-muted-foreground">Credit Limit</span>
                                            <span className="text-xs font-mono">{l.creditLimit > 0 ? formatCurrency(l.creditLimit) : 'Unlimited'}</span>
                                          </div>
                                          {l.creditLimit > 0 && (
                                            <div className="space-y-1">
                                              <Progress
                                                value={ratio}
                                                className={isCritical ? 'h-2 bg-rose-200 dark:bg-rose-950' : isWarn ? 'h-2 bg-amber-200 dark:bg-amber-950' : 'h-2 bg-emerald-100 dark:bg-emerald-950'}
                                              />
                                              <p className={`text-[10px] ${isCritical ? 'text-rose-600' : isWarn ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                                {ratio.toFixed(0)}% used {isCritical && '(over limit!)'}
                                              </p>
                                            </div>
                                          )}
                                          {s._count?.orders != null && (
                                            <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                              {s._count.orders} orders placed
                                            </p>
                                          )}
                                        </CardContent>
                                      </Card>
                                    )
                                  })}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <Store className="w-5 h-5" />
              {editing ? 'Edit Shop' : 'Add Shop'}
            </DialogTitle>
            <DialogDescription>
              {editing ? `Update ${editing.name}` : 'Create a new shop and link it to one or more companies with credit limits.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="name" className="text-xs font-medium">Shop Name *</Label>
                <Input id="name" placeholder="Al-Madina General Store" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ownerName" className="text-xs font-medium">Owner Name</Label>
                <Input id="ownerName" placeholder="Muhammad Ali" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">Phone</Label>
                <Input id="phone" placeholder="+92 300 1234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-medium">Address</Label>
              <Input id="address" placeholder="Shop #45, Main Bazaar, Karachi" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shopClass" className="text-xs font-medium">Class</Label>
                <Select value={form.shopClass} onValueChange={(v) => setForm({ ...form, shopClass: v })}>
                  <SelectTrigger id="shopClass"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A — Premium</SelectItem>
                    <SelectItem value="B">B — Standard</SelectItem>
                    <SelectItem value="C">C — General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxType" className="text-xs font-medium">Tax Type</Label>
                <Select value={form.taxType} onValueChange={(v) => setForm({ ...form, taxType: v })}>
                  <SelectTrigger id="taxType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FILER">Filer</SelectItem>
                    <SelectItem value="NON_FILER">Non-Filer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visitDay" className="text-xs font-medium">Visit Day</Label>
                <Select value={form.visitDay || 'NONE'} onValueChange={(v) => setForm({ ...form, visitDay: v === 'NONE' ? '' : v })}>
                  <SelectTrigger id="visitDay"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Any Day</SelectItem>
                    {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-medium">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ntn" className="text-xs font-medium">NTN</Label>
                <Input id="ntn" placeholder="1234567-8" value={form.ntn} onChange={(e) => setForm({ ...form, ntn: e.target.value })} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="strn" className="text-xs font-medium">STRN</Label>
                <Input id="strn" placeholder="1701234567890" value={form.strn} onChange={(e) => setForm({ ...form, strn: e.target.value })} className="font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gpsLat" className="text-xs font-medium">GPS Latitude</Label>
                <Input id="gpsLat" type="number" step="any" placeholder="24.8607" value={form.gpsLat} onChange={(e) => setForm({ ...form, gpsLat: e.target.value })} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gpsLng" className="text-xs font-medium">GPS Longitude</Label>
                <Input id="gpsLng" type="number" step="any" placeholder="67.0011" value={form.gpsLng} onChange={(e) => setForm({ ...form, gpsLng: e.target.value })} className="font-mono" />
              </div>
            </div>

            {/* Company link with credit limits */}
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Company Links & Credit Limits *</p>
              </div>
              {companies.length === 0 ? (
                <p className="text-xs text-muted-foreground">No companies available. Create a company first.</p>
              ) : (
                <div className="space-y-2">
                  {companies.map((c) => {
                    const checked = selectedCompanyIds.includes(c.id)
                    return (
                      <div key={c.id} className={`flex items-center gap-3 p-2 rounded-md border transition-colors ${checked ? 'border-emerald-300 bg-white dark:bg-zinc-900 dark:border-emerald-800' : 'border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50'}`}>
                        <Checkbox id={`co-${c.id}`} checked={checked} onCheckedChange={() => toggleCompany(c.id)} />
                        <div className="flex-1 min-w-0">
                          <label htmlFor={`co-${c.id}`} className="text-sm font-medium cursor-pointer flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">{c.code}</Badge>
                            <span className="truncate">{c.name}</span>
                          </label>
                        </div>
                        {checked && (
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`cl-${c.id}`} className="text-[10px] text-muted-foreground">Limit:</Label>
                            <Input
                              id={`cl-${c.id}`}
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0 = unlimited"
                              value={creditLimits[c.id] || ''}
                              onChange={(e) => setCreditLimits({ ...creditLimits, [c.id]: e.target.value })}
                              className="w-32 h-8 text-xs font-mono"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                Credit limit of 0 means unlimited. Outstanding vs limit shown as progress bar; warnings trigger above 80%.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending || selectedCompanyIds.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {(createMut.isPending || updateMut.isPending) ? 'Saving...' : editing ? 'Update Shop' : 'Create Shop'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MobileShopCard({ shop, onEdit }: { shop: Shop; onEdit: () => void }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold shrink-0">
            {shop.code.slice(-3)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{shop.name}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{shop.code}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7 shrink-0 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          {shop.ownerName && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="w-3 h-3" /> <span className="truncate">{shop.ownerName}</span>
            </div>
          )}
          {shop.phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="w-3 h-3" /> <span className="truncate">{shop.phone}</span>
            </div>
          )}
          {shop.address && (
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <MapPin className="w-3 h-3" /> <span className="truncate">{shop.address}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${classBadge(shop.shopClass)}`}>Class {shop.shopClass}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${taxBadge(shop.taxType)}`}>{shop.taxType === 'FILER' ? 'Filer' : 'Non-Filer'}</span>
          <StatusBadge status={shop.status} />
        </div>
        <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {shop.companyLinks?.map((l) => {
            const ratio = l.creditLimit > 0 ? Math.min(100, (l.outstandingBalance / l.creditLimit) * 100) : 0
            const isWarn = ratio > 80
            const isCritical = ratio > 100
            return (
              <div key={l.id} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-semibold">{l.company.code}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(l.outstandingBalance)} / {l.creditLimit > 0 ? formatCurrency(l.creditLimit) : '∞'}
                  </span>
                </div>
                {l.creditLimit > 0 && (
                  <Progress
                    value={ratio}
                    className={`h-1.5 ${isCritical ? 'bg-rose-200 dark:bg-rose-950' : isWarn ? 'bg-amber-200 dark:bg-amber-950' : 'bg-emerald-100 dark:bg-emerald-950'}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Small debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default ShopsModule
