import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'

export const dynamic = 'force-dynamic'

export async function PATCH(req, { params }) {
  const { error, session } = await requireAuth()
  if (error) return error

  // Only owners can change staff status
  if (session.user.role !== 'OWNER') {
    return err('Only the business owner can change staff status', 403)
  }

  // Cannot change your own status
  if (params.id === session.user.id) {
    return err('You cannot change your own account status', 400)
  }

  const staff = await prisma.user.findFirst({
    where: { id: params.id, businessId: session.user.businessId },
  })

  if (!staff) return err('Staff member not found', 404)
  if (staff.role === 'OWNER') return err('Owner accounts cannot be modified', 400)

  const { action } = await req.json()

  if (action !== 'activate' && action !== 'deactivate') {
    return err('Invalid action. Use "activate" or "deactivate"')
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { isActive: action === 'activate' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  return ok(updated)
}

export async function DELETE(req, { params }) {
  const { error, session } = await requireAuth()
  if (error) return error

  // Only owners can delete staff
  if (session.user.role !== 'OWNER') {
    return err('Only the business owner can delete staff accounts', 403)
  }

  // Cannot delete yourself
  if (params.id === session.user.id) {
    return err('You cannot delete your own account', 400)
  }

  const staff = await prisma.user.findFirst({
    where: { id: params.id, businessId: session.user.businessId },
  })

  if (!staff) return err('Staff member not found', 404)
  if (staff.role === 'OWNER') return err('Owner accounts cannot be deleted', 400)

  await prisma.user.delete({ where: { id: params.id } })

  return ok({ success: true })
}