'use client'
import { useEffect, useState } from 'react'
import {
  Stack, Group, Title, Button, Paper, Text, Modal,
  TextInput, NumberInput, Select, Textarea, ActionIcon,
  Tooltip, Badge
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconPlus, IconTrash, IconFileTypeCsv, IconFileTypePdf
} from '@tabler/icons-react'
import DashboardShell from '@/components/layout/DashboardShell'
import dayjs from 'dayjs'

const CATEGORIES = [
  'Rent', 'Stock purchase', 'Salaries', 'Utilities',
  'Transport', 'Marketing', 'Equipment', 'Other'
]

const fmt = n => `UGX ${Number(n || 0).toLocaleString()}`

// ─── CSV Export ───────────────────────────────────────────────────
function exportExpensesCSV(expenses) {
  const headers = ['Category', 'Amount (UGX)', 'Note', 'Date']

  const rows = expenses.map(e => [
    e.category,
    e.amount,
    e.note || '',
    dayjs(e.date).format('DD/MM/YYYY'),
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
async function exportExpensesPDF(expenses) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const now = dayjs()

  // Header bar
  doc.setFillColor(25, 113, 194)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('EXPENSES REPORT', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Generated: ${now.format('DD/MM/YYYY HH:mm:ss')}`,
    pageW - 14, 10, { align: 'right' }
  )
  doc.text(`Total records: ${expenses.length}`, 14, 22)

  // Summary bar
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  // Group by category for summary
  const byCategory = {}
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
  })
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]

  doc.setFillColor(235, 245, 255)
  doc.rect(14, 32, pageW - 28, 12, 'F')
  doc.setTextColor(25, 113, 194)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(`Total expenses: ${fmt(total)}`, 18, 39)
  if (topCategory) {
    doc.text(`Top category: ${topCategory[0]} (${fmt(topCategory[1])})`, 90, 39)
  }

  // Category breakdown section
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Breakdown by category', 14, 54)

  const categoryRows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => [
      cat,
      fmt(amt),
      `${Math.round((amt / total) * 100)}%`,
    ])

  doc.autoTable({
    startY: 58,
    head: [['Category', 'Amount', '% of Total']],
    body: categoryRows,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: {
      fillColor: [25, 113, 194],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60, halign: 'right' },
      2: { cellWidth: 40, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  // All expenses table
  const expensesStartY = doc.lastAutoTable.finalY + 10
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('All expenses', 14, expensesStartY)

  const tableRows = expenses.map(e => [
    e.category,
    fmt(e.amount),
    e.note || '—',
    dayjs(e.date).format('DD/MM/YYYY'),
  ])

  doc.autoTable({
    startY: expensesStartY + 4,
    head: [['Category', 'Amount', 'Note', 'Date']],
    body: tableRows,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: {
      fillColor: [25, 113, 194],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 70 },
      3: { cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  })

  // Total row at the bottom
  const totalY = doc.lastAutoTable.finalY + 6
  doc.setFillColor(25, 113, 194)
  doc.rect(14, totalY - 2, pageW - 28, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL', 18, totalY + 4)
  doc.text(fmt(total), pageW - 14, totalY + 4, { align: 'right' })

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
      `Nexstock · Expenses Report · ${now.format('DD/MM/YYYY HH:mm')}`,
      pageW / 2, footerY, { align: 'center' }
    )
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, footerY, { align: 'right' })
  }

  return doc
}

// ─── Main Page ────────────────────────────────────────────────────
export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [saving, setSaving] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [form, setForm] = useState({ category: '', amount: '', note: '', date: '' })
  const [opened, { open, close }] = useDisclosure()

  const load = async () => {
    const res = await fetch('/api/expenses')
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.category) {
      notifications.show({ color: 'red', message: 'Please select a category' })
      return
    }
    if (!form.amount || form.amount <= 0) {
      notifications.show({ color: 'red', message: 'Please enter a valid amount' })
      return
    }
    setSaving(true)
    try {
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
    } finally {
      setSaving(false)
    }
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

  // ── Export CSV
  const handleExportCSV = () => {
    if (!expenses.length) {
      notifications.show({ color: 'orange', message: 'No expenses to export' })
      return
    }
    setExportingCsv(true)
    try {
      const csv = exportExpensesCSV(expenses)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const filename = `nexstock-expenses-${dayjs().format('YYYY-MM-DD')}.csv`
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
    if (!expenses.length) {
      notifications.show({ color: 'orange', message: 'No expenses to export' })
      return
    }
    setExportingPdf(true)
    try {
      const doc = await exportExpensesPDF(expenses)
      const filename = `nexstock-expenses-${dayjs().format('YYYY-MM-DD')}.pdf`
      doc.save(filename)
      notifications.show({ color: 'green', message: `${filename} downloaded` })
    } catch (e) {
      notifications.show({ color: 'red', message: 'Failed to export PDF' })
    } finally {
      setExportingPdf(false)
    }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  // Group by category for badges
  const byCategory = {}
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
  })

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Title order={3}>Expenses</Title>
          <Group gap="sm">
            <Tooltip label="Export expenses to CSV">
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
            <Tooltip label="Export expenses to PDF">
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
            <Button leftSection={<IconPlus size={16} />} onClick={open}>
              Add expense
            </Button>
          </Group>
        </Group>

        {/* Total card */}
        <Paper p="md" radius="lg" withBorder bg="red.0">
          <Text size="sm" c="dimmed">Total expenses (all time)</Text>
          <Text fw={700} size="xl" c="red">{fmt(total)}</Text>
        </Paper>

        {/* Category breakdown badges */}
        {expenses.length > 0 && (
          <Group gap="sm" wrap="wrap">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => (
                <Badge key={cat} variant="light" color="blue" size="md">
                  {cat}: {fmt(amt)}
                </Badge>
              ))
            }
          </Group>
        )}

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
                  <td
                    colSpan={5}
                    style={{ textAlign: 'center', padding: '2rem', color: '#ADB5BD' }}
                  >
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
            placeholder="Select category"
          />
          <NumberInput
            label="Amount (UGX)"
            required
            value={form.amount}
            onChange={v => setForm(f => ({ ...f, amount: v }))}
            thousandSeparator=","
            min={0}
            placeholder="0"
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
            placeholder="e.g. Paid to supplier for monthly stock"
          />
          <Button
            onClick={save}
            fullWidth
            loading={saving}
            loaderProps={{ type: 'dots' }}
          >
            {saving ? 'Saving expense...' : 'Save expense'}
          </Button>
        </Stack>
      </Modal>
    </DashboardShell>
  )
}