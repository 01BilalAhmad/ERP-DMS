import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined
  const shopId = searchParams.get('shopId') || undefined

  const where: any = {}
  if (companyId) where.companyId = companyId
  if (shopId) where.shopId = shopId

  const list = await db.payment.findMany({
    where,
    include: { company: true, shop: true, receivedBy: { select: { name: true } } },
    orderBy: { paymentDate: 'desc' },
    take: 300,
  })
  return ok(list)
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (['ORDER_BOOKER', 'WAREHOUSE', 'VIEWER'].includes(user.role)) return bad('Forbidden', 403)

  const body = await req.json()
  const { companyId, shopId, amount, paymentMode, currency, currencyRate, referenceNo, bankName, paymentDate, notes, bookerId } = body
  if (!companyId || !shopId || !amount) return bad('companyId, shopId, amount required')

  const count = await db.payment.count()
  const paymentNo = `PAY-${String(count + 1).padStart(6, '0')}`

  const baseAmount = Number(amount) * Number(currencyRate || 1)

  const payment = await db.payment.create({
    data: {
      paymentNo,
      companyId,
      shopId,
      amount: baseAmount, // stored in base currency (PKR)
      paymentMode,
      currency: currency || 'PKR',
      currencyRate: Number(currencyRate || 1),
      referenceNo,
      bankName,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      status: 'RECEIVED',
      receivedById: user.id,
      bookerId: bookerId || null,
      notes,
    },
  })

  // Update shop outstanding
  const link = await db.shopCompanyLink.findUnique({ where: { shopId_companyId: { shopId, companyId } } })
  const prevBal = link?.outstandingBalance || 0
  const newBalance = Math.max(0, prevBal - baseAmount)

  await db.ledger.create({
    data: {
      companyId,
      shopId,
      paymentId: payment.id,
      entryType: 'CREDIT',
      amount: baseAmount,
      balance: newBalance,
      reference: payment.paymentNo,
      description: `Payment received ${payment.paymentNo} (${paymentMode})`,
    },
  })

  if (link) {
    await db.shopCompanyLink.update({
      where: { id: link.id },
      data: { outstandingBalance: newBalance },
    })
  }

  return ok(payment, 201)
}
