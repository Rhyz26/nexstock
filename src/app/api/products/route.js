export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'

export async function GET(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const lowStock = searchParams.get('lowStock') === 'true'

  const where = {
    businessId: session.user.businessId,
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
    ...(category && { category }),
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
  })

  const result = lowStock ? products.filter(p => p.stock <= p.lowStockAt) : products
  return ok(result)
}

export async function POST(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const data = await req.json()

  if (!data.name || data.sellingPrice == null) return err('Name and selling price required')

  const product = await prisma.product.create({
    data: {
      name: data.name,
      sku: data.sku || null,
      category: data.category || null,
      buyingPrice: parseFloat(data.buyingPrice) || 0,
      sellingPrice: parseFloat(data.sellingPrice),
      stock: parseInt(data.stock) || 0,
      lowStockAt: parseInt(data.lowStockAt) || 5,
      unit: data.unit || 'pcs',
      businessId: session.user.businessId,
    },
  })

  if (data.stock > 0) {
    await prisma.stockLog.create({
      data: { productId: product.id, type: 'ADD', quantity: product.stock, note: 'Initial stock' },
    })
  }

  return ok(product, 201)
}
