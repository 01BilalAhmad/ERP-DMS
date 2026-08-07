'use client'

import { useState } from 'react'
import { useSchemes, useCreateScheme, useUpdateScheme, useCompanies, useProducts } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/erp/ui-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/erp-types'
import { Tag, Plus, Edit3, Loader2, Percent, DollarSign, Gift, CheckCircle2, AlertTriangle } from 'lucide-react'

const SCHEME_TYPES = [
  { value: 'DISCOUNT_PCT', label: 'Discount %', icon: Percent },
  { value: 'DISCOUNT_AMOUNT', label: 'Discount Amount', icon: DollarSign },
  { value: 'BONUS_QTY', label: 'Bonus Quantity', icon: Gift },
]

export function SchemesModule() {
  const { activeCompanyId } = useAppStore()
  const [companyId, setCompanyId] = useState(activeCompanyId === 'ALL' ? '' : activeCompanyId)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const { data, isLoading } = useSchemes({ companyId: companyId || undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined })
  const { data: companies } = useCompanies()
  const schemes = data || []

  return (
    <div>
      <PageHeader title="Schemes & Trade Offers" subtitle="Manage product-wise discounts, bonus quantities, and trade offers"
        actions={<Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditing(null); setShowDialog(true) }}><Plus className="w-4 h-4 mr-1" /> Add Scheme</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard title="Total Schemes" value={schemes.length} icon={Tag} tone="emerald" loading={isLoading} />
        <StatCard title="Active" value={schemes.filter((s: any) => s.status === 'ACTIVE').length} icon={CheckCircle2} tone="sky" loading={isLoading} />
        <StatCard title="Expired" value={schemes.filter((s: any) => s.endDate && new Date(s.endDate) < new Date()).length} icon={AlertTriangle} tone="amber" loading={isLoading} />
        <StatCard title="Companies" value={companies?.length || 0} icon={Tag} tone="violet" />
      </div>
      <Card className="mb-4"><CardContent className="p-3 flex gap-2">
        <Select value={companyId} onValueChange={(v) => setCompanyId(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Companies" /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All Companies</SelectItem>{companies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">All Statuses</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent>
        </Select>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        : schemes.length === 0 ? <EmptyState icon={Tag} title="No schemes yet" hint="Add trade offers, discounts, or bonus quantities per product." />
        : <ScrollArea className="max-h-[65vh]"><Table>
          <TableHeader><TableRow>
            <TableHead>Product</TableHead><TableHead>Company</TableHead><TableHead>Scheme Name</TableHead><TableHead>Type</TableHead>
            <TableHead className="text-right">Value</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Edit</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {schemes.map((s: any) => {
              const ti = SCHEME_TYPES.find(t => t.value === s.type) || SCHEME_TYPES[0]
              return (
                <TableRow key={s.id}>
                  <TableCell><p className="text-sm font-medium">{s.product?.name}</p><p className="text-[10px] text-muted-foreground font-mono">{s.product?.code}</p></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.company?.code}</Badge></TableCell>
                  <TableCell className="text-sm">{s.name}</TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-xs">{ti.label}</span></TableCell>
                  <TableCell className="text-right font-semibold">{s.type === 'DISCOUNT_PCT' ? `${s.value}%` : s.type === 'DISCOUNT_AMOUNT' ? formatCurrency(s.value) : `${s.value} units`}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(s); setShowDialog(true) }}><Edit3 className="w-3.5 h-3.5" /></Button></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table></ScrollArea>}
      </CardContent></Card>
      <SchemeDialog open={showDialog} onClose={() => { setShowDialog(false); setEditing(null) }} editing={editing} presetCompanyId={companyId} />
    </div>
  )
}

function SchemeDialog({ open, onClose, editing, presetCompanyId }: { open: boolean; onClose: () => void; editing: any; presetCompanyId: string }) {
  const { data: companies } = useCompanies()
  const [companyId, setCompanyId] = useState('')
  const [productId, setProductId] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('DISCOUNT_PCT')
  const [value, setValue] = useState('')
  const [minQty, setMinQty] = useState('0')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const createMut = useCreateScheme()
  const updateMut = useUpdateScheme()
  const { toast } = useToast()
  const effCompanyId = editing?.companyId || companyId || presetCompanyId
  const { data: products } = useProducts({ companyId: effCompanyId })
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      if (editing) {
        setCompanyId(editing.companyId); setProductId(editing.productId); setName(editing.name); setType(editing.type)
        setValue(String(editing.value)); setMinQty(String(editing.minQty || 0))
        setStartDate(new Date(editing.startDate).toISOString().slice(0, 10))
        setEndDate(editing.endDate ? new Date(editing.endDate).toISOString().slice(0, 10) : '')
        setStatus(editing.status)
      } else {
        setCompanyId(presetCompanyId || ''); setProductId(''); setName(''); setType('DISCOUNT_PCT')
        setValue(''); setMinQty('0'); setStartDate(new Date().toISOString().slice(0, 10)); setEndDate(''); setStatus('ACTIVE')
      }
    }
  }
  async function submit() {
    if (!effCompanyId || !productId || !name || !value) { toast({ title: 'Missing fields', variant: 'destructive' }); return }
    const body = { companyId: effCompanyId, productId, name, type, value: Number(value), minQty: Number(minQty || 0), startDate, endDate: endDate || null, status }
    try {
      if (editing) { await updateMut.mutateAsync({ id: editing.id, ...body }); toast({ title: 'Scheme updated' }) }
      else { await createMut.mutateAsync(body); toast({ title: 'Scheme created' }) }
      onClose()
    } catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }) }
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? 'Edit Scheme' : 'Add Scheme'}</DialogTitle><DialogDescription>Define a trade offer for a product</DialogDescription></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div><Label className="text-xs">Company *</Label><Select value={effCompanyId || 'NONE'} onValueChange={(v) => { if (v !== 'NONE') { setCompanyId(v); setProductId('') } }} disabled={!!editing}>
            <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
            <SelectContent>{!editing && <SelectItem value="NONE">Select company…</SelectItem>}{companies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}</SelectContent>
          </Select></div>
          <div><Label className="text-xs">Product *</Label><Select value={productId || 'NONE'} onValueChange={(v) => { if (v !== 'NONE') setProductId(v) }} disabled={!effCompanyId}>
            <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
            <SelectContent>{!editing && <SelectItem value="NONE">Select product…</SelectItem>}{(products || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name} ({formatCurrency(p.tradePrice)})</SelectItem>)}</SelectContent>
          </Select></div>
          <div><Label className="text-xs">Scheme Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Discount 10%" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Type *</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SCHEME_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Value *</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Min Qty</Label><Input type="number" value={minQty} onChange={(e) => setMinQty(e.target.value)} /></div>
            <div><Label className="text-xs">Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Start Date *</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label className="text-xs">End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={createMut.isPending || updateMut.isPending} className="bg-emerald-600 hover:bg-emerald-700">{(createMut.isPending || updateMut.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{editing ? 'Update' : 'Create'} Scheme</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
