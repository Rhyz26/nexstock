'use client'
import { useEffect, useState } from 'react'
import {
  Stack, Group, Title, Button, TextInput, Select, Paper,
  Badge, Text, Modal, NumberInput, ActionIcon, Tooltip
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconPlus, IconSearch, IconEdit, IconTrash,
  IconAlertTriangle, IconPackage
} from '@tabler/icons-react'
import DashboardShell from '@/components/layout/DashboardShell'

const CATEGORIES = [
  'Groceries', 'Toiletries', 'Airtime', 'Electronics',
  'Clothing', 'Beverages', 'Stationery', 'Other'
]

const empty = {
  name: '', sku: '', category: '', buyingPrice: '',
  sellingPrice: '', stock: '', lowStockAt: 5, unit: 'pcs'
}

export default function InventoryPage() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [opened, { open, close }] = useDisclosure()

  const load = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    const res = await fetch(`/api/products?${params}`)
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    load()
  }, [search, category])

  const openAdd = () => {
    setForm(empty)
    setEditing(null)
    open()
  }

  const openEdit = (p) => {
    setForm({ ...p })
    setEditing(p.id)
    open()
  }

  const save = async () => {
    if (!form.name) {
      notifications.show({ color: 'red', message: 'Product name is required' })
      return
    }
    if (!form.sellingPrice || form.sellingPrice <= 0) {
      notifications.show({ color: 'red', message: 'Selling price is required' })
      return
    }
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `/api/products/${editing}` : '/api/products'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        notifications.show({ color: 'red', message: 'Failed to save product' })
        return
      }
      const saved = await res.json()
      if (editing) {
        setProducts(prev => prev.map(p => p.id === editing ? saved : p))
        notifications.show({ color: 'green', message: 'Product updated successfully' })
      } else {
        setProducts(prev => [saved, ...prev])
        notifications.show({ color: 'green', message: 'Product added successfully' })
      }
      close()
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        notifications.show({
          color: 'red',
          message: data.error || 'Failed to delete product',
        })
        return
      }
      setProducts(prev => prev.filter(p => p.id !== id))
      notifications.show({ color: 'orange', message: 'Product deleted' })
    } finally {
      setDeletingId(null)
    }
  }

  const fmt = n => `UGX ${Number(n || 0).toLocaleString()}`
  const margin = p =>
    p.buyingPrice > 0
      ? Math.round(((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100)
      : 0

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <Group justify="space-between">
          <Title order={3}>Inventory</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
            Add product
          </Button>
        </Group>

        <Group gap="sm">
          <TextInput
            placeholder="Search products..."
            leftSection={<IconSearch size={15} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="All categories"
            data={CATEGORIES}
            value={category}
            onChange={setCategory}
            clearable
            w={180}
          />
        </Group>

        <Paper radius="lg" withBorder>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Buy price</th>
                <th>Sell price</th>
                <th>Margin</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <Text size="sm" fw={500}>{p.name}</Text>
                    {p.sku && <Text size="xs" c="dimmed">{p.sku}</Text>}
                  </td>
                  <td>
                    <Text size="sm">{p.category || '—'}</Text>
                  </td>
                  <td>
                    <Text size="sm">{fmt(p.buyingPrice)}</Text>
                  </td>
                  <td>
                    <Text size="sm" fw={500}>{fmt(p.sellingPrice)}</Text>
                  </td>
                  <td>
                    <Badge size="sm" color="teal" variant="light">
                      {margin(p)}%
                    </Badge>
                  </td>
                  <td>
                    <Group gap={4}>
                      <Text
                        size="sm"
                        fw={500}
                        c={p.stock <= p.lowStockAt ? 'red' : 'dark'}
                      >
                        {p.stock} {p.unit}
                      </Text>
                      {p.stock <= p.lowStockAt && (
                        <IconAlertTriangle size={14} color="red" />
                      )}
                    </Group>
                  </td>
                  <td>
                    <Group gap={4}>
                      <Tooltip label="Edit">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => openEdit(p)}
                          disabled={deletingId === p.id}
                        >
                          <IconEdit size={15} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => del(p.id)}
                          loading={deletingId === p.id}
                          loaderProps={{ type: 'dots' }}
                        >
                          <IconTrash size={15} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '2rem', color: '#ADB5BD' }}
                  >
                    <Stack align="center" gap={4}>
                      <IconPackage size={32} opacity={0.3} />
                      <Text size="sm">
                        No products yet. Click "Add product" to get started.
                      </Text>
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
        title={editing ? 'Edit product' : 'Add product'}
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            label="Product name"
            required
            placeholder="e.g. Sugar 1kg"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <Group grow>
            <TextInput
              label="SKU / Code"
              placeholder="e.g. GR001"
              value={form.sku || ''}
              onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
            />
            <Select
              label="Category"
              data={CATEGORIES}
              value={form.category || ''}
              onChange={v => setForm(f => ({ ...f, category: v }))}
              clearable
              placeholder="Select category"
            />
          </Group>
          <Group grow>
            <NumberInput
              label="Buying price (UGX)"
              placeholder="0"
              value={form.buyingPrice || ''}
              onChange={v => setForm(f => ({ ...f, buyingPrice: v }))}
              min={0}
              thousandSeparator=","
            />
            <NumberInput
              label="Selling price (UGX)"
              required
              placeholder="0"
              value={form.sellingPrice || ''}
              onChange={v => setForm(f => ({ ...f, sellingPrice: v }))}
              min={0}
              thousandSeparator=","
            />
          </Group>
          <Group grow>
            <NumberInput
              label="Stock quantity"
              placeholder="0"
              value={form.stock || ''}
              onChange={v => setForm(f => ({ ...f, stock: v }))}
              min={0}
            />
            <NumberInput
              label="Low stock alert at"
              value={form.lowStockAt || 5}
              onChange={v => setForm(f => ({ ...f, lowStockAt: v }))}
              min={0}
            />
          </Group>
          <Select
            label="Unit"
            data={['pcs', 'kg', 'litres', 'packets', 'boxes', 'bottles']}
            value={form.unit || 'pcs'}
            onChange={v => setForm(f => ({ ...f, unit: v }))}
          />
          <Button
            onClick={save}
            mt="sm"
            fullWidth
            loading={saving}
            loaderProps={{ type: 'dots' }}
          >
            {saving
              ? editing ? 'Updating product...' : 'Adding product...'
              : editing ? 'Update product' : 'Add product'
            }
          </Button>
        </Stack>
      </Modal>
    </DashboardShell>
  )
}