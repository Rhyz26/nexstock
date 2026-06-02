'use client'
import { useEffect, useState } from 'react'
import { Stack, Title, Paper, TextInput, NumberInput, Button, Text, Group, Divider, Badge } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useSession } from 'next-auth/react'
import DashboardShell from '@/components/layout/DashboardShell'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', taxRate: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session) return
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data) setForm({ name: data.name || '', phone: data.phone || '', email: data.email || '', address: data.address || '', taxRate: data.taxRate || 0 })
    })
  }, [session])

  const save = async () => {
    setLoading(true)
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setLoading(false)
    if (!res.ok) { notifications.show({ color: 'red', message: 'Failed to save' }); return }
    notifications.show({ color: 'green', message: 'Settings saved' })
  }

  const planColor = { STARTER: 'gray', GROWTH: 'blue', PRO: 'violet' }

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm" maw={600}>
        <Title order={3}>Settings</Title>

        <Paper p="lg" radius="lg" withBorder>
          <Text fw={600} mb="md">Business information</Text>
          <Stack gap="sm">
            <TextInput label="Business name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <TextInput label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <TextInput label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <TextInput label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            <NumberInput label="Tax rate (%)" value={form.taxRate} onChange={v => setForm(f => ({ ...f, taxRate: v }))} min={0} max={100} />
            <Button onClick={save} loading={loading} w={140}>Save changes</Button>
          </Stack>
        </Paper>

        <Paper p="lg" radius="lg" withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={600}>Subscription plan</Text>
            <Badge color={planColor[session?.user?.plan] || 'gray'} size="lg">{session?.user?.plan || 'STARTER'}</Badge>
          </Group>
          <Divider mb="md" />
          <Stack gap={6}>
            {[
              { plan: 'Starter', price: 'UGX 30,000/mo', features: '1 staff, 200 products, invoicing' },
              { plan: 'Growth', price: 'UGX 60,000/mo', features: '5 staff, unlimited products, MoMo reconciliation' },
              { plan: 'Pro', price: 'UGX 100,000/mo', features: 'Unlimited staff, multi-branch, API access' },
            ].map(p => (
              <Group key={p.plan} justify="space-between" p="sm" style={{ border: '1px solid #E9ECEF', borderRadius: 8 }}>
                <div>
                  <Text size="sm" fw={500}>{p.plan}</Text>
                  <Text size="xs" c="dimmed">{p.features}</Text>
                </div>
                <Text size="sm" fw={600} c="blue">{p.price}</Text>
              </Group>
            ))}
          </Stack>
          <Text size="xs" c="dimmed" mt="md">To upgrade, contact us via WhatsApp: +256700000000</Text>
        </Paper>
      </Stack>
    </DashboardShell>
  )
}
