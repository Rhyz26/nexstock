export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req) {
  try {
    const { name, email, password, businessName, phone } = await req.json()

    if (!name || !email || !password || !businessName) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

    const hashed = await bcrypt.hash(password, 10)

    const business = await prisma.business.create({
      data: { name: businessName, phone, currency: 'UGX', plan: 'STARTER', smsCredits: 10 },
    })

    await prisma.user.create({
      data: { name, email, password: hashed, role: 'OWNER', businessId: business.id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
