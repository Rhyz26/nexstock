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
  IconAlertTriangle, IconPackage, IconFileTypeCsv, IconFileTypePdf
} from '@tabler/icons-react'
import DashboardShell from '@/components/layout/DashboardShell'
import dayjs from 'dayjs'

const CATEGORIES = [
  'Groceries', 'Toiletries', 'Airtime', 'Electronics',
  'Clothing', 'Beverages', 'Stationery', 'Other'
]

const empty = {
  name: '', sku: '', category: '', buyingPrice: '',
  sellingPrice: '', stock: '', lowStockAt: 5, unit: 'pcs'
}

const fmt = n => `UGX ${Number(n || 0).toLocaleString()}`
const margin = p =>
  p.buyingPrice > 0
    ? Math.round(((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100)
    : 0

// ─── CSV Export ───────────────────────────────────────────────────
function exportInventoryCSV(products) {
  const headers = [
    'Product Name', 'SKU', 'Category', 'Unit',
    'Buying Price (UGX)', 'Selling Price (UGX)',
    'Margin (%)', 'Stock Qty', 'Low Stock Alert At', 'Stock Status'
  ]

  const rows = products.map(p => {
    const stockStatus = p.stock === 0
      ? 'Out of stock'
      : p.stock <= p.lowStockAt
        ? 'Low stock'
        : 'In stock'
    return [
      p.name,
      p.sku || '',
      p.category || '',
      p.unit || 'pcs',
      p.buyingPrice,
      p.sellingPrice,
      margin(p),
      p.stock,
      p.lowStockAt,
      stockStatus,
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        const str = String(cell)
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    ),
  ].join('\n')

  return csvContent
}

// ─── PDF Export ───────────────────────────────────────────────────
async function exportInventoryPDF(products, search, category) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const now = dayjs()

  // Header bar
  doc.setFillColor(25, 113, 194)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('INVENTORY REPORT', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${now.format('DD/MM/YYYY HH:mm:ss')}`, pageW - 14, 10, { align: 'right' })
  if (search) doc.text(`Search: "${search}"`, pageW - 14, 17, { align: 'right' })
  if (category) doc.text(`Category: ${category}`, pageW - 14, category || search ? 24 : 17, { align: 'right' })
  doc.text(`Total products: ${products.length}`, 14, 22)

  // Summary bar
  const totalStockValue = products.reduce((s, p) => s + (p.buyingPrice * p.stock), 0)
  const totalRetailValue = products.reduce((s, p) => s + (p.sellingPrice * p.stock), 0)
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.lowStockAt).length
  const outOfStockCount = products.filter(p => p.stock === 0).length

  doc.setFillColor(235, 245, 255)
  doc.rect(14, 32, pageW - 28, 12, 'F')
  doc.setTextColor(25, 113, 194)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(`Stock cost value: ${fmt(totalStockValue)}`, 18, 39)
  doc.text(`Retail value: ${fmt(totalRetailValue)}`, 90, 39)
  doc.text(`Low stock: ${lowStockCount}`, 175, 39)
  doc.text(`Out of stock: ${outOfStockCount}`, 215, 39)

  // Table
  const tableRows = products.map(p => {
    const stockStatus = p.stock === 0
      ? 'Out of stock'
      : p.stock <= p.lowStockAt
        ? 'Low stock'
        : 'In stock'
    return [
      p.name,
      p.sku || '—',
      p.category || '—',
      p.unit || 'pcs',
      fmt(p.buyingPrice),
      fmt(p.sellingPrice),
      `${margin(p)}%`,
      `${p.stock}`,
      stockStatus,
    ]
  })

  doc.autoTable({
    startY: 48,
    head: [[
      'Product Name', 'SKU', 'Category', 'Unit',
      'Buy Price', 'Sell Price', 'Margin', 'Stock', 'Status'
    ]],
    body: tableRows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: {
      fillColor: [25, 113, 194],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 22 },
      2: { cellWidth: 28 },
      3: { cellWidth: 18 },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 18, halign: 'center' },
      8: { cellWidth: 28, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  // Footer on each page
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const footerY = doc.internal.pageSize.getHeight() - 8
    doc.setDrawColor(200, 200, 200)
    doc.line(14, footerY - 3, pageW - 14, footerY - 3)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Nexstock · Inventory Report · ${now.format('DD/MM/YYYY HH:mm')}`,
      pageW / 2, footerY, { align: 'center' }
    )
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, footerY, { align: 'right' })
  }

  return doc
}

// ─── Main Page ────────────────────────────────────────────────────
export default function InventoryPage() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [nameError, setNameError] = useState('')
  const [exportingCsv, setExportingCsv] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
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
    setNameError('')
    open()
  }

  const openEdit = (p) => {
    setForm({ ...p })
    setEditing(p.id)
    setNameError('')
    open()
  }

  const handleNameChange = (value) => {
    setForm(f => ({ ...f, name: value }))
    if (!value.trim()) { setNameError(''); return }
    const duplicate = products.find(p => {
      if (editing && p.id === editing) return false
      return p.name.toLowerCase().trim() === value.toLowerCase().trim()
    })
    if (duplicate) {
      setNameError(`A product named "${duplicate.name}" already exists`)
    } else {
      setNameError('')
    }
  }

  const save = async () => {
    if (!form.name || !form.name.trim()) {
      setNameError('Product name is required')
      return
    }
    const duplicate = products.find(p => {
      if (editing && p.id === editing) return false
      return p.name.toLowerCase().trim() === form.name.toLowerCase().trim()
    })
    if (duplicate) {
      setNameError(`A product named "${duplicate.name}" already exists`)
      notifications.show({
        color: 'red',
        title: 'Duplicate product',
        message: `"${duplicate.name}" is already in your inventory`,
      })
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
      const data = await res.json()
      if (!res.ok) {
        if (data.error && data.error.includes('already exists')) {
          setNameError(data.error)
          notifications.show({ color: 'red', title: 'Duplicate product', message: data.error })
        } else {
          notifications.show({ color: 'red', message: data.error || 'Failed to save product' })
        }
        return
      }
      if (editing) {
        setProducts(prev => prev.map(p => p.id === editing ? data : p))
        notifications.show({ color: 'green', message: 'Product updated successfully' })
      } else {
        setProducts(prev => [data, ...prev])
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
        notifications.show({ color: 'red', message: data.error || 'Failed to delete product' })
        return
      }
      setProducts(prev => prev.filter(p => p.id !== id))
      notifications.show({ color: 'orange', message: 'Product deleted' })
    } finally {
      setDeletingId(null)
    }
  }

  // ── Export CSV
  const handleExportCSV = () => {
    if (!products.length) {
      notifications.show({ color: 'orange', message: 'No products to export' })
      return
    }
    setExportingCsv(true)
    try {
      const csv = exportInventoryCSV(products)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const filename = `nexstock-inventory-${dayjs().format('YYYY-MM-DD')}.csv`
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      notifications.show({ color: 'green', message: `${filename} downloaded` })
    } catch (e) {
      notifications.show({ color: 'red', message: 'Failed to export CSV' })
    } finally {
      setExportingCsv(false)
    }
  }

  // ── Export PDF
  const handleExportPDF = async () => {
    if (!products.length) {
      notifications.show({ color: 'orange', message: 'No products to export' })
      return
    }
    setExportingPdf(true)
    try {
      const doc = await exportInventoryPDF(products, search, category)
      const filename = `nexstock-inventory-${dayjs().format('YYYY-MM-DD')}.pdf`
      doc.save(filename)
      notifications.show({ color: 'green', message: `${filename} downloaded` })
    } catch (e) {
      notifications.show({ color: 'red', message: 'Failed to export PDF' })
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Title order={3}>Inventory</Title>
          <Group gap="sm">
            <Tooltip label="Export inventory to CSV">
              <Button
                variant="light"
                color="teal"
                leftSection={<IconFileTypeCsv size={16} />}
                onClick={handleExportCSV}
                loading={exportingCsv}
                loaderProps={{ type: 'dots' }}
                size="sm"
              >
                {exportingCsv ? 'Exporting...' : 'CSV'}
              </Button>
            </Tooltip>
            <Tooltip label="Export inventory to PDF">
              <Button
                variant="light"
                color="red"
                leftSection={<IconFileTypePdf size={16} />}
                onClick={handleExportPDF}
                loading={exportingPdf}
                loaderProps={{ type: 'dots' }}
                size="sm"
              >
                {exportingPdf ? 'Generating...' : 'PDF'}
              </Button>
            </Tooltip>
            <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
              Add product
            </Button>
          </Group>
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

        {/* Summary badges */}
        {products.length > 0 && (
          <Group gap="sm" wrap="wrap">
            <Badge variant="light" color="blue" size="md">
              Total: {products.length} products
            </Badge>
            {products.filter(p => p.stock === 0).length > 0 && (
              <Badge variant="light" color="red" size="md">
                Out of stock: {products.filter(p => p.stock === 0).length}
              </Badge>
            )}
            {products.filter(p => p.stock > 0 && p.stock <= p.lowStockAt).length > 0 && (
              <Badge variant="light" color="orange" size="md">
                Low stock: {products.filter(p => p.stock > 0 && p.stock <= p.lowStockAt).length}
              </Badge>
            )}
            {search || category ? (
              <Text size="xs" c="dimmed" style={{ alignSelf: 'center' }}>
                {products.length} result{products.length !== 1 ? 's' : ''}
                {search ? ` for "${search}"` : ''}
                {category ? ` in ${category}` : ''}
              </Text>
            ) : null}
          </Group>
        )}

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
                  <td><Text size="sm">{p.category || '—'}</Text></td>
                  <td><Text size="sm">{fmt(p.buyingPrice)}</Text></td>
                  <td><Text size="sm" fw={500}>{fmt(p.sellingPrice)}</Text></td>
                  <td>
                    <Badge size="sm" color="teal" variant="light">
                      {margin(p)}%
                    </Badge>
                  </td>
                  <td>
                    <Group gap={4}>
                      <Text
                        size="sm" fw={500}
                        c={p.stock === 0 ? 'red' : p.stock <= p.lowStockAt ? 'orange' : 'dark'}
                      >
                        {p.stock} {p.unit}
                      </Text>
                      {p.stock <= p.lowStockAt && p.stock > 0 && (
                        <Tooltip label="Low stock">
                          <IconAlertTriangle size={14} color="orange" />
                        </Tooltip>
                      )}
                      {p.stock === 0 && (
                        <Tooltip label="Out of stock">
                          <IconAlertTriangle size={14} color="red" />
                        </Tooltip>
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#ADB5BD' }}>
                    <Stack align="center" gap={4}>
                      <IconPackage size={32} opacity={0.3} />
                      <Text size="sm">
                        {search || category
                          ? 'No products match your search.'
                          : 'No products yet. Click "Add product" to get started.'}
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
        onClose={() => { close(); setNameError('') }}
        title={editing ? 'Edit product' : 'Add product'}
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            label="Product name"
            required
            placeholder="e.g. Sugar 1kg"
            value={form.name}
            onChange={e => handleNameChange(e.target.value)}
            error={nameError}
            description={
              !nameError && form.name
                ? '✓ Name is available'
                : undefined
            }
            styles={{ description: { color: '#2F9E44' } }}
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
            disabled={!!nameError}
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