import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad } from '@/lib/api-helpers'
import { db } from '@/lib/db'

function csvEscape(v: any): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCSV(headers: string[], rows: any[][]): string {
  const headerLine = headers.map(csvEscape).join(',')
  const dataLines = rows.map((r) => r.map(csvEscape).join(','))
  return [headerLine, ...dataLines].join('\n')
}

// GET /api/export?type=recoveryByBooker&from=2024-01-01&to=2024-12-31&companyId=xxx
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

  let filename = 'export.csv'
  let csv = ''

  if (type === 'recoveryByBooker') {
    filename = `recovery-by-booker-${new Date().toISOString().slice(0, 10)}.csv`
    const payments = await db.payment.findMany({
      where: {
        ...companyFilter,
        ...(Object.keys(dateFilter).length ? { paymentDate: dateFilter } : {}),
        bookerId: { not: null },
      },
      include: {
        booker: { include: { companyMaps: { include: { company: true } } } },
        shop: { select: { name: true, code: true } },
        company: { select: { code: true, name: true } },
      },
    })
    const bookerMap: Record<string, any> = {}
    for (const p of payments) {
      if (!p.booker) continue
      const bid = p.booker.id
      if (!bookerMap[bid]) {
        bookerMap[bid] = {
          employeeCode: p.booker.employeeCode,
          name: p.booker.name,
          companies: p.booker.companyMaps?.map((m: any) => m.company?.code).filter(Boolean).join('; ') || '',
          total: 0, count: 0, shops: new Set(),
          cash: 0, cheque: 0, transfer: 0, online: 0,
        }
      }
      bookerMap[bid].total += p.amount
      bookerMap[bid].count += 1
      bookerMap[bid].shops.add(p.shopId)
      if (p.paymentMode === 'CASH') bookerMap[bid].cash += p.amount
      else if (p.paymentMode === 'CHEQUE') bookerMap[bid].cheque += p.amount
      else if (p.paymentMode === 'TRANSFER') bookerMap[bid].transfer += p.amount
      else if (p.paymentMode === 'ONLINE') bookerMap[bid].online += p.amount
    }
    const rows = Object.values(bookerMap)
      .map((b: any) => [
        b.employeeCode, b.name, b.companies, b.count, b.shops.size,
        b.cash.toFixed(2), b.cheque.toFixed(2), b.transfer.toFixed(2), b.online.toFixed(2),
        b.total.toFixed(2), b.count > 0 ? (b.total / b.count).toFixed(2) : '0.00',
      ])
      .sort((a, b) => Number(b[9]) - Number(a[9]))
    csv = toCSV(
      ['Employee Code', 'Booker Name', 'Companies', 'Collections', 'Shops Covered', 'Cash', 'Cheque', 'Transfer', 'Online', 'Total Collected', 'Avg/Recovery'],
      rows
    )
  } else if (type === 'payments') {
    filename = `payments-${new Date().toISOString().slice(0, 10)}.csv`
    const payments = await db.payment.findMany({
      where: { ...companyFilter, ...(Object.keys(dateFilter).length ? { paymentDate: dateFilter } : {}) },
      include: { company: true, shop: true, booker: true },
      orderBy: { paymentDate: 'desc' },
    })
    const rows = payments.map((p) => [
      p.paymentNo, new Date(p.paymentDate).toLocaleDateString('en-PK'),
      p.company.code, p.shop.code, p.shop.name,
      p.booker?.employeeCode || 'Direct', p.paymentMode, p.referenceNo || '',
      p.amount.toFixed(2), p.currency, p.status,
    ])
    csv = toCSV(
      ['Payment No', 'Date', 'Company', 'Shop Code', 'Shop Name', 'Booker', 'Mode', 'Reference', 'Amount', 'Currency', 'Status'],
      rows
    )
  } else if (type === 'orders') {
    filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    const orders = await db.order.findMany({
      where: { ...companyFilter, ...(Object.keys(dateFilter).length ? { orderDate: dateFilter } : {}) },
      include: { company: true, shop: true, booker: true },
      orderBy: { createdAt: 'desc' },
    })
    const rows = orders.map((o) => [
      o.orderNo, new Date(o.orderDate).toLocaleDateString('en-PK'),
      o.company.code, o.shop.code, o.shop.name,
      o.booker?.employeeCode || 'Direct', o.status,
      o.subtotal.toFixed(2), o.totalDiscount.toFixed(2), o.salesTax.toFixed(2), o.furtherTax.toFixed(2),
      o.withholdingTax.toFixed(2), o.grandTotal.toFixed(2), o.previousBalance.toFixed(2), o.totalPayable.toFixed(2),
      o.creditLimitExceeded ? 'YES' : 'NO', o.stockShortage ? 'YES' : 'NO',
    ])
    csv = toCSV(
      ['Order No', 'Date', 'Company', 'Shop Code', 'Shop Name', 'Booker', 'Status', 'Subtotal', 'Discount', 'Sales Tax', 'Further Tax', 'Withholding Tax', 'Grand Total', 'Previous Balance', 'Total Payable', 'Credit Exceeded', 'Stock Short'],
      rows
    )
  } else if (type === 'invoices') {
    filename = `invoices-${new Date().toISOString().slice(0, 10)}.csv`
    const invoices = await db.invoice.findMany({
      where: { ...companyFilter, ...(Object.keys(dateFilter).length ? { invoiceDate: dateFilter } : {}) },
      include: { company: true, shop: true },
      orderBy: { createdAt: 'desc' },
    })
    const rows = invoices.map((i) => [
      i.invoiceNo, new Date(i.invoiceDate).toLocaleDateString('en-PK'),
      i.company.code, i.shop.code, i.shop.name,
      i.grandTotal.toFixed(2), i.previousBalance.toFixed(2), i.totalPayable.toFixed(2),
      i.paidAmount.toFixed(2), i.balance.toFixed(2), i.status,
    ])
    csv = toCSV(
      ['Invoice No', 'Date', 'Company', 'Shop Code', 'Shop Name', 'Grand Total', 'Previous Balance', 'Total Payable', 'Paid', 'Balance', 'Status'],
      rows
    )
  } else if (type === 'shops') {
    filename = `shops-${new Date().toISOString().slice(0, 10)}.csv`
    const shops = await db.shop.findMany({
      where: companyId ? { companyLinks: { some: { companyId } } } : {},
      include: { companyLinks: { include: { company: true } } },
      orderBy: { code: 'asc' },
    })
    const rows: any[][] = []
    for (const s of shops) {
      for (const link of s.companyLinks) {
        rows.push([
          s.code, s.name, s.ownerName || '', s.phone || '', s.address || '',
          s.shopClass, s.taxType, s.ntn || '', s.strn || '', s.visitDay || '', s.status,
          link.company.code, link.creditLimit.toFixed(2), link.outstandingBalance.toFixed(2),
        ])
      }
    }
    csv = toCSV(
      ['Shop Code', 'Name', 'Owner', 'Phone', 'Address', 'Class', 'Tax Type', 'NTN', 'STRN', 'Visit Day', 'Status', 'Company', 'Credit Limit', 'Outstanding'],
      rows
    )
  } else {
    return bad('Unknown export type. Supported: recoveryByBooker, payments, orders, invoices, shops')
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
