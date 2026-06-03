'use client'
import { useEffect, useState } from 'react'
import {
  Stack, Group, Title, Button, Paper, Text,
  Modal, TextInput, PasswordInput, Select, Badge, Avatar
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconUsers } from '@tabler/icons-react'
import DashboardShell from '@/components/layout/DashboardShell'
import dayjs from 'dayjs'

const roleColor = { OWNER: 'blue', MANAGER: 'teal', CASHIER: 'gray' }

export default function StaffPage() {
  const [staff, setStaff] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CASHIER' })
  const [opened, { open, close }] = useDisclosure()

  const load = async () => {
    const res = await fetch('/api/staff')
    const data = await res.json()
    setStaff(Array.isArray(data) ? data : [])
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name || !form.email || !form.password) {
      notifications.show({ color: 'red', message: 'Name, email and password are required' })
      return
    }
    if (form.password.length < 6) {
      notifications.show({ color: 'red', message: 'Password must be at least 6 characters' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        notifications.show({ color: 'red', message: data.error || 'Failed to add staff member' })
        return
      }
      setStaff(prev => [...prev, data])
      notifications.show({ color: 'green', message: `${form.name} added as ${form.role}` })
      close()
      setForm({ name: '', email: '', password: '', role: 'CASHIER' })
    } finally {
      setSaving(false)
    }
  }

  const initials = name =>
    name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <Group justify="space-between">
          <Title order={3}>Staff</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={open}>
            Add staff
          </Button>
        </Group>

        <Paper radius="lg" withBorder>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id}>
                  <td>
                    <Group gap={10}>
                      <Avatar size={32} radius="xl" color="blue">
                        {initials(s.name)}
                      </Avatar>
                      <Text size="sm" fw={500}>{s.name}</Text>
                    </Group>
                  </td>
                  <td><Text size="sm">{s.email}</Text></td>
                  <td>
                    <Badge color={roleColor[s.role]} size="sm" variant="light">
                      {s.role}
                    </Badge>
                  </td>
                  <td>
                    <Text size="sm" c="dimmed">
                      {dayjs(s.createdAt).format('D MMM YYYY')}
                    </Text>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#ADB5BD' }}>
                    <Stack align="center" gap={4}>
                      <IconUsers size={32} opacity={0.3} />
                      <Text size="sm">No staff yet. Click "Add staff" to get started.</Text>
                    </Stack>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Paper>
      </Stack>

      <Modal opened={opened} onClose={close} title="Add staff member" size="sm">
        <Stack gap="sm">
          <TextInput
            label="Full name"
            required
            placeholder="e.g. Alice Namukasa"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <TextInput
            label="Email"
            type="email"
            required
            placeholder="alice@yourbusiness.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
          <PasswordInput
            label="Password"
            required
            placeholder="Min 6 characters"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          />
          <Select
            label="Role"
            required
            value={form.role}
            onChange={v => setForm(f => ({ ...f, role: v }))}
            data={[
              { value: 'MANAGER', label: 'Manager — view all, manage products and staff' },
              { value: 'CASHIER', label: 'Cashier — process sales only' },
            ]}
          />
          <Button
            onClick={save}
            fullWidth
            loading={saving}
            loaderProps={{ type: 'dots' }}
          >
            {saving ? 'Adding staff member...' : 'Add staff member'}
          </Button>
        </Stack>
      </Modal>
    </DashboardShell>
  )
}