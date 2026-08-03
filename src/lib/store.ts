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
  | 'purchase-invoices'
  | 'order-entry'
  | 'batches'
  | 'orders'
  | 'invoices'
  | 'accounts'
  | 'payments'
  | 'reports'

interface AppState {
  activeModule: ModuleKey
  activeCompanyId: string | 'ALL'
  activeCurrency: string
  activeBatchId: string | null
  sidebarOpen: boolean
  setModule: (m: ModuleKey) => void
  setCompany: (c: string) => void
  setCurrency: (c: string) => void
  setActiveBatch: (b: string | null) => void
  toggleSidebar: () => void
  setSidebar: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeModule: 'dashboard',
      activeCompanyId: 'ALL',
      activeCurrency: 'PKR',
      activeBatchId: null,
      sidebarOpen: false,
      setModule: (m) => set({ activeModule: m, sidebarOpen: false }),
      setCompany: (c) => set({ activeCompanyId: c }),
      setCurrency: (c) => set({ activeCurrency: c }),
      setActiveBatch: (b) => set({ activeBatchId: b }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebar: (v) => set({ sidebarOpen: v }),
    }),
    { name: 'erp-store' }
  )
)
