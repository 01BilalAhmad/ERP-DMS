'use client'

import { useState } from 'react'
import { usePayments, useCreatePayment, useCompanies, useShops } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PageHeader, StatusBadge, EmptyState, StatCard } from '@/components/erp/ui-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useCurrencies } from '@/lib/api-hooks'
import { CreditCard, Plus, Wallet, TrendingDown, Loader2, Receipt } from 'lucide-react'

export function PaymentsModule() {
  const { activeCompanyId } = useAppStore()
  const companyId = activeCompanyId === 'ALL' ? undefined : activeCompanyId
  const { data, isLoading } = usePayments({ companyId })

  const total = data?.reduce((s: number, p: any) => s + p.amount, 0) || 0
  const today = data?.filter((p: any) => isToday(p.paymentDate)).reduce((s: number, p: any) => s + p.amount, 0) || 0

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Record payments received from shops (cash / cheque / transfer / online)"
        actions={<NewPaymentDialog />}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <StatCard title="Total Collected" value={formatCurrency(total)} icon={Wallet} tone="emerald" />
        <StatCard title="Today's Collection" value={formatCurrency(today)} icon={CreditCard} tone="sky" />
        <StatCard title="Transactions" value={data?.length || 0} icon={Receipt} tone="amber" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : data?.length ? (
            <ScrollArea className="max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-semibold">{p.paymentNo}</TableCell>
                      <TableCell className="text-xs">{new Date(p.paymentDate).toLocaleDateString('en-PK')}</TableCell>
                      <TableCell className="text-xs">{p.company?.code}</TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">{p.shop?.name}</TableCell>
                      <TableCell><span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">{p.paymentMode}</span></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.referenceNo || '—'}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">{formatCurrency(p.amount, p.currency)}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <EmptyState icon={CreditCard} title="No payments yet" hint="Click 'Receive Payment' to record a payment from a shop." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function NewPaymentDialog() {
  const [open, setOpen] = useState(false)
  const { data: companies } = useCompanies()
  const { data: currencies } = useCurrencies()
  const [companyId, setCompanyId] = useState('')
  const [shopId, setShopId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [currency, setCurrency] = useState('PKR')
  const [referenceNo, setReferenceNo] = useState('')
  const [bankName, setBankName] = useState('')
  const [notes, setNotes] = useState('')
  const createMut = useCreatePayment()
  const { toast } = useToast()

  const { data: shops } = useShops({ companyId })
  const selectedCurrency = currencies?.find((c: any) => c.code === currency)
  const rate = selectedCurrency?.rate || 1
  const baseAmount = Number(amount || 0) * rate

  async function submit() {
    if (!companyId || !shopId || !amount) {
      toast({ title: 'Missing fields', description: 'Company, shop, and amount are required', variant: 'destructive' })
      return
    }
    try {
      await createMut.mutateAsync({
        companyId, shopId, amount: Number(amount), paymentMode, currency, currencyRate: rate,
        referenceNo, bankName, notes,
      })
      toast({ title: 'Payment recorded', description: `${formatCurrency(Number(amount), currency)} received` })
      setOpen(false)
      setAmount(''); setReferenceNo(''); setBankName(''); setNotes(''); setShopId('')
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Receive Payment</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive Payment</DialogTitle>
          <DialogDescription>Record a payment received from a shop</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <Label className="text-xs">Company *</Label>
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setShopId('') }}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>{companies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Shop *</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger><SelectValue placeholder="Select shop" /></SelectTrigger>
              <SelectContent>
                {shops?.filter((s: any) => s.companyLinks?.some((l: any) => l.companyId === companyId)).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.code} · {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Amount *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{currencies?.map((c: any) => <SelectItem key={c.code} value={c.code}>{c.code} {c.isDefault ? '★' : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {currency !== 'PKR' && (
            <div className="text-xs p-2 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
              Rate: 1 {currency} = {rate} PKR → Base amount: <strong>{baseAmount.toFixed(2)} PKR</strong>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reference No.</Label>
              <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Cheque / Txn ID" />
            </div>
          </div>
          {paymentMode === 'CHEQUE' && (
            <div>
              <Label className="text-xs">Bank Name</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" />
            </div>
          )}
          <div>
            <Label className="text-xs">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={createMut.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function isToday(d: Date | string) {
  const date = new Date(d)
  const now = new Date()
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}
