'use client'
import { useEffect, useState } from 'react'
import {
  Stack, Group, Title, Button, TextInput, Paper,
  Text, Modal, ActionIcon, Tooltip, Badge, Avatar
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconSearch, IconEdit, IconTrash, IconUsers } from '@tabler/icons-react'
import DashboardShell from '@/components/layout/DashboardShell'

const empty = { name: '', phone: '', email: '', address: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [opened, { open, close }] = useDisclosure()

  const load = async () => {
    const params = search ? `?search=${search}` : ''
    const res = await fetch(`/api/customers${params}`)
    const data = await res.json()
    setCustomers(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    load()
  }, [search])

  const openAdd = () => {
    setForm(empty)
    setEditing(null)
    open()
  }

  const openEdit = (c) => {
    setForm({ ...c })
    setEditing(c.id)
    open()
  }

  const save = async () => {
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `/api/customers/${editing}` : '/api/customers'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      notifications.show({ color: 'red', message: 'Failed to save customer' })
      return
    }
    const saved = await res.json()
    if (editing) {
      setCustomers(prev => prev.map(c => c.id === editing ? saved : c))
      notifications.show({ color: 'green', message: 'Customer updated' })
    } else {
      setCustomers(prev => [saved, ...prev])
      notifications.show({ color: 'green', message: 'Customer added' })
    }
    close()
  }

  const del = async (id) => {
    if (!confirm('Are you sure you want to delete this customer?')) return
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      notifications.show({ color: 'red', message: 'Failed to delete customer' })
      return
    }
    setCustomers(prev => prev.filter(c => c.id !== id))
    notifications.show({ color: 'orange', message: 'Customer deleted' })
  }

  const initials = name =>
    name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <Group justify="space-between">
          <Title order={3}>Customers</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
            Add customer
          </Button>
        </Group>

        <TextInput
          placeholder="Search by name or phone..."
          leftSection={<IconSearch size={15} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          maw={400}
        />

        <Paper radius="lg" withBorder>
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Invoices</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <Group gap={10}>
                      <Avatar size={32} radius="xl" color="blue">
                        {initials(c.name)}
                      </Avatar>
                      <Text size="sm" fw={500}>{c.name}</Text>
                    </Group>
                  </td>
                  <td><Text size="sm">{c.phone || '—'}</Text></td>
                  <td><Text size="sm">{c.email || '—'}</Text></td>
                  <td>
                    <Badge size="sm" variant="light">
                      {c._count?.invoices || 0}
                    </Badge>
                  </td>
                  <td>
                    {c.balance > 0
                      ? <Text size="sm" c="red" fw={500}>
                          UGX {Number(c.balance).toLocaleString()} credit
                        </Text>
                      : <Text size="sm" c="dimmed">—</Text>
                    }
                  </td>
                  <td>
                    <Group gap={4}>
                      <Tooltip label="Edit">
                        <ActionIcon variant="subtle" onClick={() => openEdit(c)}>
                          <IconEdit size={15} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => del(c.id)}
                        >
                          <IconTrash size={15} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#ADB5BD' }}>
                    <Stack align="center" gap={4}>
                      <IconUsers size={32} opacity={0.3} />
                      <Text size="sm">No customers yet. Click "Add customer" to get started.</Text>
                    </Stack>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Paper>
      </Stack>

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? 'Edit customer' : 'Add customer'}
        size="sm"
      >
        <Stack gap="sm">
          <TextInput
            label="Name"
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <TextInput
            label="Phone"
            placeholder="+256700000000"
            value={form.phone || ''}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
          <TextInput
            label="Email"
            type="email"
            value={form.email || ''}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
          <TextInput
            label="Address"
            value={form.address || ''}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
          />
          <Button onClick={save} fullWidth>
            {editing ? 'Update customer' : 'Add customer'}
          </Button>
        </Stack>
      </Modal>
    </DashboardShell>
  )
}