import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const list = await db.currency.findMany({ orderBy: { isDefault: 'desc' } })
  return ok(list)
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { code, name, symbol, rate, isDefault } = await req.json()
  if (!code || !name) return NextResponse.json({ error: 'code and name required' }, { status: 400 })
  if (isDefault) {
    await db.currency.updateMany({ data: { isDefault: false } })
  }
  const cur = await db.currency.create({ data: { code: code.toUpperCase(), name, symbol: symbol || code, rate: Number(rate || 1), isDefault: !!isDefault } })
  return ok(cur, 201)
}

export async function PUT(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, code, name, symbol, rate, isDefault } = await req.json()
  if (isDefault) await db.currency.updateMany({ data: { isDefault: false } })
  const cur = await db.currency.update({ where: { id }, data: { code, name, symbol, rate: Number(rate), isDefault: !!isDefault } })
  return ok(cur)
}
