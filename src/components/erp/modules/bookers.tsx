'use client'

import { useState } from 'react'
import { useBookers, useCompanies, useCreateBooker, useUpdateBooker } from '@/lib/api-hooks'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Users, Pencil, Mail, Phone, Building2, ShoppingBag, Store,
  Search, UserPlus, BadgeCheck, AlertCircle,
} from 'lucide-react'

type BookerCompanyMap = {
  id: string
  bookerId: string
  companyId: string
  company: { id: string; code: string; name: string }
}

type Booker = {
  id: string
  userId: string
  employeeCode: string
  name: string
  phone?: string | null
  status: string
  user?: { id: string; name: string; email: string; phone?: string | null; status: string; role: string }
  companyMaps: BookerCompanyMap[]
  _count?: { orders: number; shopAssign: number }
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  employeeCode: '',
  status: 'ACTIVE',
}

const COLORS = ['emerald', 'sky', 'violet', 'amber'] as const
type ColorKey = (typeof COLORS)[number]

const COLOR_CLS: Record<ColorKey, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
}

export function BookersModule() {
  const { data, isLoading } = useBookers()
  const { data: companiesData } = useCompanies()
  const { toast } = useToast()
  const createMut = useCreateBooker()
  const updateMut = useUpdateBooker()

  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Booker | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])

  const bookers: Booker[] = (data as Booker[]) || []
  const companies = (companiesData as any[]) || []

  const filtered = bookers.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.name.toLowerCase().includes(q) ||
      b.employeeCode.toLowerCase().includes(q) ||
      (b.user?.email || '').toLowerCase().includes(q) ||
      (b.phone || '').toLowerCase().includes(q)
    )
  })

  const stats = (() => {
    const total = bookers.length
    const active = bookers.filter((b) => b.status === 'ACTIVE').length
    const totalOrders = bookers.reduce((s, b) => s + (b._count?.orders || 0), 0)
    const totalShops = bookers.reduce((s, b) => s + (b._count?.shopAssign || 0), 0)
    return { total, active, totalOrders, totalShops }
  })()

  function suggestEmployeeCode() {
    const count = bookers.length
    return `OB-${String(count + 1).padStart(3, '0')}`
  }

  function openCreate() {
    setEditing(null)
    setForm({
      ...emptyForm,
      employeeCode: suggestEmployeeCode(),
    })
    setSelectedCompanyIds([])
    setDialogOpen(true)
  }

  function openEdit(b: Booker) {
    setEditing(b)
    setForm({
      name: b.name,
      email: b.user?.email || '',
      phone: b.phone || b.user?.phone || '',
      password: '',
      employeeCode: b.employeeCode,
      status: b.status,
    })
    setSelectedCompanyIds(b.companyMaps?.map((m) => m.companyId) || [])
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
    if (!form.name || !form.email || (!editing && !form.password)) {
      toast({
        title: 'Missing fields',
        description: editing ? 'Name and email are required' : 'Name, email, and password are required',
        variant: 'destructive',
      })
      return
    }
    if (selectedCompanyIds.length === 0) {
      toast({
        title: 'Company mapping required',
        description: 'Each booker must be mapped to at least one company (typically 2)',
        variant: 'destructive',
      })
      return
    }

    const payload: any = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      employeeCode: form.employeeCode,
      companyIds: selectedCompanyIds,
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload, status: form.status })
        toast({ title: 'Booker updated', description: `${form.name} saved successfully` })
      } else {
        await createMut.mutateAsync({ ...payload, password: form.password })
        toast({ title: 'Booker created', description: `${form.name} can now book orders for ${selectedCompanyIds.length} compan${selectedCompanyIds.length === 1 ? 'y' : 'ies'}` })
      }
      setDialogOpen(false)
    } catch (err: any) {
      toast({ title: 'Failed to save booker', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Order Bookers"
        subtitle="9 bookers · Each maps to ~2 companies for route coverage"
        actions={
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <UserPlus className="w-4 h-4" /> Add Booker
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <StatCard title="Bookers" value={stats.total} icon={Users} tone="emerald" loading={isLoading} />
        <StatCard title="Active" value={stats.active} icon={BadgeCheck} tone="sky" loading={isLoading} />
        <StatCard title="Total Orders" value={stats.totalOrders} icon={ShoppingBag} tone="amber" hint="Booked by all" loading={isLoading} />
        <StatCard title="Shop Assignments" value={stats.totalShops} icon={Store} tone="violet" hint="Routes covered" loading={isLoading} />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, employee code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary" className="ml-auto bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {filtered.length} {filtered.length === 1 ? 'booker' : 'bookers'}
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No bookers found"
          hint="Add your first order booker. Each booker is mapped to ~2 companies and assigned specific shops to cover."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <BookerCard key={b.id} booker={b} onEdit={() => openEdit(b)} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <Users className="w-5 h-5" />
              {editing ? 'Edit Booker' : 'Add Order Booker'}
            </DialogTitle>
            <DialogDescription>
              {editing ? `Update ${editing.name}` : 'Create an order booker account. Booker will be able to book orders for selected companies.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium">Full Name *</Label>
                <Input id="name" placeholder="Ahmed Khan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="employeeCode" className="text-xs font-medium">Employee Code</Label>
                <Input
                  id="employeeCode"
                  placeholder="OB-001"
                  value={form.employeeCode}
                  onChange={(e) => setForm({ ...form, employeeCode: e.target.value.toUpperCase() })}
                  disabled={!!editing}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ahmed.khan@erp.local"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">Phone</Label>
                <Input id="phone" placeholder="+92 300 1234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                Password {!editing && <span className="text-rose-600">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={editing ? 'Leave blank to keep current password' : 'Set login password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editing}
              />
              {editing && <p className="text-[10px] text-muted-foreground">Only enter if you want to reset the password (not yet supported — leave blank).</p>}
            </div>

            {editing && (
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-medium">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Company Coverage *</p>
                <Badge variant="outline" className="ml-auto text-[10px] font-mono">
                  {selectedCompanyIds.length} selected
                </Badge>
              </div>
              {companies.length === 0 ? (
                <p className="text-xs text-muted-foreground">No companies available. Create a company first.</p>
              ) : (
                <div className="space-y-2">
                  {companies.map((c, idx) => {
                    const checked = selectedCompanyIds.includes(c.id)
                    const color = COLORS[idx % COLORS.length]
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 p-2 rounded-md border transition-colors ${checked ? 'border-emerald-300 bg-white dark:bg-zinc-900 dark:border-emerald-800' : 'border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50'}`}
                      >
                        <Checkbox id={`bco-${c.id}`} checked={checked} onCheckedChange={() => toggleCompany(c.id)} />
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold ${COLOR_CLS[color]}`}>
                          {c.code.slice(-2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <label htmlFor={`bco-${c.id}`} className="text-sm font-medium cursor-pointer flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground">{c.code}</span>
                            <span className="truncate">{c.name}</span>
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {selectedCompanyIds.length === 1 && (
                <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Typical setup: 1 booker covers 2 companies. You may want to add one more.</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                Booker can only book orders for the companies selected here. Shop assignments are managed separately.
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
                {(createMut.isPending || updateMut.isPending) ? 'Saving...' : editing ? 'Update Booker' : 'Create Booker'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BookerCard({ booker, onEdit }: { booker: Booker; onEdit: () => void }) {
  const initials = booker.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const orderCount = booker._count?.orders || 0
  const shopCount = booker._count?.shopAssign || 0
  const companyCount = booker.companyMaps?.length || 0

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 transition-all group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{booker.name}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{booker.employeeCode}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="space-y-1.5 mb-3">
          {booker.user?.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{booker.user.email}</span>
            </div>
          )}
          {booker.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 shrink-0" />
              <span className="truncate">{booker.phone}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <StatusBadge status={booker.status} />
          <Badge variant="outline" className="text-[10px] font-mono">
            {companyCount} {companyCount === 1 ? 'company' : 'companies'}
          </Badge>
        </div>

        {/* Company badges */}
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">Company Coverage</p>
          <div className="flex flex-wrap gap-1">
            {booker.companyMaps?.map((m, idx) => {
              const color = COLORS[idx % COLORS.length]
              return (
                <span
                  key={m.id}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${COLOR_CLS[color]}`}
                  title={m.company.name}
                >
                  {m.company.code}
                </span>
              )
            })}
            {companyCount === 0 && (
              <span className="text-[10px] text-rose-600 italic">No company assigned</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{orderCount}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Orders</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 flex items-center justify-center">
              <Store className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{shopCount}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Shops</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BookersModule
