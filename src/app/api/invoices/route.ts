import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined
  const shopId = searchParams.get('shopId') || undefined
  const status = searchParams.get('status') || undefined

  const where: any = {}
  if (companyId) where.companyId = companyId
  if (shopId) where.shopId = shopId
  if (status) where.status = status

  const list = await db.invoice.findMany({
    where,
    include: {
      company: true,
      shop: true,
      order: { include: { booker: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })
  return ok(list)
}
