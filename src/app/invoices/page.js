'use client'
import { useEffect, useState } from 'react'
import {
  Stack, Group, Title, Button, TextInput, Select, Paper, Badge,
  Text, Modal, NumberInput, ActionIcon, Tooltip, Textarea, Divider
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconSearch, IconCurrencyDollar, IconTrash, IconFileInvoice } from '@tabler/icons-react'
import DashboardShell from '@/components/layout/DashboardShell'
import dayjs from 'dayjs'

const statusColor = {
  PAID: 'green', PENDING: 'yellow', PARTIAL: 'blue',
  OVERDUE: 'red', CANCELLED: 'gray'
}
const fmt = n => `UGX ${Number(n || 0).toLocaleString()}`

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [paying, setPaying] = useState(false)
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure()
  const [payOpened, { open: openPay, close: closePay }] = useDisclosure()
  const [selectedInv, setSelectedInv] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', method: 'CASH', reference: '' })
  const [form, setForm] = useState({
    customerId: '', discount: 0, notes: '', dueDate: '', items: []
  })

  const load = async () => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (statusFilter) p.set('status', statusFilter)
    const [inv, prod, cust] = await Promise.all([
      fetch(`/api/invoices?${p}`).then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
    ])
    setInvoices(Array.isArray(inv) ? inv : [])
    setProducts(Array.isArray(prod) ? prod : [])
    setCustomers(Array.isArray(cust) ? cust : [])
  }

  useEffect(() => { load() }, [search, statusFilter])

  const addItem = () => setForm(f => ({
    ...f, items: [...f.items, { productId: '', name: '', quantity: 1, price: 0 }]
  }))

  const removeItem = i => setForm(f => ({
    ...f, items: f.items.filter((_, idx) => idx !== i)
  }))

  const updateItem = (i, key, val) => {
    setForm(f => {
      const items = [...f.items]
      items[i] = { ...items[i], [key]: val }
      if (key === 'productId' && val) {
        const p = products.find(p => p.id === val)
        if (p) { items[i].name = p.name; items[i].price = p.sellingPrice }
      }
      return { ...f, items }
    })
  }

  const subtotal = form.items.reduce((s, i) => s + ((i.quantity || 0) * (i.price || 0)), 0)
  const total = subtotal - (form.discount || 0)

  const createInvoice = async () => {
    if (form.items.length === 0) {
      notifications.show({ color: 'red', message: 'Add at least one item' })
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        notifications.show({ color: 'red', message: 'Failed to create invoice' })
        return
      }
      const saved = await res.json()
      setInvoices(prev => [saved, ...prev])
      notifications.show({ color: 'green', message: `Invoice ${saved.number} created!` })
      closeCreate()
      setForm({ customerId: '', discount: 0, notes: '', dueDate: '', items: [] })
    } finally {
      setCreating(false)
    }
  }

  const recordPayment = async () => {
    if (!payForm.amount || payForm.amount <= 0) {
      notifications.show({ color: 'red', message: 'Enter a valid amount' })
      return
    }
    setPaying(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: selectedInv.id, ...payForm }),
      })
      if (!res.ok) {
        notifications.show({ color: 'red', message: 'Failed to record payment' })
        return
      }
      notifications.show({ color: 'green', message: 'Payment recorded!' })
      closePay()
      load()
    } finally {
      setPaying(false)
    }
  }

  const paid = inv => inv.payments?.reduce((s, p) => s + p.amount, 0) || 0

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <Group justify="space-between">
          <Title order={3}>Invoices</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={() => {
            setForm({ customerId: '', discount: 0, notes: '', dueDate: '', items: [] })
            openCreate()
          }}>
            New invoice
          </Button>
        </Group>

        <Group gap="sm">
          <TextInput
            placeholder="Search invoices..."
            leftSection={<IconSearch size={15} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="All statuses"
            clearable
            w={160}
            value={statusFilter}
            onChange={setStatusFilter}
            data={['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']}
          />
        </Group>

        <Paper radius="lg" withBorder>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td><Text size="sm" fw={600} c="blue">{inv.number}</Text></td>
                  <td><Text size="sm">{inv.customer?.name || 'Walk-in'}</Text></td>
                  <td><Text size="sm" fw={500}>{fmt(inv.total)}</Text></td>
                  <td><Text size="sm" c="teal">{fmt(paid(inv))}</Text></td>
                  <td>
                    <Badge color={statusColor[inv.status]} size="sm" variant="light">
                      {inv.status}
                    </Badge>
                  </td>
                  <td>
                    <Text size="sm" c="dimmed">
                      {dayjs(inv.createdAt).format('D MMM YYYY')}
                    </Text>
                  </td>
                  <td>
                    <Group gap={4}>
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                        <Tooltip label="Record payment">
                          <ActionIcon
                            variant="subtle"
                            color="green"
                            onClick={() => {
                              setSelectedInv(inv)
                              setPayForm({
                                amount: inv.total - paid(inv),
                                method: 'CASH',
                                reference: ''
                              })
                              openPay()
                            }}
                          >
                            <IconCurrencyDollar size={15} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#ADB5BD' }}>
                    <Stack align="center" gap={4}>
                      <IconFileInvoice size={32} opacity={0.3} />
                      <Text size="sm">No invoices yet. Click "New invoice" to get started.</Text>
                    </Stack>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Paper>
      </Stack>

      {/* Create Invoice Modal */}
      <Modal
        opened={createOpened}
        onClose={closeCreate}
        title="New invoice"
        size="lg"
      >
        <Stack gap="sm">
          <Select
            label="Customer (optional)"
            placeholder="Walk-in customer"
            clearable
            data={customers.map(c => ({
              value: c.id,
              label: `${c.name}${c.phone ? ' · ' + c.phone : ''}`
            }))}
            value={form.customerId}
            onChange={v => setForm(f => ({ ...f, customerId: v }))}
          />
          <Divider label="Items" />

          {form.items.map((item, i) => (
            <Group key={i} align="flex-end" gap="xs">
              <Select
                placeholder="Product"
                style={{ flex: 2 }}
                clearable
                data={products.map(p => ({ value: p.id, label: p.name }))}
                value={item.productId}
                onChange={v => updateItem(i, 'productId', v)}
              />
              <TextInput
                placeholder="Item name"
                style={{ flex: 2 }}
                value={item.name}
                onChange={e => updateItem(i, 'name', e.target.value)}
              />
              <NumberInput
                placeholder="Qty"
                w={70}
                min={1}
                value={item.quantity}
                onChange={v => updateItem(i, 'quantity', v)}
              />
              <NumberInput
                placeholder="Price"
                w={120}
                value={item.price}
                onChange={v => updateItem(i, 'price', v)}
                thousandSeparator=","
              />
              <ActionIcon color="red" variant="subtle" onClick={() => removeItem(i)}>
                <IconTrash size={15} />
              </ActionIcon>
            </Group>
          ))}

          <Button
            variant="subtle"
            leftSection={<IconPlus size={14} />}
            onClick={addItem}
          >
            Add item
          </Button>

          <Divider />

          <Group grow>
            <NumberInput
              label="Discount (UGX)"
              value={form.discount}
              onChange={v => setForm(f => ({ ...f, discount: v }))}
              min={0}
              thousandSeparator=","
            />
            <TextInput
              label="Due date"
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </Group>

          <Textarea
            label="Notes"
            rows={2}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />

          <Paper p="sm" bg="blue.0" radius="md">
            <Group justify="space-between">
              <Text size="sm">Subtotal</Text>
              <Text size="sm">{fmt(subtotal)}</Text>
            </Group>
            {form.discount > 0 && (
              <Group justify="space-between">
                <Text size="sm">Discount</Text>
                <Text size="sm" c="red">- {fmt(form.discount)}</Text>
              </Group>
            )}
            <Group justify="space-between" mt={4}>
              <Text fw={600}>Total</Text>
              <Text fw={700} size="lg" c="blue">{fmt(total)}</Text>
            </Group>
          </Paper>

          <Button
            onClick={createInvoice}
            fullWidth
            loading={creating}
            loaderProps={{ type: 'dots' }}
          >
            {creating ? 'Creating invoice...' : 'Create invoice'}
          </Button>
        </Stack>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        opened={payOpened}
        onClose={closePay}
        title={`Record payment — ${selectedInv?.number}`}
        size="sm"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Outstanding: {fmt(selectedInv ? selectedInv.total - paid(selectedInv) : 0)}
          </Text>
          <NumberInput
            label="Amount (UGX)"
            required
            value={payForm.amount}
            onChange={v => setPayForm(f => ({ ...f, amount: v }))}
            thousandSeparator=","
            min={0}
          />
          <Select
            label="Payment method"
            required
            value={payForm.method}
            onChange={v => setPayForm(f => ({ ...f, method: v }))}
            data={[
              { value: 'CASH', label: 'Cash' },
              { value: 'MTN_MOMO', label: 'MTN Mobile Money' },
              { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
          <TextInput
            label="Reference (optional)"
            placeholder="Transaction ID"
            value={payForm.reference || ''}
            onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))}
          />
          <Button
            onClick={recordPayment}
            color="green"
            fullWidth
            loading={paying}
            loaderProps={{ type: 'dots' }}
          >
            {paying ? 'Recording payment...' : 'Record payment'}
          </Button>
        </Stack>
      </Modal>
    </DashboardShell>
  )
}