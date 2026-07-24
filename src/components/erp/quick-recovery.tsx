'use client'

import { useState } from 'react'
import { useCreatePayment, useShops, useBookers } from '@/lib/api-hooks'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/erp-types'
import {
  Loader2, Zap, Trash2, Plus, User, Store, CheckCircle2, AlertCircle, Wallet, X,
} from 'lucide-react'

interface QueuedRecovery {
  id: string
  bookerId: string
  bookerName: string
  companyId: string
  companyName: string
  shopId: string
  shopName: string
  shopCode: string
  amount: number
  paymentMode: string
  referenceNo?: string
  outstandingBefore: number
}

interface QuickRecoveryProps {
  trigger?: React.ReactNode
  onDone?: () => void
}

export function QuickRecovery({ trigger, onDone }: QuickRecoveryProps) {
  const [open, setOpen] = useState(false)
  const { data: bookers } = useBookers()

  // Step state
  const [bookerId, setBookerId] = useState('')
  const [shopId, setShopId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [referenceNo, setReferenceNo] = useState('')

  // Queue
  const [queue, setQueue] = useState<QueuedRecovery[]>([])
  const [submitting, setSubmitting] = useState(false)
  const createMut = useCreatePayment()
  const { toast } = useToast()

  // Fetch shops assigned to this booker
  const { data: shops } = useShops({ bookerId } as any)
  const selectedBooker = (bookers || []).find((b: any) => b.id === bookerId)
  const selectedShop = (shops || []).find((s: any) => s.id === shopId)

  // Determine company for the selected shop (use first company link the booker is assigned to)
  const bookerCompanyIds = (selectedBooker?.companyMaps || []).map((m: any) => m.companyId)
  const shopCompanyLink = (selectedShop?.companyLinks || []).find((l: any) => bookerCompanyIds.includes(l.companyId))
  const companyId = shopCompanyLink?.companyId || ''
  const outstanding = shopCompanyLink?.outstandingBalance || 0

  function resetForm() {
    setShopId('')
    setAmount('')
    setReferenceNo('')
    setPaymentMode('CASH')
  }

  function addToQueue() {
    if (!bookerId || !shopId || !amount) {
      toast({ title: 'Missing fields', description: 'Select booker, shop, and enter amount', variant: 'destructive' })
      return
    }
    if (!companyId) {
      toast({ title: 'No company link', description: 'This shop is not linked to any of the booker\'s assigned companies', variant: 'destructive' })
      return
    }
    // Prevent duplicate shop entry — replace if already exists
    const existing = queue.find((q) => q.shopId === shopId && q.companyId === companyId)
    if (existing) {
      toast({ title: 'Already added', description: `${selectedShop?.name} already in queue. Update amount by removing and re-adding.`, variant: 'destructive' })
      return
    }

    const newItem: QueuedRecovery = {
      id: `${Date.now()}-${Math.random()}`,
      bookerId,
      bookerName: selectedBooker?.name || '',
      companyId,
      companyName: shopCompanyLink?.company?.name || '',
      shopId,
      shopName: selectedShop?.name || '',
      shopCode: selectedShop?.code || '',
      amount: Number(amount),
      paymentMode,
      referenceNo: referenceNo || undefined,
      outstandingBefore: outstanding,
    }
    setQueue([...queue, newItem])
    resetForm()
    toast({ title: 'Added to queue', description: `${selectedShop?.name}: ${formatCurrency(Number(amount))}` })
  }

  function removeFromQueue(id: string) {
    setQueue(queue.filter((q) => q.id !== id))
  }

  function changeBooker(v: string) {
    setBookerId(v)
    setShopId('')
    setAmount('')
    setReferenceNo('')
  }

  async function submitAll() {
    if (queue.length === 0) {
      toast({ title: 'Queue empty', description: 'Add at least one recovery first', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const item of queue) {
      try {
        await createMut.mutateAsync({
          companyId: item.companyId,
          shopId: item.shopId,
          amount: item.amount,
          paymentMode: item.paymentMode,
          currency: 'PKR',
          currencyRate: 1,
          referenceNo: item.referenceNo,
          bookerId: item.bookerId,
          notes: `Quick recovery by ${item.bookerName}`,
        })
        success++
      } catch (e: any) {
        failed++
        errors.push(`${item.shopName}: ${e.message}`)
      }
    }

    setSubmitting(false)
    if (success > 0) {
      toast({
        title: `✓ ${success} recoveries recorded`,
        description: failed > 0
          ? `${failed} failed. Balances updated for ${success} shops.`
          : `All ${success} shop balances updated successfully.`,
      })
    }
    if (failed > 0 && success === 0) {
      toast({ title: 'All failed', description: errors.join('; ').slice(0, 200), variant: 'destructive' })
    }

    // Reset and close only if at least one succeeded
    if (success > 0) {
      setQueue([])
      setOpen(false)
      onDone?.()
    }
  }

  const totalQueueAmount = queue.reduce((s, q) => s + q.amount, 0)

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) {
        // On close, reset everything (warn if queue has items)
        if (queue.length > 0) {
          // keep queue in case they reopen
        }
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            <Zap className="w-4 h-4 mr-1" /> Quick Recovery
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> Quick Recovery (Batch)
          </DialogTitle>
          <DialogDescription>
            Select order booker → add recoveries for their shops → click OK to save all and update balances.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4">
            {/* Queued recoveries list (shows at top) */}
            {queue.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20 overflow-hidden">
                <div className="px-3 py-2 border-b border-emerald-200 dark:border-emerald-900/50 bg-emerald-100/50 dark:bg-emerald-950/40 flex items-center justify-between">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Queued Recoveries ({queue.length})
                  </p>
                  <Badge className="bg-emerald-600 text-white">
                    {formatCurrency(totalQueueAmount)}
                  </Badge>
                </div>
                <div className="divide-y divide-emerald-100 dark:divide-emerald-900/30">
                  {queue.map((q, i) => (
                    <div key={q.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                      <span className="text-muted-foreground w-5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {q.shopName} <span className="text-muted-foreground">({q.shopCode})</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {q.companyName} · {q.paymentMode}
                          {q.referenceNo && ` · Ref: ${q.referenceNo}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(q.amount)}</p>
                        {q.outstandingBefore > 0 && (
                          <p className="text-[9px] text-muted-foreground">was: {formatCurrency(q.outstandingBefore)}</p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        onClick={() => removeFromQueue(q.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Select Booker */}
            <div>
              <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5" /> 1. Select Order Booker *
              </Label>
              <Select value={bookerId} onValueChange={changeBooker}>
                <SelectTrigger><SelectValue placeholder="Choose order booker" /></SelectTrigger>
                <SelectContent>
                  {(bookers || []).filter((b: any) => b.user?.status === 'ACTIVE').map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.employeeCode} · {b.name} ({b.companyMaps?.length || 0} companies)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBooker && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Companies: {(selectedBooker.companyMaps || []).map((m: any) => m.company?.code).join(', ')}
                </p>
              )}
            </div>

            {/* Step 2: Select Shop (filtered by booker) */}
            {bookerId && (
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Store className="w-3.5 h-3.5" /> 2. Select Shop (only {selectedBooker?.name}&apos;s shops)
                </Label>
                <Select value={shopId} onValueChange={setShopId}>
                  <SelectTrigger><SelectValue placeholder="Choose shop" /></SelectTrigger>
                  <SelectContent>
                    {(shops || []).map((s: any) => {
                      const link = (s.companyLinks || []).find((l: any) => bookerCompanyIds.includes(l.companyId))
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {s.code} · {s.name} {link?.outstandingBalance > 0 ? `(Out: ${formatCurrency(link.outstandingBalance)})` : '(Clear)'}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {shops?.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> No shops assigned to this booker yet.
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Amount + Mode */}
            {shopId && (
              <>
                {/* Outstanding info */}
                {outstanding > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-2.5 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-amber-600" />
                      Current Outstanding:
                    </span>
                    <div className="flex items-center gap-2">
                      <strong className="text-amber-700 dark:text-amber-400">{formatCurrency(outstanding)}</strong>
                      <button
                        onClick={() => setAmount(String(outstanding))}
                        className="text-[10px] text-amber-600 hover:underline px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40"
                      >
                        Fill full
                      </button>
                    </div>
                  </div>
                )}

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

                {paymentMode !== 'CASH' && (
                  <div>
                    <Label className="text-xs">Reference No.</Label>
                    <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Cheque / Txn ID" />
                  </div>
                )}

                <Button onClick={addToQueue} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Add to Queue
                </Button>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {queue.length > 0 ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <strong>{queue.length}</strong> recovery{queue.length > 1 ? 's' : ''} queued · Total: <strong>{formatCurrency(totalQueueAmount)}</strong>
              </span>
            ) : (
              <span>Add recoveries to queue first</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setQueue([]); setOpen(false) }}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button
              onClick={submitAll}
              disabled={queue.length === 0 || submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              OK — Submit All ({queue.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
