'use client'
import { useEffect, useState } from 'react'
import {
  Stack, Group, Title, Button, TextInput, Select, Paper, Badge,
  Text, Modal, NumberInput, ActionIcon, Tooltip, Textarea,
  Divider, Table, Box
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconPlus, IconSearch, IconCurrencyDollar, IconTrash,
  IconFileInvoice, IconDownload, IconPrinter, IconEye,
  IconFileTypeCsv, IconFileTypePdf
} from '@tabler/icons-react'
import DashboardShell from '@/components/layout/DashboardShell'
import dayjs from 'dayjs'

const statusColor = {
  PAID: 'green', PENDING: 'yellow', PARTIAL: 'blue',
  OVERDUE: 'red', CANCELLED: 'gray'
}
const fmt = n => `UGX ${Number(n || 0).toLocaleString()}`

// ─── CSV Export ───────────────────────────────────────────────────
function exportToCSV(invoices) {
  if (!invoices.length) {
    return null
  }

  const headers = [
    'Invoice #',
    'Customer',
    'Status',
    'Subtotal (UGX)',
    'Discount (UGX)',
    'Tax (UGX)',
    'Total (UGX)',
    'Amount Paid (UGX)',
    'Balance (UGX)',
    'Date Created',
    'Due Date',
    'Notes',
  ]

  const rows = invoices.map(inv => {
    const paid = inv.payments?.reduce((s, p) => s + p.amount, 0) || 0
    const balance = inv.total - paid
    return [
      inv.number,
      inv.customer?.name || 'Walk-in',
      inv.status,
      inv.subtotal,
      inv.discount || 0,
      inv.tax || 0,
      inv.total,
      paid,
      balance,
      dayjs(inv.createdAt).format('DD/MM/YYYY HH:mm'),
      inv.dueDate ? dayjs(inv.dueDate).format('DD/MM/YYYY') : '',
      inv.notes || '',
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        const str = String(cell)
        // Wrap in quotes if contains comma, newline or quote
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    ),
  ].join('\n')

  return csvContent
}

// ─── PDF Generator (single invoice) ──────────────────────────────
async function generateInvoicePDF(invoice, business) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const now = dayjs()

  doc.setFillColor(25, 113, 194)
  doc.rect(0, 0, pageW, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(business?.name || 'Business', 14, 18)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('INVOICE', pageW - 14, 14, { align: 'right' })
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.number, pageW - 14, 22, { align: 'right' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Printed: ${now.format('DD/MM/YYYY HH:mm:ss')}`, pageW - 14, 30, { align: 'right' })

  doc.setTextColor(80, 80, 80)
  doc.setFontSize(8.5)
  let contactY = 48
  if (business?.address) { doc.text(business.address, 14, contactY); contactY += 5 }
  if (business?.phone) { doc.text(`Tel: ${business.phone}`, 14, contactY); contactY += 5 }
  if (business?.email) { doc.text(`Email: ${business.email}`, 14, contactY); contactY += 5 }

  const metaX = pageW - 80
  let metaY = 48
  const metaRows = [
    ['Invoice #:', invoice.number],
    ['Date:', dayjs(invoice.createdAt).format('DD MMM YYYY')],
    ['Status:', invoice.status],
  ]
  if (invoice.dueDate) metaRows.push(['Due date:', dayjs(invoice.dueDate).format('DD MMM YYYY')])

  metaRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text(label, metaX, metaY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(value, metaX + 28, metaY)
    metaY += 6
  })

  const billToY = Math.max(contactY, metaY) + 8
  doc.setFillColor(245, 245, 245)
  doc.rect(14, billToY - 4, pageW - 28, 24, 'F')
  doc.setTextColor(25, 113, 194)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO', 18, billToY + 2)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(invoice.customer?.name || 'Walk-in Customer', 18, billToY + 8)
  if (invoice.customer?.phone) doc.text(`Phone: ${invoice.customer.phone}`, 18, billToY + 14)

  const tableY = billToY + 30
  doc.autoTable({
    startY: tableY,
    head: [['#', 'Item', 'Qty', 'Unit Price', 'Total']],
    body: (invoice.items || []).map((item, i) => [
      i + 1, item.name, item.quantity, fmt(item.price), fmt(item.total),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [25, 113, 194], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { left: 14, right: 14 },
  })

  const finalY = doc.lastAutoTable.finalY + 6
  const totalsX = pageW - 80
  let tY = finalY

  const totalsRows = [['Subtotal', fmt(invoice.subtotal)]]
  if (invoice.discount > 0) totalsRows.push(['Discount', `- ${fmt(invoice.discount)}`])
  if (invoice.tax > 0) totalsRows.push(['Tax', fmt(invoice.tax)])

  doc.setFontSize(9)
  totalsRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(label, totalsX, tY)
    doc.text(value, pageW - 14, tY, { align: 'right' })
    tY += 6
  })

  doc.setFillColor(25, 113, 194)
  doc.rect(totalsX - 4, tY - 2, pageW - totalsX - 10, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL', totalsX, tY + 4)
  doc.text(fmt(invoice.total), pageW - 14, tY + 4, { align: 'right' })
  tY += 12

  if (invoice.payments?.length > 0) {
    const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0)
    const balance = invoice.total - totalPaid
    doc.setFontSize(9)
    tY += 4
    invoice.payments.forEach(p => {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(`Payment (${p.method.replace(/_/g, ' ')})`, totalsX, tY)
      doc.setTextColor(47, 158, 68)
      doc.text(`- ${fmt(p.amount)}`, pageW - 14, tY, { align: 'right' })
      doc.setTextColor(80, 80, 80)
      tY += 6
    })
    if (balance > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(201, 42, 42)
      doc.text('Balance due', totalsX, tY)
      doc.text(fmt(balance), pageW - 14, tY, { align: 'right' })
    }
  }

  if (invoice.notes) {
    const notesY = tY + 16
    doc.setTextColor(80, 80, 80)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Notes:', 14, notesY)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.notes, 14, notesY + 6)
  }

  const footerY = doc.internal.pageSize.getHeight() - 14
  doc.setDrawColor(200, 200, 200)
  doc.line(14, footerY - 4, pageW - 14, footerY - 4)
  doc.setFontSize(7.5)
  doc.setTextColor(150, 150, 150)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${business?.name || ''} · ${business?.phone || ''} · ${business?.email || ''}`,
    pageW / 2, footerY, { align: 'center' }
  )
  doc.text(
    `Generated by Nexstock · ${now.format('DD/MM/YYYY HH:mm:ss')}`,
    pageW / 2, footerY + 5, { align: 'center' }
  )

  return doc
}

// ─── All Invoices PDF ─────────────────────────────────────────────
async function generateAllInvoicesPDF(invoices, business, statusFilter) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const now = dayjs()

  // Header
  doc.setFillColor(25, 113, 194)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(business?.name || 'Business', 14, 12)
  doc.setFontSize(11)
  doc.text('INVOICES REPORT', 14, 21)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Generated: ${now.format('DD/MM/YYYY HH:mm:ss')}`, pageW - 14, 10, { align: 'right' })
  if (statusFilter) doc.text(`Filter: ${statusFilter}`, pageW - 14, 17, { align: 'right' })
  doc.text(`Total invoices: ${invoices.length}`, pageW - 14, 24, { align: 'right' })

  // Summary row
  const totalRevenue = invoices.reduce((s, inv) => s + inv.total, 0)
  const totalPaidAll = invoices.reduce((s, inv) => {
    return s + (inv.payments?.reduce((ps, p) => ps + p.amount, 0) || 0)
  }, 0)
  const totalBalance = totalRevenue - totalPaidAll

  doc.setFillColor(235, 245, 255)
  doc.rect(14, 32, pageW - 28, 12, 'F')
  doc.setTextColor(25, 113, 194)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(`Total invoiced: ${fmt(totalRevenue)}`, 18, 39)
  doc.text(`Total paid: ${fmt(totalPaidAll)}`, 80, 39)
  doc.text(`Total balance: ${fmt(totalBalance)}`, 150, 39)

  // Table
  const tableRows = invoices.map(inv => {
    const paid = inv.payments?.reduce((s, p) => s + p.amount, 0) || 0
    return [
      inv.number,
      inv.customer?.name || 'Walk-in',
      inv.status,
      fmt(inv.subtotal),
      inv.discount > 0 ? fmt(inv.discount) : '—',
      fmt(inv.total),
      fmt(paid),
      fmt(inv.total - paid),
      dayjs(inv.createdAt).format('DD/MM/YYYY'),
      inv.dueDate ? dayjs(inv.dueDate).format('DD/MM/YYYY') : '—',
    ]
  })

  doc.autoTable({
    startY: 48,
    head: [[
      'Invoice #', 'Customer', 'Status',
      'Subtotal', 'Discount', 'Total',
      'Paid', 'Balance', 'Date', 'Due date'
    ]],
    body: tableRows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [25, 113, 194], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 38 },
      2: { cellWidth: 20 },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
      7: { cellWidth: 28, halign: 'right' },
      8: { cellWidth: 24 },
      9: { cellWidth: 24 },
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
      `${business?.name || 'Nexstock'} · Invoices Report · ${now.format('DD/MM/YYYY HH:mm')}`,
      pageW / 2, footerY, { align: 'center' }
    )
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, footerY, { align: 'right' })
  }

  return doc
}

// ─── Invoice Detail Component ─────────────────────────────────────
function InvoiceDetail({ invoice, business }) {
  const [downloading, setDownloading] = useState(false)
  const [printing, setPrinting] = useState(false)

  if (!invoice) return null

  const totalPaid = invoice.payments?.reduce((s, p) => s + p.amount, 0) || 0
  const balance = invoice.total - totalPaid

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const doc = await generateInvoicePDF(invoice, business)
      doc.save(`${invoice.number}.pdf`)
      notifications.show({ color: 'green', message: `${invoice.number}.pdf downloaded` })
    } catch (e) {
      notifications.show({ color: 'red', message: 'Failed to generate PDF' })
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const doc = await generateInvoicePDF(invoice, business)
      doc.autoPrint()
      const blob = doc.output('bloburl')
      window.open(blob, '_blank')
    } catch (e) {
      notifications.show({ color: 'red', message: 'Failed to open print dialog' })
    } finally {
      setPrinting(false)
    }
  }

  return (
    <Stack gap="md">
      <Group justify="flex-end" gap="sm">
        <Button
          variant="light"
          leftSection={<IconPrinter size={15} />}
          onClick={handlePrint}
          loading={printing}
          loaderProps={{ type: 'dots' }}
          size="sm"
        >
          {printing ? 'Opening...' : 'Print'}
        </Button>
        <Button
          leftSection={<IconDownload size={15} />}
          onClick={handleDownload}
          loading={downloading}
          loaderProps={{ type: 'dots' }}
          size="sm"
        >
          {downloading ? 'Generating...' : 'Download PDF'}
        </Button>
      </Group>

      <Box style={{ border: '1px solid #E9ECEF', borderRadius: 12, overflow: 'hidden' }}>
        <Box bg="blue.7" p="lg">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text c="white" fw={700} size="xl">{business?.name || 'Business'}</Text>
              {business?.address && <Text c="blue.2" size="xs" mt={2}>{business.address}</Text>}
              {business?.phone && <Text c="blue.2" size="xs">{business.phone}</Text>}
              {business?.email && <Text c="blue.2" size="xs">{business.email}</Text>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text c="blue.2" size="xs" fw={500}>INVOICE</Text>
              <Text c="white" fw={700} size="lg">{invoice.number}</Text>
              <Badge color={statusColor[invoice.status]} variant="filled" mt={4}>
                {invoice.status}
              </Badge>
            </div>
          </Group>
        </Box>

        <Box p="lg">
          <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
            <Box p="sm" style={{ background: '#F8F9FA', borderRadius: 8, minWidth: 160 }}>
              <Text size="xs" c="dimmed" fw={500}>BILL TO</Text>
              <Text size="sm" fw={600} mt={2}>
                {invoice.customer?.name || 'Walk-in Customer'}
              </Text>
              {invoice.customer?.phone && (
                <Text size="xs" c="dimmed">{invoice.customer.phone}</Text>
              )}
            </Box>
            <Group gap="xl">
              <div>
                <Text size="xs" c="dimmed">Date</Text>
                <Text size="sm" fw={500}>{dayjs(invoice.createdAt).format('DD MMM YYYY')}</Text>
              </div>
              {invoice.dueDate && (
                <div>
                  <Text size="xs" c="dimmed">Due date</Text>
                  <Text size="sm" fw={500}>{dayjs(invoice.dueDate).format('DD MMM YYYY')}</Text>
                </div>
              )}
              <div>
                <Text size="xs" c="dimmed">Viewed</Text>
                <Text size="sm" fw={500}>{dayjs().format('DD MMM YYYY HH:mm')}</Text>
              </div>
            </Group>
          </Group>

          <Divider mb="md" />

          <Table striped withTableBorder withColumnBorders fz="sm"
            styles={{ thead: { background: '#F1F3F5' } }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={30} ta="center">#</Table.Th>
                <Table.Th>Item</Table.Th>
                <Table.Th w={60} ta="center">Qty</Table.Th>
                <Table.Th w={120} ta="right">Unit price</Table.Th>
                <Table.Th w={120} ta="right">Total</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(invoice.items || []).map((item, i) => (
                <Table.Tr key={item.id || i}>
                  <Table.Td ta="center" c="dimmed">{i + 1}</Table.Td>
                  <Table.Td fw={500}>{item.name}</Table.Td>
                  <Table.Td ta="center">{item.quantity}</Table.Td>
                  <Table.Td ta="right">{fmt(item.price)}</Table.Td>
                  <Table.Td ta="right" fw={500}>{fmt(item.total)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Group justify="flex-end" mt="md">
            <Stack gap={4} w={260}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Subtotal</Text>
                <Text size="sm">{fmt(invoice.subtotal)}</Text>
              </Group>
              {invoice.discount > 0 && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Discount</Text>
                  <Text size="sm" c="red">- {fmt(invoice.discount)}</Text>
                </Group>
              )}
              {invoice.tax > 0 && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Tax</Text>
                  <Text size="sm">{fmt(invoice.tax)}</Text>
                </Group>
              )}
              <Divider />
              <Group justify="space-between">
                <Text fw={700}>Total</Text>
                <Text fw={700} c="blue" size="lg">{fmt(invoice.total)}</Text>
              </Group>
              {(invoice.payments || []).map((p, i) => (
                <Group key={i} justify="space-between">
                  <Text size="sm" c="dimmed">Paid ({p.method.replace(/_/g, ' ')})</Text>
                  <Text size="sm" c="teal">- {fmt(p.amount)}</Text>
                </Group>
              ))}
              {balance > 0 && (
                <>
                  <Divider />
                  <Group justify="space-between">
                    <Text fw={600} c="red">Balance due</Text>
                    <Text fw={600} c="red">{fmt(balance)}</Text>
                  </Group>
                </>
              )}
              {balance <= 0 && totalPaid > 0 && (
                <Box p="xs" ta="center" style={{
                  background: '#EBFBEE', borderRadius: 8, border: '1px solid #B2F2BB'
                }}>
                  <Text size="sm" c="green" fw={600}>✓ Fully paid</Text>
                </Box>
              )}
            </Stack>
          </Group>

          {invoice.notes && (
            <>
              <Divider mt="md" mb="sm" />
              <Text size="xs" c="dimmed" fw={600}>NOTES</Text>
              <Text size="sm" c="dimmed" mt={4}>{invoice.notes}</Text>
            </>
          )}

          <Divider mt="lg" mb="sm" />
          <Text size="xs" c="dimmed" ta="center">
            Generated by Nexstock · {dayjs().format('DD MMM YYYY [at] HH:mm:ss')}
          </Text>
        </Box>
      </Box>
    </Stack>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [business, setBusiness] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [paying, setPaying] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [selectedInv, setSelectedInv] = useState(null)
  const [viewInv, setViewInv] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', method: 'CASH', reference: '' })
  const [form, setForm] = useState({
    customerId: '', discount: 0, notes: '', dueDate: '', items: []
  })
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure()
  const [payOpened, { open: openPay, close: closePay }] = useDisclosure()
  const [viewOpened, { open: openView, close: closeView }] = useDisclosure()

  const load = async () => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (statusFilter) p.set('status', statusFilter)
    const [inv, prod, cust, biz] = await Promise.all([
      fetch(`/api/invoices?${p}`).then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ])
    setInvoices(Array.isArray(inv) ? inv : [])
    setProducts(Array.isArray(prod) ? prod : [])
    setCustomers(Array.isArray(cust) ? cust : [])
    setBusiness(biz)
  }

  useEffect(() => { load() }, [search, statusFilter])

  // ── Export all invoices to CSV
  const handleExportCSV = () => {
    if (!invoices.length) {
      notifications.show({ color: 'orange', message: 'No invoices to export' })
      return
    }
    setExportingCsv(true)
    try {
      const csv = exportToCSV(invoices)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const filename = `nexstock-invoices-${dayjs().format('YYYY-MM-DD')}.csv`
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

  // ── Export all invoices to PDF
  const handleExportPDF = async () => {
    if (!invoices.length) {
      notifications.show({ color: 'orange', message: 'No invoices to export' })
      return
    }
    setExportingPdf(true)
    try {
      const doc = await generateAllInvoicesPDF(invoices, business, statusFilter)
      const filename = `nexstock-invoices-${dayjs().format('YYYY-MM-DD')}.pdf`
      doc.save(filename)
      notifications.show({ color: 'green', message: `${filename} downloaded` })
    } catch (e) {
      notifications.show({ color: 'red', message: 'Failed to export PDF' })
    } finally {
      setExportingPdf(false)
    }
  }

  const openInvoiceDetail = async (inv) => {
    const res = await fetch(`/api/invoices/${inv.id}`)
    const full = await res.json()
    setViewInv(full)
    openView()
  }

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
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Title order={3}>Invoices</Title>
          <Group gap="sm">
            {/* Export buttons */}
            <Tooltip label="Export all invoices to CSV">
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
            <Tooltip label="Export all invoices to PDF">
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
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setForm({ customerId: '', discount: 0, notes: '', dueDate: '', items: [] })
                openCreate()
              }}
            >
              New invoice
            </Button>
          </Group>
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

        {/* Summary counts */}
        {invoices.length > 0 && (
          <Group gap="sm" wrap="wrap">
            {['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'].map(s => {
              const count = invoices.filter(i => i.status === s).length
              if (!count) return null
              return (
                <Badge
                  key={s}
                  color={statusColor[s]}
                  variant="light"
                  size="md"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                >
                  {s}: {count}
                </Badge>
              )
            })}
            <Text size="xs" c="dimmed" style={{ alignSelf: 'center' }}>
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} shown
              {statusFilter && ` (filtered: ${statusFilter})`}
            </Text>
          </Group>
        )}

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
                  <td>
                    <Text
                      size="sm" fw={600} c="blue"
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => openInvoiceDetail(inv)}
                    >
                      {inv.number}
                    </Text>
                  </td>
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
                      <Tooltip label="View invoice">
                        <ActionIcon variant="subtle" color="blue"
                          onClick={() => openInvoiceDetail(inv)}>
                          <IconEye size={15} />
                        </ActionIcon>
                      </Tooltip>
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                        <Tooltip label="Record payment">
                          <ActionIcon
                            variant="subtle" color="green"
                            onClick={() => {
                              setSelectedInv(inv)
                              setPayForm({
                                amount: inv.total - paid(inv),
                                method: 'CASH', reference: ''
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

      {/* ── View Invoice Modal ── */}
      <Modal
        opened={viewOpened}
        onClose={closeView}
        title={`Invoice ${viewInv?.number || ''}`}
        size="lg"
        scrollAreaComponent={Modal.NativeScrollArea}
      >
        <InvoiceDetail invoice={viewInv} business={business} />
      </Modal>

      {/* ── Create Invoice Modal ── */}
      <Modal opened={createOpened} onClose={closeCreate} title="New invoice" size="lg">
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
                placeholder="Product" style={{ flex: 2 }} clearable
                data={products.map(p => ({ value: p.id, label: p.name }))}
                value={item.productId}
                onChange={v => updateItem(i, 'productId', v)}
              />
              <TextInput
                placeholder="Item name" style={{ flex: 2 }}
                value={item.name}
                onChange={e => updateItem(i, 'name', e.target.value)}
              />
              <NumberInput
                placeholder="Qty" w={70} min={1}
                value={item.quantity}
                onChange={v => updateItem(i, 'quantity', v)}
              />
              <NumberInput
                placeholder="Price" w={120}
                value={item.price}
                onChange={v => updateItem(i, 'price', v)}
                thousandSeparator=","
              />
              <ActionIcon color="red" variant="subtle" onClick={() => removeItem(i)}>
                <IconTrash size={15} />
              </ActionIcon>
            </Group>
          ))}
          <Button variant="subtle" leftSection={<IconPlus size={14} />} onClick={addItem}>
            Add item
          </Button>
          <Divider />
          <Group grow>
            <NumberInput label="Discount (UGX)" value={form.discount}
              onChange={v => setForm(f => ({ ...f, discount: v }))} min={0} thousandSeparator="," />
            <TextInput label="Due date" type="date" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </Group>
          <Textarea label="Notes" rows={2} value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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
          <Button onClick={createInvoice} fullWidth loading={creating} loaderProps={{ type: 'dots' }}>
            {creating ? 'Creating invoice...' : 'Create invoice'}
          </Button>
        </Stack>
      </Modal>

      {/* ── Record Payment Modal ── */}
      <Modal
        opened={payOpened} onClose={closePay}
        title={`Record payment — ${selectedInv?.number}`} size="sm"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Outstanding: {fmt(selectedInv ? selectedInv.total - paid(selectedInv) : 0)}
          </Text>
          <NumberInput label="Amount (UGX)" required value={payForm.amount}
            onChange={v => setPayForm(f => ({ ...f, amount: v }))} thousandSeparator="," min={0} />
          <Select
            label="Payment method" required value={payForm.method}
            onChange={v => setPayForm(f => ({ ...f, method: v }))}
            data={[
              { value: 'CASH', label: 'Cash' },
              { value: 'MTN_MOMO', label: 'MTN Mobile Money' },
              { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
          <TextInput label="Reference (optional)" placeholder="Transaction ID"
            value={payForm.reference || ''}
            onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} />
          <Button onClick={recordPayment} color="green" fullWidth
            loading={paying} loaderProps={{ type: 'dots' }}>
            {paying ? 'Recording payment...' : 'Record payment'}
          </Button>
        </Stack>
      </Modal>
    </DashboardShell>
  )
}