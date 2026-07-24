'use client'

import { useState } from 'react'
import { useCreatePayment, useShops, useCompanies } from '@/lib/api-hooks'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/erp-types'
import { Loader2, Zap, Wallet } from 'lucide-react'

interface QuickRecoveryProps {
  presetCompanyId?: string
  presetShopId?: string
  trigger?: React.ReactNode
  onDone?: () => void
}

export function QuickRecovery({ presetCompanyId, presetShopId, trigger, onDone }: QuickRecoveryProps) {
  const [open, setOpen] = useState(false)
  const { data: companies } = useCompanies()
  const [companyId, setCompanyId] = useState(presetCompanyId || '')
  const [shopId, setShopId] = useState(presetShopId || '')
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [referenceNo, setReferenceNo] = useState('')
  const createMut = useCreatePayment()
  const { toast } = useToast()

  const { data: shops } = useShops({ companyId })
  const selectedShop = (shops || []).find((s: any) => s.id === shopId)
  const shopLink = selectedShop?.companyLinks?.find((l: any) => l.companyId === companyId)
  const outstanding = shopLink?.outstandingBalance || 0

  async function submit() {
    if (!companyId || !shopId || !amount) {
      toast({ title: 'Missing fields', description: 'Company, shop, and amount are required', variant: 'destructive' })
      return
    }
    try {
      await createMut.mutateAsync({
        companyId, shopId, amount: Number(amount), paymentMode, currency: 'PKR', currencyRate: 1,
        referenceNo, notes: 'Quick recovery (field collection)',
      })
      toast({
        title: '✓ Recovery Recorded',
        description: `${formatCurrency(Number(amount))} collected from ${selectedShop?.name || 'shop'}`,
      })
      setOpen(false)
      setAmount(''); setReferenceNo('')
      onDone?.()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (v) {
        setCompanyId(presetCompanyId || '')
        setShopId(presetShopId || '')
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            <Zap className="w-4 h-4 mr-1" /> Quick Recovery
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> Quick Recovery
          </DialogTitle>
          <DialogDescription>
            Fast payment collection — record cash/cheque received from a shop in seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {/* Company */}
          <div>
            <Label className="text-xs">Company *</Label>
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setShopId('') }}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Shop */}
          <div>
            <Label className="text-xs">Shop *</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger><SelectValue placeholder="Select shop" /></SelectTrigger>
              <SelectContent>
                {(shops || []).filter((s: any) => s.companyLinks?.some((l: any) => l.companyId === companyId)).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.code} · {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Outstanding info */}
          {selectedShop && (
            <div className={`rounded-lg border p-2.5 text-xs ${outstanding > 0 ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30' : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30'}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />
                  Current Outstanding:
                </span>
                <strong className={outstanding > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}>
                  {formatCurrency(outstanding)}
                </strong>
              </div>
              {outstanding > 0 && (
                <button
                  onClick={() => setAmount(String(outstanding))}
                  className="mt-1 text-[10px] text-amber-600 hover:underline"
                >
                  ↳ Click to fill full outstanding amount
                </button>
              )}
            </div>
          )}

          {/* Amount + Mode */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Amount *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus />
            </div>
            <div>
              <Label className="text-xs">Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reference (optional) */}
          {paymentMode !== 'CASH' && (
            <div>
              <Label className="text-xs">Reference No.</Label>
              <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Cheque / Txn ID" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={createMut.isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
            Record Recovery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
