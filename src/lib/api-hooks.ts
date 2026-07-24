'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

async function fetchJson(url: string) {
  const r = await fetch(url)
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: r.statusText }))
    throw new Error(e.error || 'Request failed')
  }
  return r.json()
}

export function useSession() {
  return useQuery({ queryKey: ['me'], queryFn: () => fetchJson('/api/me') })
}

export function useCompanies() {
  return useQuery({ queryKey: ['companies'], queryFn: () => fetchJson('/api/companies') })
}

export function useCurrencies() {
  return useQuery({ queryKey: ['currencies'], queryFn: () => fetchJson('/api/currencies') })
}

export function useShops(params: { q?: string; companyId?: string; status?: string; class?: string } = {}) {
  const u = new URLSearchParams()
  if (params.q) u.set('q', params.q)
  if (params.companyId) u.set('companyId', params.companyId)
  if (params.status) u.set('status', params.status)
  if (params.class) u.set('class', params.class)
  return useQuery({ queryKey: ['shops', params], queryFn: () => fetchJson(`/api/shops?${u}`) })
}

export function useBookers() {
  return useQuery({ queryKey: ['bookers'], queryFn: () => fetchJson('/api/bookers') })
}

export function useProducts(params: { companyId?: string; q?: string; categoryId?: string } = {}) {
  const u = new URLSearchParams()
  if (params.companyId) u.set('companyId', params.companyId)
  if (params.q) u.set('q', params.q)
  if (params.categoryId) u.set('categoryId', params.categoryId)
  return useQuery({ queryKey: ['products', params], queryFn: () => fetchJson(`/api/products?${u}`) })
}

export function useCategories(companyId?: string) {
  return useQuery({
    queryKey: ['categories', companyId],
    queryFn: () => fetchJson(`/api/categories?${companyId ? `companyId=${companyId}` : ''}`),
  })
}

export function useWarehouse() {
  return useQuery({ queryKey: ['warehouse'], queryFn: () => fetchJson('/api/warehouse') })
}

export function useOrders(params: { companyId?: string; status?: string; q?: string; bookerId?: string; limit?: number } = {}) {
  const u = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v && u.set(k, String(v)))
  return useQuery({ queryKey: ['orders', params], queryFn: () => fetchJson(`/api/orders?${u}`) })
}

export function useOrder(id?: string) {
  return useQuery({ queryKey: ['order', id], queryFn: () => fetchJson(`/api/orders/${id}`), enabled: !!id })
}

export function useInvoices(params: { companyId?: string; shopId?: string; status?: string } = {}) {
  const u = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v && u.set(k, String(v)))
  return useQuery({ queryKey: ['invoices', params], queryFn: () => fetchJson(`/api/invoices?${u}`) })
}

export function usePayments(params: { companyId?: string; shopId?: string } = {}) {
  const u = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v && u.set(k, String(v)))
  return useQuery({ queryKey: ['payments', params], queryFn: () => fetchJson(`/api/payments?${u}`) })
}

export function useLedger(companyId?: string, shopId?: string) {
  return useQuery({
    queryKey: ['ledger', companyId, shopId],
    queryFn: () => fetchJson(`/api/ledger?${new URLSearchParams({ companyId: companyId || '', shopId: shopId || '' })}`),
    enabled: !!companyId || !!shopId,
  })
}

export function useDashboard(companyId?: string) {
  const u = new URLSearchParams()
  if (companyId && companyId !== 'ALL') u.set('companyId', companyId)
  return useQuery({ queryKey: ['dashboard', companyId], queryFn: () => fetchJson(`/api/dashboard?${u}`), refetchInterval: 60000 })
}

export function useBatches(params: { companyId?: string; status?: string; bookerId?: string } = {}) {
  const u = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v && v !== 'ALL' && u.set(k, String(v)))
  return useQuery({ queryKey: ['batches', params], queryFn: () => fetchJson(`/api/batches?${u}`) })
}

export function useBatch(id?: string) {
  return useQuery({ queryKey: ['batch', id], queryFn: () => fetchJson(`/api/batches/${id}`), enabled: !!id })
}

export function usePickList(batchId?: string) {
  return useQuery({ queryKey: ['picklist', batchId], queryFn: () => fetchJson(`/api/batches/${batchId}/picklist`), enabled: !!batchId })
}

export function useManifest(batchId?: string) {
  return useQuery({ queryKey: ['manifest', batchId], queryFn: () => fetchJson(`/api/batches/${batchId}/manifest`), enabled: !!batchId })
}

export function useReport(type: string, params: { companyId?: string; from?: string; to?: string } = {}) {
  const u = new URLSearchParams({ type })
  Object.entries(params).forEach(([k, v]) => v && u.set(k, String(v)))
  return useQuery({ queryKey: ['report', type, params], queryFn: () => fetchJson(`/api/reports?${u}`) })
}

async function postJson(url: string, body: any) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: r.statusText }))
    throw new Error(e.error || 'Failed')
  }
  return r.json()
}

async function putJson(url: string, body: any) {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: r.statusText }))
    throw new Error(e.error || 'Failed')
  }
  return r.json()
}

async function patchJson(url: string, body: any) {
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: r.statusText }))
    throw new Error(e.error || 'Failed')
  }
  return r.json()
}

export function useCreateShop() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => postJson('/api/shops', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['shops'] }) })
}
export function useUpdateShop() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => putJson('/api/shops', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['shops'] }) })
}
export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => postJson('/api/companies', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }) })
}
export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => putJson('/api/companies', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }) })
}
export function useCreateBooker() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => postJson('/api/bookers', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['bookers'] }) })
}
export function useUpdateBooker() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => putJson('/api/bookers', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['bookers'] }) })
}
export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => postJson('/api/products', body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['warehouse'] }) } })
}
export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => putJson('/api/products', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }) })
}
export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => postJson('/api/categories', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }) })
}
export function useAdjustStock() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => postJson('/api/stock', body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouse'] }); qc.invalidateQueries({ queryKey: ['products'] }) } })
}
export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => postJson('/api/orders', body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) } })
}
export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      patchJson(`/api/orders/${id}`, { status, notes }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', vars.id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['ledger'] })
      qc.invalidateQueries({ queryKey: ['warehouse'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}
export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => postJson('/api/payments', body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['shops'] }) } })
}
export function useUpdateCurrency() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => putJson('/api/currencies', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['currencies'] }) })
}
export function useCreateCurrency() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: any) => postJson('/api/currencies', body), onSuccess: () => qc.invalidateQueries({ queryKey: ['currencies'] }) })
}
export function useCreateBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => postJson('/api/batches', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
export function useUpdateBatchStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      patchJson(`/api/batches/${id}`, { status, notes }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['batches'] })
      qc.invalidateQueries({ queryKey: ['batch', vars.id] })
      qc.invalidateQueries({ queryKey: ['picklist', vars.id] })
      qc.invalidateQueries({ queryKey: ['manifest', vars.id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['ledger'] })
      qc.invalidateQueries({ queryKey: ['warehouse'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['shops'] })
    },
  })
}
