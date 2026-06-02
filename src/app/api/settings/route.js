import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'

export async function GET(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const business = await prisma.business.findUnique({ where: { id: session.user.businessId } })
  if (!business) return err('Not found', 404)
  return ok(business)
}

export async function PUT(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const data = await req.json()
  const business = await prisma.business.update({
    where: { id: session.user.businessId },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      taxRate: parseFloat(data.taxRate) || 0,
    },
  })
  return ok(business)
}
