import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    booker: user.booker
      ? {
          id: user.booker.id,
          employeeCode: user.booker.employeeCode,
          companyIds: user.booker.companyMaps.map((m: any) => m.companyId),
        }
      : null,
  })
}
