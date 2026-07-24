'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ModuleKey =
  | 'dashboard'
  | 'companies'
  | 'shops'
  | 'bookers'
  | 'products'
  | 'warehouse'
  | 'order-entry'
  | 'orders'
  | 'invoices'
  | 'accounts'
  | 'payments'
  | 'reports'

interface AppState {
  activeModule: ModuleKey
  activeCompanyId: string | 'ALL'
  activeCurrency: string
  sidebarOpen: boolean
  setModule: (m: ModuleKey) => void
  setCompany: (c: string) => void
  setCurrency: (c: string) => void
  toggleSidebar: () => void
  setSidebar: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeModule: 'dashboard',
      activeCompanyId: 'ALL',
      activeCurrency: 'PKR',
      sidebarOpen: false,
      setModule: (m) => set({ activeModule: m, sidebarOpen: false }),
      setCompany: (c) => set({ activeCompanyId: c }),
      setCurrency: (c) => set({ activeCurrency: c }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebar: (v) => set({ sidebarOpen: v }),
    }),
    { name: 'erp-store' }
  )
)
