import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized } from '@/lib/api-helpers'
import { db } from '@/lib/db'

// GET /api/dashboard?companyId=xxx&from=2024-01-01&to=2024-12-31
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const dateFilter: any = {}
  if (from || to) {
    dateFilter.gte = from ? new Date(from) : undefined
    dateFilter.lte = to ? new Date(to) : undefined
  }

  const companyFilter = companyId ? { companyId } : {}

  const [companies, shops, bookers, products, orderCount, todayOrders, payments] = await Promise.all([
    db.company.findMany({ where: { status: 'ACTIVE' }, select: { id: true, code: true, name: true } }),
    db.shop.count({ where: { status: 'ACTIVE' } }),
    db.orderBooker.count({ where: { status: 'ACTIVE' } }),
    db.product.count({ where: { status: 'ACTIVE' } }),
    db.order.count({ where: { ...companyFilter, ...(Object.keys(dateFilter).length ? { orderDate: dateFilter } : {}) } }),
    db.order.findMany({
      where: {
        ...companyFilter,
        orderDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: { company: true, shop: true, booker: true, items: true },
    }),
    db.payment.findMany({
      where: {
        ...companyFilter,
        paymentDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
  ])

  const todaySales = todayOrders.reduce((s, o) => s + o.grandTotal, 0)
  const todayOrderCount = todayOrders.length
  const todayPaymentReceived = payments.reduce((s, p) => s + p.amount, 0)

  // Outstanding across all (or selected company)
  const outstanding = await db.shopCompanyLink.aggregate({
    where: companyId ? { companyId } : {},
    _sum: { outstandingBalance: true },
  })

  // Low stock
  const lowStock = await db.stock.count({ where: { quantity: { lte: 5 } } })

  // Sales by company (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentOrders = await db.order.findMany({
    where: { ...companyFilter, orderDate: { gte: sevenDaysAgo }, status: { notIn: ['CANCELLED', 'DRAFT'] } },
    select: { companyId: true, grandTotal: true, orderDate: true, status: true },
  })
  const salesByCompany: Record<string, number> = {}
  const salesByDay: Record<string, number> = {}
  for (const o of recentOrders) {
    salesByCompany[o.companyId] = (salesByCompany[o.companyId] || 0) + o.grandTotal
    const day = o.orderDate.toISOString().slice(0, 10)
    salesByDay[day] = (salesByDay[day] || 0) + o.grandTotal
  }

  const companiesWithSales = companies.map((c) => ({
    ...c,
    sales: salesByCompany[c.id] || 0,
  }))

  // Status breakdown (use todayOrders for status distribution)
  const statusBreakdown: Record<string, number> = {}
  for (const o of todayOrders) {
    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1
  }

  return NextResponse.json({
    kpis: {
      companies: companies.length,
      shops,
      bookers,
      products,
      todaySales,
      todayOrderCount,
      todayPaymentReceived,
      outstanding: outstanding._sum.outstandingBalance || 0,
      lowStock,
      totalOrders: orderCount,
    },
    companies: companiesWithSales,
    salesByDay: Object.entries(salesByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value })),
    statusBreakdown,
    recentOrders: todayOrders.slice(0, 8).map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      company: o.company,
      shop: o.shop,
      booker: o.booker,
      grandTotal: o.grandTotal,
      status: o.status,
      currency: o.currency,
      orderDate: o.orderDate,
    })),
  })
}
