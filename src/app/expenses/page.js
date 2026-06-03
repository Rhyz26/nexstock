'use client'
import { useEffect, useState } from 'react'
import {
  Stack, Group, Title, Button, Paper, Text, Modal,
  TextInput, NumberInput, Select, Textarea, ActionIcon, Tooltip
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import DashboardShell from '@/components/layout/DashboardShell'
import dayjs from 'dayjs'

const CATEGORIES = [
  'Rent', 'Stock purchase', 'Salaries', 'Utilities',
  'Transport', 'Marketing', 'Equipment', 'Other'
]

const fmt = n => `UGX ${Number(n || 0).toLocaleString()}`

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState({ category: '', amount: '', note: '', date: '' })
  const [opened, { open, close }] = useDisclosure()

  const load = async () => {
    const res = await fetch('/api/expenses')
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!form.category || !form.amount) {
      notifications.show({ color: 'red', message: 'Category and amount are required' })
      return
    }
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      notifications.show({ color: 'red', message: 'Failed to save expense' })
      return
    }
    const saved = await res.json()
    setExpenses(prev => [saved, ...prev])
    notifications.show({ color: 'green', message: 'Expense recorded' })
    close()
    setForm({ category: '', amount: '', note: '', date: '' })
  }

  const del = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      notifications.show({ color: 'red', message: 'Failed to delete expense' })
      return
    }
    setExpenses(prev => prev.filter(e => e.id !== id))
    notifications.show({ color: 'orange', message: 'Expense deleted' })
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <Group justify="space-between">
          <Title order={3}>Expenses</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={open}>
            Add expense
          </Button>
        </Group>

        <Paper p="md" radius="lg" withBorder bg="red.0">
          <Text size="sm" c="dimmed">Total expenses (all time)</Text>
          <Text fw={700} size="xl" c="red">{fmt(total)}</Text>
        </Paper>

        <Paper radius="lg" withBorder>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Note</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td><Text size="sm" fw={500}>{e.category}</Text></td>
                  <td><Text size="sm" fw={500} c="red">{fmt(e.amount)}</Text></td>
                  <td><Text size="sm" c="dimmed">{e.note || '—'}</Text></td>
                  <td>
                    <Text size="sm" c="dimmed">
                      {dayjs(e.date).format('D MMM YYYY')}
                    </Text>
                  </td>
                  <td>
                    <Tooltip label="Delete">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => del(e.id)}
                      >
                        <IconTrash size={15} />
                      </ActionIcon>
                    </Tooltip>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#ADB5BD' }}>
                    <Text size="sm">No expenses recorded yet.</Text>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Paper>
      </Stack>

      <Modal opened={opened} onClose={close} title="Record expense" size="sm">
        <Stack gap="sm">
          <Select
            label="Category"
            required
            data={CATEGORIES}
            value={form.category}
            onChange={v => setForm(f => ({ ...f, category: v }))}
          />
          <NumberInput
            label="Amount (UGX)"
            required
            value={form.amount}
            onChange={v => setForm(f => ({ ...f, amount: v }))}
            thousandSeparator=","
            min={0}
          />
          <TextInput
            label="Date"
            type="date"
            value={form.date || dayjs().format('YYYY-MM-DD')}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
          <Textarea
            label="Note (optional)"
            rows={2}
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          />
          <Button onClick={save} fullWidth>Save expense</Button>
        </Stack>
      </Modal>
    </DashboardShell>
  )
}