import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'

export async function GET(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const expenses = await prisma.expense.findMany({
    where: {
      businessId: session.user.businessId,
      ...(from && to && { date: { gte: new Date(from), lte: new Date(to) } }),
    },
    orderBy: { date: 'desc' },
  })
  return ok(expenses)
}

export async function POST(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const data = await req.json()

  if (!data.category || !data.amount) return err('Category and amount required')

  const expense = await prisma.expense.create({
    data: {
      businessId: session.user.businessId,
      category: data.category,
      amount: parseFloat(data.amount),
      note: data.note || null,
      date: data.date ? new Date(data.date) : new Date(),
    },
  })
  return ok(expense, 201)
}

export async function DELETE(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return err('ID required')

  const existing = await prisma.expense.findFirst({
    where: { id, businessId: session.user.businessId },
  })
  if (!existing) return err('Not found', 404)

  await prisma.expense.delete({ where: { id } })
  return ok({ success: true })
}
