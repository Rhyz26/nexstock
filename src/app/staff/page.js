'use client'
import { useEffect, useState } from 'react'
import {
  Stack, Group, Title, Button, Paper, Text,
  Modal, TextInput, PasswordInput, Select, Badge,
  Avatar, ActionIcon, Tooltip, Tabs
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconPlus, IconUsers, IconTrash, IconUserOff,
  IconUserCheck, IconUserX
} from '@tabler/icons-react'
import DashboardShell from '@/components/layout/DashboardShell'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'

const roleColor = { OWNER: 'blue', MANAGER: 'teal', CASHIER: 'gray' }

export default function StaffPage() {
  const { data: session } = useSession()
  const [staff, setStaff] = useState([])
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [tab, setTab] = useState('active')
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'CASHIER'
  })
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

  // ── Deactivate (recommended for fired staff)
  const deactivate = async (id, name) => {
    if (!confirm(
      `Deactivate ${name}'s account?\n\n` +
      `They will no longer be able to log in, but all their data and history will be kept. ` +
      `You can reactivate them at any time.`
    )) return

    setActionId(id)
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate' }),
      })
      const data = await res.json()
      if (!res.ok) {
        notifications.show({ color: 'red', message: data.error || 'Failed to deactivate' })
        return
      }
      setStaff(prev => prev.map(s => s.id === id ? { ...s, isActive: false } : s))
      notifications.show({
        color: 'orange',
        title: 'Account deactivated',
        message: `${name} can no longer log in. Their data is preserved.`,
      })
    } finally {
      setActionId(null)
    }
  }

  // ── Reactivate (for rehired staff)
  const reactivate = async (id, name) => {
    if (!confirm(`Reactivate ${name}'s account? They will be able to log in again.`)) return

    setActionId(id)
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      })
      const data = await res.json()
      if (!res.ok) {
        notifications.show({ color: 'red', message: data.error || 'Failed to reactivate' })
        return
      }
      setStaff(prev => prev.map(s => s.id === id ? { ...s, isActive: true } : s))
      notifications.show({
        color: 'green',
        title: 'Account reactivated',
        message: `${name} can now log in again.`,
      })
    } finally {
      setActionId(null)
    }
  }

  // ── Permanent delete (for test/duplicate accounts only)
  const del = async (id, name) => {
    if (!confirm(
      `Permanently delete ${name}'s account?\n\n` +
      `WARNING: This cannot be undone. Consider deactivating instead — ` +
      `it blocks login but keeps all their historical data.`
    )) return

    setActionId(id)
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        notifications.show({ color: 'red', message: data.error || 'Failed to delete' })
        return
      }
      setStaff(prev => prev.filter(s => s.id !== id))
      notifications.show({ color: 'red', message: `${name}'s account permanently deleted` })
    } finally {
      setActionId(null)
    }
  }

  const isOwner = session?.user?.role === 'OWNER'
  const initials = name =>
    name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const activeStaff = staff.filter(s => s.isActive !== false)
  const inactiveStaff = staff.filter(s => s.isActive === false)
  const shownStaff = tab === 'active' ? activeStaff : inactiveStaff

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <Group justify="space-between">
          <Title order={3}>Staff</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={open}>
            Add staff
          </Button>
        </Group>

        {/* Tab switcher */}
        <Tabs value={tab} onChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value="active" leftSection={<IconUsers size={14} />}>
              Active
              <Badge size="xs" ml={6} color="blue" variant="light">
                {activeStaff.length}
              </Badge>
            </Tabs.Tab>
            <Tabs.Tab value="inactive" leftSection={<IconUserX size={14} />}>
              Deactivated
              {inactiveStaff.length > 0 && (
                <Badge size="xs" ml={6} color="gray" variant="light">
                  {inactiveStaff.length}
                </Badge>
              )}
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <Paper radius="lg" withBorder>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                {isOwner && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {shownStaff.map(s => (
                <tr key={s.id}>
                  <td>
                    <Group gap={10}>
                      <Avatar
                        size={32}
                        radius="xl"
                        color={s.isActive === false ? 'gray' : 'blue'}
                        style={{ opacity: s.isActive === false ? 0.5 : 1 }}
                      >
                        {initials(s.name)}
                      </Avatar>
                      <div>
                        <Text
                          size="sm"
                          fw={500}
                          c={s.isActive === false ? 'dimmed' : undefined}
                        >
                          {s.name}
                        </Text>
                        {s.id === session?.user?.id && (
                          <Text size="xs" c="dimmed">(you)</Text>
                        )}
                      </div>
                    </Group>
                  </td>
                  <td>
                    <Text
                      size="sm"
                      c={s.isActive === false ? 'dimmed' : undefined}
                    >
                      {s.email}
                    </Text>
                  </td>
                  <td>
                    <Badge
                      color={roleColor[s.role]}
                      size="sm"
                      variant="light"
                      style={{ opacity: s.isActive === false ? 0.5 : 1 }}
                    >
                      {s.role}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      size="sm"
                      color={s.isActive === false ? 'red' : 'green'}
                      variant="light"
                    >
                      {s.isActive === false ? 'Deactivated' : 'Active'}
                    </Badge>
                  </td>
                  <td>
                    <Text size="sm" c="dimmed">
                      {dayjs(s.createdAt).format('D MMM YYYY')}
                    </Text>
                  </td>
                  {isOwner && (
                    <td>
                      {s.id !== session?.user?.id && s.role !== 'OWNER' ? (
                        <Group gap={4}>
                          {s.isActive !== false ? (
                            // Active → show Deactivate button
                            <Tooltip label={`Deactivate ${s.name} — blocks login, keeps data`}>
                              <ActionIcon
                                variant="light"
                                color="orange"
                                onClick={() => deactivate(s.id, s.name)}
                                loading={actionId === s.id}
                                loaderProps={{ type: 'dots' }}
                              >
                                <IconUserOff size={15} />
                              </ActionIcon>
                            </Tooltip>
                          ) : (
                            // Inactive → show Reactivate button
                            <Tooltip label={`Reactivate ${s.name} — restores login access`}>
                              <ActionIcon
                                variant="light"
                                color="green"
                                onClick={() => reactivate(s.id, s.name)}
                                loading={actionId === s.id}
                                loaderProps={{ type: 'dots' }}
                              >
                                <IconUserCheck size={15} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {/* Permanent delete — only shown for deactivated accounts */}
                          {s.isActive === false && (
                            <Tooltip label="Permanently delete account">
                              <ActionIcon
                                variant="light"
                                color="red"
                                onClick={() => del(s.id, s.name)}
                                loading={actionId === s.id}
                                loaderProps={{ type: 'dots' }}
                              >
                                <IconTrash size={15} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {shownStaff.length === 0 && (
                <tr>
                  <td
                    colSpan={isOwner ? 6 : 5}
                    style={{ textAlign: 'center', padding: '2rem', color: '#ADB5BD' }}
                  >
                    <Stack align="center" gap={4}>
                      <IconUsers size={32} opacity={0.3} />
                      <Text size="sm">
                        {tab === 'active'
                          ? 'No active staff. Click "Add staff" to get started.'
                          : 'No deactivated staff accounts.'}
                      </Text>
                    </Stack>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Paper>

        {/* Info box for owners */}
        {isOwner && (
          <Paper p="md" radius="md" bg="blue.0" withBorder style={{ borderColor: '#BAD7F7' }}>
            <Text size="sm" c="blue.7" fw={500} mb={4}>
              How staff account management works
            </Text>
            <Stack gap={4}>
              <Text size="xs" c="dimmed">
                <Text span fw={500} c="orange.6">Deactivate</Text> — use this when a staff member leaves.
                They can no longer log in but all their invoices and records are kept safely.
              </Text>
              <Text size="xs" c="dimmed">
                <Text span fw={500} c="green.6">Reactivate</Text> — use this if you rehire someone.
                Restores their login instantly.
              </Text>
              <Text size="xs" c="dimmed">
                <Text span fw={500} c="red.6">Delete</Text> — only available on deactivated accounts.
                Use only for test or duplicate accounts. Cannot be undone.
              </Text>
            </Stack>
          </Paper>
        )}
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