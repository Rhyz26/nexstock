'use client'
import { useEffect, useState } from 'react'
import {
  Stack, Group, Title, Button, TextInput, Paper,
  Text, Modal, ActionIcon, Tooltip, Badge, Avatar
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconPlus, IconSearch, IconEdit, IconTrash,
  IconUsers, IconFileTypeCsv, IconFileTypePdf
} from '@tabler/icons-react'
import DashboardShell from '@/components/layout/DashboardShell'
import dayjs from 'dayjs'

const empty = { name: '', phone: '', email: '', address: '' }

const fmt = n => `UGX ${Number(n || 0).toLocaleString()}`

// ─── CSV Export ───────────────────────────────────────────────────
function exportCustomersCSV(customers) {
  const headers = [
    'Name', 'Phone', 'Email', 'Address',
    'Total Invoices', 'Credit Balance (UGX)', 'Date Added'
  ]

  const rows = customers.map(c => [
    c.name,
    c.phone || '',
    c.email || '',
    c.address || '',
    c._count?.invoices || 0,
    c.balance || 0,
    dayjs(c.createdAt).format('DD/MM/YYYY'),
  ])

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
async function exportCustomersPDF(customers, search) {
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
  doc.text('CUSTOMERS REPORT', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Generated: ${now.format('DD/MM/YYYY HH:mm:ss')}`,
    pageW - 14, 10, { align: 'right' }
  )
  if (search) {
    doc.text(`Search: "${search}"`, pageW - 14, 17, { align: 'right' })
  }
  doc.text(`Total customers: ${customers.length}`, 14, 22)

  // Summary bar
  const totalWithInvoices = customers.filter(c => (c._count?.invoices || 0) > 0).length
  const totalCreditBalance = customers.reduce((s, c) => s + (c.balance || 0), 0)

  doc.setFillColor(235, 245, 255)
  doc.rect(14, 32, pageW - 28, 12, 'F')
  doc.setTextColor(25, 113, 194)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(`Total customers: ${customers.length}`, 18, 39)
  doc.text(`With invoices: ${totalWithInvoices}`, 80, 39)
  doc.text(`Total credit owed: ${fmt(totalCreditBalance)}`, 150, 39)

  // Table
  const tableRows = customers.map(c => [
    c.name,
    c.phone || '—',
    c.email || '—',
    c.address || '—',
    String(c._count?.invoices || 0),
    c.balance > 0 ? fmt(c.balance) : '—',
    dayjs(c.createdAt).format('DD/MM/YYYY'),
  ])

  doc.autoTable({
    startY: 48,
    head: [[
      'Name', 'Phone', 'Email', 'Address',
      'Invoices', 'Credit Balance', 'Date Added'
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
      0: { cellWidth: 45 },
      1: { cellWidth: 35 },
      2: { cellWidth: 55 },
      3: { cellWidth: 50 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 35, halign: 'right' },
      6: { cellWidth: 28 },
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
      `Nexstock · Customers Report · ${now.format('DD/MM/YYYY HH:mm')}`,
      pageW / 2, footerY, { align: 'center' }
    )
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, footerY, { align: 'right' })
  }

  return doc
}

// ─── Main Page ────────────────────────────────────────────────────
export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [opened, { open, close }] = useDisclosure()

  const load = async () => {
    const params = search ? `?search=${search}` : ''
    const res = await fetch(`/api/customers${params}`)
    const data = await res.json()
    setCustomers(Array.isArray(data) ? data : [])
  }

  useEffect(() => { load() }, [search])

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
    if (!form.name) {
      notifications.show({ color: 'red', message: 'Customer name is required' })
      return
    }
    setSaving(true)
    try {
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
        setCustomers(prev =>
          prev.map(c => c.id === editing ? { ...saved, _count: c._count } : c)
        )
        notifications.show({ color: 'green', message: 'Customer updated' })
      } else {
        setCustomers(prev => [{ ...saved, _count: { invoices: 0 } }, ...prev])
        notifications.show({ color: 'green', message: 'Customer added' })
      }
      close()
    } finally {
      setSaving(false)
    }
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

  // ── Export CSV
  const handleExportCSV = () => {
    if (!customers.length) {
      notifications.show({ color: 'orange', message: 'No customers to export' })
      return
    }
    setExportingCsv(true)
    try {
      const csv = exportCustomersCSV(customers)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const filename = `nexstock-customers-${dayjs().format('YYYY-MM-DD')}.csv`
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
    if (!customers.length) {
      notifications.show({ color: 'orange', message: 'No customers to export' })
      return
    }
    setExportingPdf(true)
    try {
      const doc = await exportCustomersPDF(customers, search)
      const filename = `nexstock-customers-${dayjs().format('YYYY-MM-DD')}.pdf`
      doc.save(filename)
      notifications.show({ color: 'green', message: `${filename} downloaded` })
    } catch (e) {
      notifications.show({ color: 'red', message: 'Failed to export PDF' })
    } finally {
      setExportingPdf(false)
    }
  }

  const initials = name =>
    name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Title order={3}>Customers</Title>
          <Group gap="sm">
            <Tooltip label="Export customers to CSV">
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
            <Tooltip label="Export customers to PDF">
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
              Add customer
            </Button>
          </Group>
        </Group>

        <TextInput
          placeholder="Search by name or phone..."
          leftSection={<IconSearch size={15} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          maw={400}
        />

        {/* Summary badges */}
        {customers.length > 0 && (
          <Group gap="sm" wrap="wrap">
            <Badge variant="light" color="blue" size="md">
              Total: {customers.length} customers
            </Badge>
            {customers.filter(c => (c._count?.invoices || 0) > 0).length > 0 && (
              <Badge variant="light" color="teal" size="md">
                With invoices: {customers.filter(c => (c._count?.invoices || 0) > 0).length}
              </Badge>
            )}
            {customers.filter(c => c.balance > 0).length > 0 && (
              <Badge variant="light" color="red" size="md">
                With credit balance: {customers.filter(c => c.balance > 0).length}
              </Badge>
            )}
            {search && (
              <Text size="xs" c="dimmed" style={{ alignSelf: 'center' }}>
                {customers.length} result{customers.length !== 1 ? 's' : ''} for &quot;{search}&quot;
              </Text>
            )}
          </Group>
        )}

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
                          {fmt(c.balance)} credit
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
                  <td
                    colSpan={6}
                    style={{ textAlign: 'center', padding: '2rem', color: '#ADB5BD' }}
                  >
                    <Stack align="center" gap={4}>
                      <IconUsers size={32} opacity={0.3} />
                      <Text size="sm">
                        {search
                          ? `No customers found for "${search}"`
                          : 'No customers yet. Click "Add customer" to get started.'}
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
          <Button
            onClick={save}
            fullWidth
            loading={saving}
            loaderProps={{ type: 'dots' }}
          >
            {saving
              ? editing ? 'Updating...' : 'Adding customer...'
              : editing ? 'Update customer' : 'Add customer'
            }
          </Button>
        </Stack>
      </Modal>
    </DashboardShell>
  )
}