import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function getSession() {
  return getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null }
  }
  return { error: null, session }
}

export function ok(data, status = 200) {
  return NextResponse.json(data, { status })
}

export function err(message, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
