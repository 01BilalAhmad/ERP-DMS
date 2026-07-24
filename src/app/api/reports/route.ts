import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

// GET /api/reports?type=bookerProductivity|shopCoverage|aging|topShops|salesSummary
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const companyId = searchParams.get('companyId') || undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)

  const companyFilter = companyId ? { companyId } : {}

  if (type === 'bookerProductivity') {
    const bookers = await db.orderBooker.findMany({
      include: {
        user: true,
        companyMaps: { include: { company: true } },
        orders: {
          where: { ...companyFilter, ...(Object.keys(dateFilter).length ? { orderDate: dateFilter } : {}), status: { not: 'CANCELLED' } },
          select: { grandTotal: true, status: true, orderDate: true },
        },
      },
    })
    const result = bookers.map((b) => {
      const orders = b.orders
      const totalValue = orders.reduce((s, o) => s + o.grandTotal, 0)
      const delivered = orders.filter((o) => o.status === 'DELIVERED')
      return {
        id: b.id,
        employeeCode: b.employeeCode,
        name: b.name,
        companies: b.companyMaps.map((m) => m.company.name),
        orderCount: orders.length,
        deliveredCount: delivered.length,
        totalValue,
      }
    })
    return ok(result)
  }

  if (type === 'shopCoverage') {
    const shops = await db.shop.findMany({
      where: { status: 'ACTIVE' },
      include: {
        orders: {
          where: { ...companyFilter, ...(Object.keys(dateFilter).length ? { orderDate: dateFilter } : {}) },
          select: { id: true, status: true, grandTotal: true },
        },
        companyLinks: true,
      },
    })
    const covered = shops.filter((s) => s.orders.length > 0)
    return ok({
      total: shops.length,
      covered: covered.length,
      uncovered: shops.length - covered.length,
      coverageRate: shops.length ? ((covered.length / shops.length) * 100).toFixed(1) : '0',
      byClass: ['A', 'B', 'C'].map((c) => {
        const s = shops.filter((x) => x.shopClass === c)
        const cv = s.filter((x) => x.orders.length > 0).length
        return { class: c, total: s.length, covered: cv }
      }),
    })
  }

  if (type === 'aging') {
    const links = await db.shopCompanyLink.findMany({
      where: { outstandingBalance: { gt: 0 }, ...(companyId ? { companyId } : {}) },
      include: { shop: true, company: true },
    })
    const now = new Date()
    const aging = await Promise.all(
      links.map(async (l) => {
        const entries = await db.ledger.findMany({
          where: { shopId: l.shopId, companyId: l.companyId, entryType: 'DEBIT' },
          orderBy: { date: 'asc' },
        })
        let current = l.outstandingBalance
        const buckets = { current: 0, d30: 0, d60: 0, d90: 0 }
        for (const e of entries) {
          const days = Math.floor((now.getTime() - e.date.getTime()) / (1000 * 60 * 60 * 24))
          const amt = Math.min(e.amount, current)
          if (days <= 30) buckets.current += amt
          else if (days <= 60) buckets.d30 += amt
          else if (days <= 90) buckets.d60 += amt
          else buckets.d90 += amt
          current -= amt
          if (current <= 0) break
        }
        return {
          shop: l.shop,
          company: l.company,
          outstanding: l.outstandingBalance,
          creditLimit: l.creditLimit,
          ...buckets,
        }
      })
    )
    return ok(aging)
  }

  if (type === 'topShops') {
    const orders = await db.order.findMany({
      where: { ...companyFilter, status: { notIn: ['CANCELLED', 'DRAFT'] }, ...(Object.keys(dateFilter).length ? { orderDate: dateFilter } : {}) },
      include: { shop: true },
    })
    const map: Record<string, { shop: any; total: number; count: number }> = {}
    for (const o of orders) {
      const k = o.shopId
      if (!map[k]) map[k] = { shop: o.shop, total: 0, count: 0 }
      map[k].total += o.grandTotal
      map[k].count++
    }
    return ok(Object.values(map).sort((a, b) => b.total - a.total).slice(0, 20))
  }

  if (type === 'salesSummary') {
    const orders = await db.order.findMany({
      where: { ...companyFilter, status: { notIn: ['CANCELLED', 'DRAFT'] }, ...(Object.keys(dateFilter).length ? { orderDate: dateFilter } : {}) },
      include: { company: true },
    })
    const byCompany: Record<string, any> = {}
    let total = 0, totalTax = 0, totalOrders = 0
    for (const o of orders) {
      const k = o.companyId
      if (!byCompany[k]) byCompany[k] = { company: o.company, orders: 0, value: 0, salesTax: 0, withholdingTax: 0 }
      byCompany[k].orders++
      byCompany[k].value += o.grandTotal
      byCompany[k].salesTax += o.salesTax
      byCompany[k].withholdingTax += o.withholdingTax
      total += o.grandTotal
      totalTax += o.salesTax + o.furtherTax + o.withholdingTax
      totalOrders++
    }
    return ok({ byCompany: Object.values(byCompany), total, totalTax, totalOrders })
  }

  return bad('Unknown report type')
}
