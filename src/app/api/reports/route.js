export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { requireAuth, ok } from '@/lib/apiHelper'

export async function GET(req) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'sales'
  const from = new Date(searchParams.get('from') || new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const to = new Date(searchParams.get('to') || new Date())
  const bizId = session.user.businessId

  if (type === 'sales') {
    const payments = await prisma.payment.findMany({
      where: { businessId: bizId, createdAt: { gte: from, lte: to } },
      include: { invoice: { select: { number: true } } },
      orderBy: { createdAt: 'asc' },
    })

    const byMethod = {}
    for (const p of payments) {
      byMethod[p.method] = (byMethod[p.method] || 0) + p.amount
    }

    const byDay = {}
    for (const p of payments) {
      const d = p.createdAt.toISOString().split('T')[0]
      byDay[d] = (byDay[d] || 0) + p.amount
    }

    return ok({
      total: payments.reduce((s, p) => s + p.amount, 0),
      count: payments.length,
      byMethod,
      byDay: Object.entries(byDay).map(([date, total]) => ({ date, total })),
      payments,
    })
  }

  if (type === 'products') {
    const items = await prisma.invoiceItem.findMany({
      where: { invoice: { businessId: bizId, createdAt: { gte: from, lte: to } } },
      include: { product: { select: { name: true, category: true } } },
    })

    const byProduct = {}
    for (const item of items) {
      const key = item.name
      if (!byProduct[key]) byProduct[key] = { name: key, qty: 0, revenue: 0 }
      byProduct[key].qty += item.quantity
      byProduct[key].revenue += item.total
    }

    return ok(Object.values(byProduct).sort((a, b) => b.revenue - a.revenue))
  }

  if (type === 'expenses') {
    const expenses = await prisma.expense.findMany({
      where: { businessId: bizId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    })

    const byCategory = {}
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    }

    return ok({
      total: expenses.reduce((s, e) => s + e.amount, 0),
      byCategory: Object.entries(byCategory).map(([category, total]) => ({ category, total })),
      expenses,
    })
  }

  return ok({})
}
