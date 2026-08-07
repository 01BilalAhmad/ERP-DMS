'use client'

import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Building2, Store, Users, Package, Warehouse,
  ShoppingCart, ClipboardList, FileText, Wallet, CreditCard, BarChart3, Layers, PackagePlus, CheckSquare, Tag, RotateCcw,
  LogOut, Menu, X, Moon, Sun, ChevronDown, Building, Coins, User as UserIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from 'next-themes'
import { useAppStore, type ModuleKey } from '@/lib/store'
import { useSession, useCompanies, useCurrencies } from '@/lib/api-hooks'

const NAV_GROUPS: { label: string; items: { key: ModuleKey; label: string; icon: any; roles?: string[] }[] }[] = [
  { label: 'Overview', items: [{ key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Master Data',
    items: [
      { key: 'companies', label: 'Companies', icon: Building2, roles: ['SUPER_ADMIN', 'COMPANY_MANAGER'] },
      { key: 'shops', label: 'Shops', icon: Store },
      { key: 'bookers', label: 'Order Bookers', icon: Users, roles: ['SUPER_ADMIN', 'COMPANY_MANAGER'] },
      { key: 'products', label: 'Products', icon: Package },
      { key: 'schemes', label: 'Schemes', icon: Tag, roles: ['SUPER_ADMIN', 'COMPANY_MANAGER'] },
      { key: 'warehouse', label: 'Warehouse & Stock', icon: Warehouse, roles: ['SUPER_ADMIN', 'COMPANY_MANAGER', 'WAREHOUSE'] },
      { key: 'purchase-invoices', label: 'Purchase Invoices', icon: PackagePlus, roles: ['SUPER_ADMIN', 'COMPANY_MANAGER', 'WAREHOUSE'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: 'order-entry', label: 'New Order', icon: ShoppingCart },
      { key: 'bulk-process', label: 'Bulk Process', icon: CheckSquare },
      { key: 'batches', label: 'Batches & Pick Lists', icon: Layers },
      { key: 'orders', label: 'Orders', icon: ClipboardList },
      { key: 'invoices', label: 'Invoices', icon: FileText, roles: ['SUPER_ADMIN', 'COMPANY_MANAGER', 'ACCOUNTS'] },
      { key: 'sale-returns', label: 'Sale Returns', icon: RotateCcw, roles: ['SUPER_ADMIN', 'COMPANY_MANAGER', 'WAREHOUSE'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { key: 'payments', label: 'Payments', icon: CreditCard, roles: ['SUPER_ADMIN', 'COMPANY_MANAGER', 'ACCOUNTS', 'ORDER_BOOKER'] },
      { key: 'accounts', label: 'Ledger', icon: Wallet, roles: ['SUPER_ADMIN', 'COMPANY_MANAGER', 'ACCOUNTS'] },
    ],
  },
  { label: 'Insights', items: [{ key: 'reports', label: 'Reports', icon: BarChart3 }] },
]

function NavList({ role }: { role: string }) {
  const { activeModule, setModule } = useAppStore()
  const navItems = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.includes(role)),
  }))
  return (
    <nav className="flex flex-col gap-5 p-3">
      {navItems.map((group) =>
        group.items.length === 0 ? null : (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{group.label}</p>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = activeModule === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => setModule(item.key)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      active
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      )}
    </nav>
  )
}

function CompanySwitcher() {
  const { activeCompanyId, setCompany } = useAppStore()
  const { data } = useCompanies()
  return (
    <Select value={activeCompanyId} onValueChange={setCompany}>
      <SelectTrigger className="w-[180px] h-9 bg-white dark:bg-zinc-900 border-emerald-200 dark:border-emerald-900/50">
        <div className="flex items-center gap-2">
          <Building className="w-3.5 h-3.5 text-emerald-600" />
          <SelectValue placeholder="All Companies" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All Companies</SelectItem>
        {data?.map((c: any) => (
          <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CurrencySwitcher() {
  const { activeCurrency, setCurrency } = useAppStore()
  const { data } = useCurrencies()
  return (
    <Select value={activeCurrency} onValueChange={setCurrency}>
      <SelectTrigger className="w-[100px] h-9 bg-white dark:bg-zinc-900 border-emerald-200 dark:border-emerald-900/50">
        <div className="flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {data?.map((c: any) => (
          <SelectItem key={c.code} value={c.code}>
            {c.code} {c.isDefault ? '★' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function UserMenu({ name, email, role }: { name: string; email: string; role: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold dark:bg-emerald-900 dark:text-emerald-200">
              {name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start leading-tight">
            <span className="text-xs font-semibold">{name}</span>
            <span className="text-[10px] text-muted-foreground">{role}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            <span className="text-xs text-muted-foreground font-normal">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs text-muted-foreground">
          <UserIcon className="w-4 h-4 mr-2" /> Role: {role}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ redirect: false }).then(() => window.location.reload())}
          className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/40"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebar } = useAppStore()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

  const role = (session?.role as string) || 'VIEWER'
  const userName = session?.name || 'User'
  const email = session?.email || ''

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-40 h-14 border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center gap-2 px-3 md:px-5">
        <Sheet open={sidebarOpen} onOpenChange={setSidebar}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="h-14 flex items-center gap-2 px-4 border-b bg-emerald-600 text-white">
              <Building2 className="w-5 h-5" />
              <span className="font-bold">Distribution ERP</span>
              <Button variant="ghost" size="icon" className="ml-auto text-white hover:bg-emerald-700 md:hidden" onClick={() => setSidebar(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="overflow-y-auto h-[calc(100vh-3.5rem)]">
              <NavList role={role} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-tight">Distribution ERP</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Multi-Company Distribution</p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2">
          {role !== 'ORDER_BOOKER' && <CompanySwitcher />}
          <CurrencySwitcher />
        </div>

        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="h-9 w-9">
          <Sun className="w-4 h-4 dark:hidden" />
          <Moon className="w-4 h-4 hidden dark:block" />
        </Button>

        <UserMenu name={userName} email={email} role={role} />
      </header>

      <div className="flex-1 flex">
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-white dark:bg-zinc-900">
          <div className="flex-1 overflow-y-auto">
            <NavList role={role} />
          </div>
          <div className="p-3 border-t bg-emerald-50/50 dark:bg-emerald-950/20">
            <p className="text-[10px] text-muted-foreground text-center">v1.0 · {new Date().getFullYear()}</p>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="p-3 md:p-6 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>

      <footer className="border-t bg-white dark:bg-zinc-900 py-2.5 px-4 text-center text-xs text-muted-foreground">
        Distribution ERP · Multi-Company Sales &amp; Distribution · Sales Tax + Filer/Non-Filer Tax Compliant
      </footer>
    </div>
  )
}
