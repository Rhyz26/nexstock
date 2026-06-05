'use client'
import { useEffect, useState } from 'react'
import {
  Stack, Group, Title, Paper, Text, Select,
  Grid, SegmentedControl, Button, Tooltip
} from '@mantine/core'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  IconFileTypeCsv, IconFileTypePdf
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import DashboardShell from '@/components/layout/DashboardShell'
import dayjs from 'dayjs'

const COLORS = ['#1971C2', '#2F9E44', '#E67700', '#C92A2A', '#7950F2', '#0C8599']
const fmt = n => `UGX ${Number(n || 0).toLocaleString()}`

// ─── CSV Exporters ────────────────────────────────────────────────
function exportSalesCSV(data, period) {
  const headers = ['Date', 'Revenue (UGX)']
  const rows = (data.byDay || []).map(d => [
    dayjs(d.date).format('DD/MM/YYYY'),
    d.total,
  ])

  const methodHeaders = ['Payment Method', 'Amount (UGX)']
  const methodRows = Object.entries(data.byMethod || {}).map(([method, amount]) => [
    method.replace(/_/g, ' '),
    amount,
  ])

  const summary = [
    ['Report Type', 'Sales Report'],
    ['Period', period],
    ['Total Revenue (UGX)', data.total || 0],
    ['Total Transactions', data.count || 0],
    [],
    ['--- Daily Revenue ---'],
    headers,
    ...rows,
    [],
    ['--- By Payment Method ---'],
    methodHeaders,
    ...methodRows,
  ]

  return summary.map(row =>
    row.map(cell => {
      const str = String(cell ?? '')
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  ).join('\n')
}

function exportProductsCSV(data, period) {
  const headers = ['Product Name', 'Qty Sold', 'Revenue (UGX)']
  const rows = (data || []).map(p => [p.name, p.qty, p.revenue])

  const summary = [
    ['Report Type', 'Top Products Report'],
    ['Period', period],
    [],
    headers,
    ...rows,
  ]

  return summary.map(row =>
    row.map(cell => {
      const str = String(cell ?? '')
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  ).join('\n')
}

function exportExpensesCSV(data, period) {
  const headers = ['Category', 'Amount (UGX)']
  const categoryRows = (data.byCategory || []).map(e => [e.category, e.amount || e.total])

  const allHeaders = ['Category', 'Amount (UGX)', 'Note', 'Date']
  const allRows = (data.expenses || []).map(e => [
    e.category,
    e.amount,
    e.note || '',
    dayjs(e.date).format('DD/MM/YYYY'),
  ])

  const summary = [
    ['Report Type', 'Expenses Report'],
    ['Period', period],
    ['Total Expenses (UGX)', data.total || 0],
    [],
    ['--- By Category ---'],
    headers,
    ...categoryRows,
    [],
    ['--- All Expenses ---'],
    allHeaders,
    ...allRows,
  ]

  return summary.map(row =>
    row.map(cell => {
      const str = String(cell ?? '')
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  ).join('\n')
}

// ─── PDF Exporters ────────────────────────────────────────────────
async function exportSalesPDF(data, period) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const now = dayjs()

  // Header
  doc.setFillColor(25, 113, 194)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('SALES REPORT', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${period}`, 14, 21)
  doc.text(`Generated: ${now.format('DD/MM/YYYY HH:mm:ss')}`, pageW - 14, 10, { align: 'right' })

  // Summary bar
  doc.setFillColor(235, 245, 255)
  doc.rect(14, 32, pageW - 28, 12, 'F')
  doc.setTextColor(25, 113, 194)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(`Total revenue: ${fmt(data.total || 0)}`, 18, 39)
  doc.text(`Transactions: ${data.count || 0}`, 110, 39)

  // By payment method table
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Revenue by payment method', 14, 54)

  const methodRows = Object.entries(data.byMethod || {}).map(([method, amount]) => [
    method.replace(/_/g, ' '),
    fmt(amount),
    `${data.total > 0 ? Math.round((amount / data.total) * 100) : 0}%`,
  ])

  doc.autoTable({
    startY: 58,
    head: [['Payment Method', 'Amount', '% of Total']],
    body: methodRows.length ? methodRows : [['No payments recorded', '—', '—']],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [25, 113, 194], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60, halign: 'right' },
      2: { cellWidth: 40, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  // Daily revenue table
  const dailyStartY = doc.lastAutoTable.finalY + 10
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Daily revenue breakdown', 14, dailyStartY)

  const dailyRows = (data.byDay || []).map(d => [
    dayjs(d.date).format('DD MMM YYYY'),
    dayjs(d.date).format('dddd'),
    fmt(d.total),
  ])

  doc.autoTable({
    startY: dailyStartY + 4,
    head: [['Date', 'Day', 'Revenue']],
    body: dailyRows.length ? dailyRows : [['No data for this period', '', '']],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [25, 113, 194], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 50 },
      2: { cellWidth: 80, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  })

  // Total row
  const totalY = doc.lastAutoTable.finalY + 6
  doc.setFillColor(25, 113, 194)
  doc.rect(14, totalY - 2, pageW - 28, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL REVENUE', 18, totalY + 4)
  doc.text(fmt(data.total || 0), pageW - 14, totalY + 4, { align: 'right' })

  // Footer
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
      `Nexstock · Sales Report · ${now.format('DD/MM/YYYY HH:mm')}`,
      pageW / 2, footerY, { align: 'center' }
    )
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, footerY, { align: 'right' })
  }

  return doc
}

async function exportProductsPDF(data, period) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const now = dayjs()

  // Header
  doc.setFillColor(47, 158, 68)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('TOP PRODUCTS REPORT', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${period}`, 14, 21)
  doc.text(`Generated: ${now.format('DD/MM/YYYY HH:mm:ss')}`, pageW - 14, 10, { align: 'right' })

  // Summary bar
  const totalRevenue = (data || []).reduce((s, p) => s + p.revenue, 0)
  const totalQty = (data || []).reduce((s, p) => s + p.qty, 0)

  doc.setFillColor(235, 252, 241)
  doc.rect(14, 32, pageW - 28, 12, 'F')
  doc.setTextColor(47, 158, 68)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(`Total revenue: ${fmt(totalRevenue)}`, 18, 39)
  doc.text(`Total units sold: ${totalQty}`, 110, 39)
  doc.text(`Products: ${(data || []).length}`, 160, 39)

  // Products table
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Products ranked by revenue', 14, 54)

  const tableRows = (data || []).map((p, i) => [
    i + 1,
    p.name,
    p.qty,
    fmt(p.revenue),
    totalRevenue > 0 ? `${Math.round((p.revenue / totalRevenue) * 100)}%` : '0%',
  ])

  doc.autoTable({
    startY: 58,
    head: [['#', 'Product Name', 'Qty Sold', 'Revenue', '% of Total']],
    body: tableRows.length ? tableRows : [['', 'No sales data for this period', '', '', '']],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [47, 158, 68], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 45, halign: 'right' },
      4: { cellWidth: 25, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  // Footer
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
      `Nexstock · Top Products Report · ${now.format('DD/MM/YYYY HH:mm')}`,
      pageW / 2, footerY, { align: 'center' }
    )
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, footerY, { align: 'right' })
  }

  return doc
}

async function exportExpensesReportPDF(data, period) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const now = dayjs()

  // Header
  doc.setFillColor(201, 42, 42)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('EXPENSES REPORT', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${period}`, 14, 21)
  doc.text(`Generated: ${now.format('DD/MM/YYYY HH:mm:ss')}`, pageW - 14, 10, { align: 'right' })

  // Summary bar
  doc.setFillColor(255, 245, 245)
  doc.rect(14, 32, pageW - 28, 12, 'F')
  doc.setTextColor(201, 42, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(`Total expenses: ${fmt(data.total || 0)}`, 18, 39)
  doc.text(`Categories: ${(data.byCategory || []).length}`, 110, 39)

  // By category table
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Expenses by category', 14, 54)

  const categoryRows = (data.byCategory || []).map(e => [
    e.category,
    fmt(e.total || e.amount || 0),
    data.total > 0
      ? `${Math.round(((e.total || e.amount || 0) / data.total) * 100)}%`
      : '0%',
  ])

  doc.autoTable({
    startY: 58,
    head: [['Category', 'Amount', '% of Total']],
    body: categoryRows.length ? categoryRows : [['No expenses recorded', '—', '—']],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [201, 42, 42], textColor: 255, fontStyle: 'bold' },
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

  const allRows = (data.expenses || []).map(e => [
    e.category,
    fmt(e.amount),
    e.note || '—',
    dayjs(e.date).format('DD/MM/YYYY'),
  ])

  doc.autoTable({
    startY: expensesStartY + 4,
    head: [['Category', 'Amount', 'Note', 'Date']],
    body: allRows.length ? allRows : [['No expenses for this period', '', '', '']],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [201, 42, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 70 },
      3: { cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  })

  // Total row
  const totalY = doc.lastAutoTable.finalY + 6
  doc.setFillColor(201, 42, 42)
  doc.rect(14, totalY - 2, pageW - 28, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL EXPENSES', 18, totalY + 4)
  doc.text(fmt(data.total || 0), pageW - 14, totalY + 4, { align: 'right' })

  // Footer
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
export default function ReportsPage() {
  const [type, setType] = useState('sales')
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('this_month')
  const [exportingCsv, setExportingCsv] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const getPeriod = () => {
    const now = dayjs()
    if (period === 'this_month') return {
      from: now.startOf('month').toISOString(),
      to: now.toISOString(),
      label: `This month (${now.format('MMM YYYY')})`,
    }
    if (period === 'last_month') return {
      from: now.subtract(1, 'month').startOf('month').toISOString(),
      to: now.subtract(1, 'month').endOf('month').toISOString(),
      label: `Last month (${now.subtract(1, 'month').format('MMM YYYY')})`,
    }
    if (period === 'last_7') return {
      from: now.subtract(7, 'day').toISOString(),
      to: now.toISOString(),
      label: 'Last 7 days',
    }
    if (period === 'last_30') return {
      from: now.subtract(30, 'day').toISOString(),
      to: now.toISOString(),
      label: 'Last 30 days',
    }
    return {
      from: now.startOf('month').toISOString(),
      to: now.toISOString(),
      label: `This month (${now.format('MMM YYYY')})`,
    }
  }

  const load = async () => {
    setData(null)
    const { from, to } = getPeriod()
    const res = await fetch(`/api/reports?type=${type}&from=${from}&to=${to}`)
    const result = await res.json()
    setData(result)
  }

  useEffect(() => { load() }, [type, period])

  const isSalesData = data && !Array.isArray(data) && data.byDay !== undefined
  const isProductsData = data && Array.isArray(data)
  const isExpensesData = data && !Array.isArray(data) && data.byCategory !== undefined

  // ── Export CSV
  const handleExportCSV = () => {
    if (!data) {
      notifications.show({ color: 'orange', message: 'No data to export' })
      return
    }
    setExportingCsv(true)
    try {
      const { label } = getPeriod()
      let csv = ''
      let filename = ''

      if (type === 'sales' && isSalesData) {
        csv = exportSalesCSV(data, label)
        filename = `nexstock-sales-report-${dayjs().format('YYYY-MM-DD')}.csv`
      } else if (type === 'products' && isProductsData) {
        csv = exportProductsCSV(data, label)
        filename = `nexstock-products-report-${dayjs().format('YYYY-MM-DD')}.csv`
      } else if (type === 'expenses' && isExpensesData) {
        csv = exportExpensesCSV(data, label)
        filename = `nexstock-expenses-report-${dayjs().format('YYYY-MM-DD')}.csv`
      } else {
        notifications.show({ color: 'orange', message: 'No data to export for this report' })
        return
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
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
    if (!data) {
      notifications.show({ color: 'orange', message: 'No data to export' })
      return
    }
    setExportingPdf(true)
    try {
      const { label } = getPeriod()
      let doc = null
      let filename = ''

      if (type === 'sales' && isSalesData) {
        doc = await exportSalesPDF(data, label)
        filename = `nexstock-sales-report-${dayjs().format('YYYY-MM-DD')}.pdf`
      } else if (type === 'products' && isProductsData) {
        doc = await exportProductsPDF(data, label)
        filename = `nexstock-products-report-${dayjs().format('YYYY-MM-DD')}.pdf`
      } else if (type === 'expenses' && isExpensesData) {
        doc = await exportExpensesReportPDF(data, label)
        filename = `nexstock-expenses-report-${dayjs().format('YYYY-MM-DD')}.pdf`
      } else {
        notifications.show({ color: 'orange', message: 'No data to export for this report' })
        return
      }

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
          <Title order={3}>Reports</Title>
          <Group gap="sm">
            <Tooltip label={`Export ${type} report to CSV`}>
              <Button
                variant="light"
                color="teal"
                leftSection={<IconFileTypeCsv size={16} />}
                onClick={handleExportCSV}
                loading={exportingCsv}
                loaderProps={{ type: 'dots' }}
                size="sm"
                disabled={!data}
              >
                {exportingCsv ? 'Exporting...' : 'CSV'}
              </Button>
            </Tooltip>
            <Tooltip label={`Export ${type} report to PDF`}>
              <Button
                variant="light"
                color="red"
                leftSection={<IconFileTypePdf size={16} />}
                onClick={handleExportPDF}
                loading={exportingPdf}
                loaderProps={{ type: 'dots' }}
                size="sm"
                disabled={!data}
              >
                {exportingPdf ? 'Generating...' : 'PDF'}
              </Button>
            </Tooltip>
          </Group>
        </Group>

        {/* Filters */}
        <Group gap="sm" wrap="wrap">
          <SegmentedControl
            size="xs"
            value={period}
            onChange={setPeriod}
            data={[
              { value: 'last_7', label: '7 days' },
              { value: 'this_month', label: 'This month' },
              { value: 'last_month', label: 'Last month' },
              { value: 'last_30', label: '30 days' },
            ]}
          />
          <Select
            value={type}
            onChange={v => { setType(v); setData(null) }}
            w={150}
            data={[
              { value: 'sales', label: 'Sales' },
              { value: 'products', label: 'Top products' },
              { value: 'expenses', label: 'Expenses' },
            ]}
          />
        </Group>

        {!data && (
          <Paper p="xl" radius="lg" withBorder>
            <Text ta="center" c="dimmed">Loading...</Text>
          </Paper>
        )}

        {/* ── SALES ── */}
        {type === 'sales' && isSalesData && (
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Grid gutter="md">
                <Grid.Col span={12}>
                  <Paper p="lg" radius="lg" withBorder>
                    <Text size="sm" c="dimmed">Total revenue</Text>
                    <Text fw={700} size="xl" mt={4}>{fmt(data.total)}</Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Paper p="lg" radius="lg" withBorder>
                    <Text size="sm" c="dimmed">Transactions</Text>
                    <Text fw={700} size="xl" mt={4}>{data.count}</Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Paper p="lg" radius="lg" withBorder>
                    <Text size="sm" c="dimmed" mb="md">By payment method</Text>
                    {Object.keys(data.byMethod || {}).length === 0
                      ? <Text size="sm" c="dimmed">No payments yet</Text>
                      : (
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              data={Object.entries(data.byMethod || {}).map(([name, value]) => ({ name, value }))}
                              cx="50%" cy="50%"
                              innerRadius={40} outerRadius={70}
                              dataKey="value"
                            >
                              {Object.keys(data.byMethod || {}).map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <ReTooltip formatter={v => fmt(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      )
                    }
                  </Paper>
                </Grid.Col>
              </Grid>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Paper p="lg" radius="lg" withBorder>
                <Text fw={600} mb="md">Daily revenue</Text>
                {(data.byDay || []).length === 0
                  ? <Text size="sm" c="dimmed">No sales data for this period</Text>
                  : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.byDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }}
                          tickFormatter={d => dayjs(d).format('D MMM')} />
                        <YAxis tick={{ fontSize: 11 }}
                          tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                        <ReTooltip formatter={v => [fmt(v), 'Revenue']} />
                        <Bar dataKey="total" fill="#1971C2" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              </Paper>
            </Grid.Col>
          </Grid>
        )}

        {/* ── TOP PRODUCTS ── */}
        {type === 'products' && isProductsData && (
          <Paper p="lg" radius="lg" withBorder>
            <Text fw={600} mb="md">Top selling products</Text>
            {data.length === 0
              ? <Text size="sm" c="dimmed">No sales recorded for this period</Text>
              : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(300, data.slice(0, 10).length * 45)}
                >
                  <BarChart data={data.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
                    <XAxis type="number" tick={{ fontSize: 11 }}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name"
                      tick={{ fontSize: 12 }} width={150} />
                    <ReTooltip formatter={v => [fmt(v), 'Revenue']} />
                    <Bar dataKey="revenue" fill="#2F9E44" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </Paper>
        )}

        {/* ── EXPENSES ── */}
        {type === 'expenses' && isExpensesData && (
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="lg" radius="lg" withBorder>
                <Text size="sm" c="dimmed">Total expenses</Text>
                <Text fw={700} size="xl" mt={4} c="red">{fmt(data.total)}</Text>
                <Stack gap={6} mt="md">
                  {(data.byCategory || []).length === 0
                    ? <Text size="sm" c="dimmed">No expenses recorded</Text>
                    : (data.byCategory || []).map((e, i) => (
                      <Group key={i} justify="space-between">
                        <Text size="sm">{e.category}</Text>
                        <Text size="sm" fw={500}>{fmt(e.total || e.amount || 0)}</Text>
                      </Group>
                    ))
                  }
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Paper p="lg" radius="lg" withBorder>
                <Text fw={600} mb="md">Expenses by category</Text>
                {(data.byCategory || []).length === 0
                  ? <Text size="sm" c="dimmed">No expenses recorded for this period</Text>
                  : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.byCategory}
                          dataKey="total"
                          nameKey="category"
                          cx="50%" cy="50%"
                          outerRadius={110}
                        >
                          {(data.byCategory || []).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <ReTooltip formatter={v => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                }
              </Paper>
            </Grid.Col>
          </Grid>
        )}
      </Stack>
    </DashboardShell>
  )
}