'use client'

import { Card, CardContent } from '@/components/ui/card'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function StatCard({
  title, value, icon: Icon, hint, tone = 'emerald', loading,
}: {
  title: string
  value: string | number
  icon: LucideIcon
  hint?: string
  tone?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'
  loading?: boolean
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  }
  return (
    <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow group">
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          {loading ? (
            <div className="h-7 w-24 bg-muted rounded animate-pulse mt-1" />
          ) : (
            <p className="font-bold mt-1 tabular-nums leading-tight text-lg md:text-xl lg:text-2xl break-words">{value}</p>
          )}
          {hint && <p className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform', tones[tone])}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDING: { cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300', label: 'Pending' },
    APPROVED: { cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300', label: 'Approved' },
    PICKED: { cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300', label: 'Picked' },
    DISPATCHED: { cls: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300', label: 'Dispatched' },
    DELIVERED: { cls: 'bg-emerald-600 text-white', label: 'Delivered' },
    CANCELLED: { cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300', label: 'Cancelled' },
    DRAFT: { cls: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300', label: 'Draft' },
    UNPAID: { cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300', label: 'Unpaid' },
    PARTIAL: { cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300', label: 'Partial' },
    PAID: { cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300', label: 'Paid' },
    OVERDUE: { cls: 'bg-rose-600 text-white', label: 'Overdue' },
    RECEIVED: { cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300', label: 'Received' },
    CLEARED: { cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300', label: 'Cleared' },
    BOUNCED: { cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300', label: 'Bounced' },
    ACTIVE: { cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300', label: 'Active' },
    INACTIVE: { cls: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300', label: 'Inactive' },
    BLACKLISTED: { cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300', label: 'Blacklisted' },
  }
  const s = map[status] || { cls: 'bg-zinc-100 text-zinc-800', label: status }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="font-medium text-muted-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{hint}</p>}
    </div>
  )
}
