import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'

export async function GET(req, { params }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, businessId: session.user.businessId },
    include: {
      customer: true,
      items: { include: { product: true } },
      payments: true,
      business: true,
    },
  })
  if (!invoice) return err('Not found', 404)
  return ok(invoice)
}

export async function PUT(req, { params }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const data = await req.json()

  const existing = await prisma.invoice.findFirst({
    where: { id: params.id, businessId: session.user.businessId },
  })
  if (!existing) return err('Not found', 404)

  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data: {
      status: data.status || existing.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : existing.dueDate,
      notes: data.notes ?? existing.notes,
    },
  })
  return ok(invoice)
}

export async function DELETE(req, { params }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const existing = await prisma.invoice.findFirst({
    where: { id: params.id, businessId: session.user.businessId },
  })
  if (!existing) return err('Not found', 404)
  await prisma.invoice.update({ where: { id: params.id }, data: { status: 'CANCELLED' } })
  return ok({ success: true })
}
