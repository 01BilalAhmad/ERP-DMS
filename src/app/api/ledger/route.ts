import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

// GET /api/ledger?companyId=xxx&shopId=yyy
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined
  const shopId = searchParams.get('shopId') || undefined

  const where: any = {}
  if (companyId) where.companyId = companyId
  if (shopId) where.shopId = shopId

  const entries = await db.ledger.findMany({
    where,
    include: { company: true, shop: true, order: true, invoice: true, payment: true },
    orderBy: { date: 'desc' },
    take: 500,
  })

  // Compute aging per shop
  const links = await db.shopCompanyLink.findMany({
    where: { companyId, shopId },
    include: { shop: true, company: true },
  })

  return ok({ entries, balances: links })
}
