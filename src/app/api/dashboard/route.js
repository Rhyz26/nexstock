import { prisma } from '@/lib/prisma'
import { requireAuth, ok } from '@/lib/apiHelper'

export async function GET(req) {
  const { error, session } = await requireAuth()
  if (error) return error

  const bizId = session.user.businessId
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalProducts,
    lowStockProducts,
    totalCustomers,
    pendingInvoices,
    todayPayments,
    monthPayments,
    lastMonthPayments,
    monthExpenses,
    recentInvoices,
    salesByDay,
  ] = await Promise.all([
    prisma.product.count({ where: { businessId: bizId } }),
    prisma.product.count({ where: { businessId: bizId, stock: { lte: prisma.product.fields.lowStockAt } } }),
    prisma.customer.count({ where: { businessId: bizId } }),
    prisma.invoice.count({ where: { businessId: bizId, status: { in: ['PENDING', 'PARTIAL'] } } }),
    prisma.payment.aggregate({ where: { businessId: bizId, createdAt: { gte: startOfDay } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { businessId: bizId, createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { businessId: bizId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { businessId: bizId, date: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.invoice.findMany({
      where: { businessId: bizId },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.$queryRaw`
      SELECT DATE(p."createdAt") as date, SUM(p.amount) as total
      FROM "Payment" p
      WHERE p."businessId" = ${bizId}
        AND p."createdAt" >= ${startOfMonth}
      GROUP BY DATE(p."createdAt")
      ORDER BY date ASC
    `,
  ])

  const monthRevenue = monthPayments._sum.amount || 0
  const lastMonthRevenue = lastMonthPayments._sum.amount || 0
  const monthExpenseTotal = monthExpenses._sum.amount || 0

  return ok({
    totalProducts,
    totalCustomers,
    pendingInvoices,
    todayRevenue: todayPayments._sum.amount || 0,
    monthRevenue,
    lastMonthRevenue,
    profit: monthRevenue - monthExpenseTotal,
    monthExpenses: monthExpenseTotal,
    recentInvoices,
    salesByDay,
    growthRate: lastMonthRevenue > 0 ? (((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1) : 0,
  })
}
