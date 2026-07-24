'use client'

import { useState, useEffect } from 'react'
import { useCompanies, useCreateCompany, useUpdateCompany } from '@/lib/api-hooks'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Building2, Plus, Pencil, Search, Building, FileText, Percent, Coins } from 'lucide-react'

type Company = {
  id: string
  code: string
  name: string
  address?: string | null
  phone?: string | null
  ntn?: string | null
  strn?: string | null
  taxType: string
  salesTaxRate: number
  filerTaxRate: number
  nonFilerTaxRate: number
  furtherTaxRate: number
  defaultCurrency: string
  status: string
}

const emptyForm = {
  code: '',
  name: '',
  address: '',
  phone: '',
  ntn: '',
  strn: '',
  taxType: 'FILER' as 'FILER' | 'NON_FILER',
  salesTaxRate: 17,
  filerTaxRate: 4.5,
  nonFilerTaxRate: 8,
  furtherTaxRate: 3,
  defaultCurrency: 'PKR',
  status: 'ACTIVE',
}

export function CompaniesModule() {
  const { data, isLoading } = useCompanies()
  const { toast } = useToast()
  const createMut = useCreateCompany()
  const updateMut = useUpdateCompany()

  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [form, setForm] = useState(emptyForm)

  const companies: Company[] = (data as Company[]) || []

  const filtered = companies.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.ntn || '').toLowerCase().includes(q)
    )
  })

  const stats = {
    total: companies.length,
    filers: companies.filter((c) => c.taxType === 'FILER').length,
    nonFilers: companies.filter((c) => c.taxType === 'NON_FILER').length,
    active: companies.filter((c) => c.status === 'ACTIVE').length,
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(c: Company) {
    setEditing(c)
    setForm({
      code: c.code,
      name: c.name,
      address: c.address || '',
      phone: c.phone || '',
      ntn: c.ntn || '',
      strn: c.strn || '',
      taxType: (c.taxType as 'FILER' | 'NON_FILER') || 'FILER',
      salesTaxRate: c.salesTaxRate,
      filerTaxRate: c.filerTaxRate,
      nonFilerTaxRate: c.nonFilerTaxRate,
      furtherTaxRate: c.furtherTaxRate,
      defaultCurrency: c.defaultCurrency || 'PKR',
      status: c.status || 'ACTIVE',
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code || !form.name) {
      toast({ title: 'Validation error', description: 'Company code and name are required', variant: 'destructive' })
      return
    }
    const payload = {
      ...form,
      salesTaxRate: Number(form.salesTaxRate),
      filerTaxRate: Number(form.filerTaxRate),
      nonFilerTaxRate: Number(form.nonFilerTaxRate),
      furtherTaxRate: Number(form.furtherTaxRate),
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload })
        toast({ title: 'Company updated', description: `${payload.name} saved successfully` })
      } else {
        await createMut.mutateAsync(payload)
        toast({ title: 'Company created', description: `${payload.name} added with auto warehouse section` })
      }
      setDialogOpen(false)
    } catch (err: any) {
      toast({ title: 'Failed to save company', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Manage distribution companies with tax configuration"
        actions={
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4" /> Add Company
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <StatCard title="Total Companies" value={stats.total} icon={Building2} tone="emerald" loading={isLoading} />
        <StatCard title="Filers" value={stats.filers} icon={FileText} tone="sky" hint="Withholding 4.5%" loading={isLoading} />
        <StatCard title="Non-Filers" value={stats.nonFilers} icon={FileText} tone="amber" hint="Withholding 8% + Further Tax" loading={isLoading} />
        <StatCard title="Active" value={stats.active} icon={Building} tone="violet" loading={isLoading} />
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code or NTN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary" className="ml-auto bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}
            </Badge>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Building2} title="No companies found" hint="Add your first company to start booking orders and managing shops." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code / Name</TableHead>
                    <TableHead>NTN</TableHead>
                    <TableHead>Tax Type</TableHead>
                    <TableHead className="text-right">Sales Tax</TableHead>
                    <TableHead className="text-right">WHT Filer</TableHead>
                    <TableHead className="text-right">WHT Non-Filer</TableHead>
                    <TableHead className="text-right">Further Tax</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">
                            {c.code.slice(-2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.name}</p>
                            <p className="text-[11px] text-muted-foreground">{c.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{c.ntn || '—'}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.taxType === 'FILER'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {c.taxType === 'FILER' ? 'Filer' : 'Non-Filer'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{c.salesTaxRate}%</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{c.filerTaxRate}%</TableCell>
                      <TableCell className="text-right font-mono text-xs">{c.nonFilerTaxRate}%</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {c.furtherTaxRate > 0 ? (
                          <span className="text-amber-700 dark:text-amber-300">{c.furtherTaxRate}%</span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">{c.defaultCurrency}</Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(c)}
                          className="h-8 w-8 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <Building2 className="w-5 h-5" />
              {editing ? 'Edit Company' : 'Add Company'}
            </DialogTitle>
            <DialogDescription>
              {editing ? `Update ${editing.name}` : 'Create a new distribution company with tax configuration. A warehouse section will be created automatically.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-medium">Company Code *</Label>
                <Input
                  id="code"
                  placeholder="COMP-A"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  disabled={!!editing}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium">Company Name *</Label>
                <Input
                  id="name"
                  placeholder="Alpha Distributors"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-medium">Address</Label>
              <Input
                id="address"
                placeholder="Plot 12, Industrial Area, Karachi"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+92 21 1234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ntn" className="text-xs font-medium">NTN</Label>
                <Input
                  id="ntn"
                  placeholder="1234567-8"
                  value={form.ntn}
                  onChange={(e) => setForm({ ...form, ntn: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="strn" className="text-xs font-medium">STRN</Label>
                <Input
                  id="strn"
                  placeholder="1701234567890"
                  value={form.strn}
                  onChange={(e) => setForm({ ...form, strn: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Percent className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Tax Configuration</p>
                <span className="text-[10px] text-muted-foreground">(Sales Tax + Filer/Non-Filer Withholding)</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="taxType" className="text-xs font-medium">Company Tax Type</Label>
                  <Select value={form.taxType} onValueChange={(v) => setForm({ ...form, taxType: v as 'FILER' | 'NON_FILER' })}>
                    <SelectTrigger id="taxType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FILER">Filer</SelectItem>
                      <SelectItem value="NON_FILER">Non-Filer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salesTaxRate" className="text-xs font-medium">Sales Tax %</Label>
                  <Input
                    id="salesTaxRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.salesTaxRate}
                    onChange={(e) => setForm({ ...form, salesTaxRate: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filerTaxRate" className="text-xs font-medium">WHT Filer %</Label>
                  <Input
                    id="filerTaxRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.filerTaxRate}
                    onChange={(e) => setForm({ ...form, filerTaxRate: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nonFilerTaxRate" className="text-xs font-medium">WHT Non-Filer %</Label>
                  <Input
                    id="nonFilerTaxRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.nonFilerTaxRate}
                    onChange={(e) => setForm({ ...form, nonFilerTaxRate: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="furtherTaxRate" className="text-xs font-medium">Further Tax %</Label>
                  <Input
                    id="furtherTaxRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.furtherTaxRate}
                    onChange={(e) => setForm({ ...form, furtherTaxRate: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="defaultCurrency" className="text-xs font-medium">Default Currency</Label>
                  <Select value={form.defaultCurrency} onValueChange={(v) => setForm({ ...form, defaultCurrency: v })}>
                    <SelectTrigger id="defaultCurrency">
                      <div className="flex items-center gap-2">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PKR">PKR — Pakistani Rupee</SelectItem>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR — Euro</SelectItem>
                      <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Sales Tax applies to all taxable supplies. Withholding Tax (WHT) is deducted at source. Further Tax applies only to non-filer shops.
              </p>
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

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {(createMut.isPending || updateMut.isPending) ? 'Saving...' : editing ? 'Update Company' : 'Create Company'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CompaniesModule
