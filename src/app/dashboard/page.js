'use client'
import { useEffect, useState } from 'react'
import { Grid, Paper, Text, Title, Group, Badge, Stack, Skeleton, ThemeIcon, RingProgress } from '@mantine/core'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { IconTrendingUp, IconTrendingDown, IconPackage, IconUsers, IconFileInvoice, IconCurrencyDollar } from '@tabler/icons-react'
import DashboardShell from '@/components/layout/DashboardShell'
import dayjs from 'dayjs'

function StatCard({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <Paper p="lg" radius="lg" withBorder style={{ background: 'white' }}>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed" fw={500}>{label}</Text>
        <ThemeIcon size="lg" radius="md" color={color} variant="light">
          <Icon size={18} />
        </ThemeIcon>
      </Group>
      <Text fw={700} size="xl">{value}</Text>
      {sub && <Text size="xs" c={trend > 0 ? 'green' : trend < 0 ? 'red' : 'dimmed'} mt={4}>
        {trend > 0 ? '↑' : trend < 0 ? '↓' : ''} {sub}
      </Text>}
    </Paper>
  )
}

const fmt = (n) => `UGX ${Number(n || 0).toLocaleString()}`

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  const statusColor = { PAID: 'green', PENDING: 'yellow', PARTIAL: 'blue', OVERDUE: 'red', CANCELLED: 'gray' }

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <div>
          <Title order={3}>Dashboard</Title>
          <Text c="dimmed" size="sm">{dayjs().format('dddd, D MMMM YYYY')}</Text>
        </div>

        <Grid gutter="md">
          {[
            { label: "Today's revenue", value: loading ? '...' : fmt(data?.todayRevenue), icon: IconCurrencyDollar, color: 'blue', sub: 'Payments today' },
            { label: 'Month revenue', value: loading ? '...' : fmt(data?.monthRevenue), icon: IconTrendingUp, color: 'teal', sub: `${data?.growthRate > 0 ? '+' : ''}${data?.growthRate}% vs last month`, trend: data?.growthRate },
            { label: 'Pending invoices', value: loading ? '...' : data?.pendingInvoices, icon: IconFileInvoice, color: 'orange', sub: 'Awaiting payment' },
            { label: 'Products', value: loading ? '...' : data?.totalProducts, icon: IconPackage, color: 'grape', sub: `${data?.totalCustomers} customers` },
          ].map((s, i) => (
            <Grid.Col key={i} span={{ base: 12, xs: 6, md: 3 }}>
              {loading ? <Skeleton height={110} radius="lg" /> : <StatCard {...s} />}
            </Grid.Col>
          ))}
        </Grid>

        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="md">Revenue this month</Text>
              {loading ? <Skeleton height={200} /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data?.salesByDay || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => dayjs(d).format('D MMM')} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={v => [fmt(v), 'Revenue']} labelFormatter={l => dayjs(l).format('D MMM YYYY')} />
                    <Line type="monotone" dataKey="total" stroke="#1971C2" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" radius="lg" withBorder h="100%">
              <Text fw={600} mb="md">Profit overview</Text>
              {loading ? <Skeleton height={160} /> : (
                <Stack align="center">
                  <RingProgress
                    size={140}
                    roundCaps
                    sections={[
                      { value: data?.monthRevenue > 0 ? Math.max(0, (data.profit / data.monthRevenue) * 100) : 0, color: 'teal' },
                    ]}
                    label={<Text ta="center" size="xs" fw={600}>{data?.monthRevenue > 0 ? Math.round((data.profit / data.monthRevenue) * 100) : 0}%<br />margin</Text>}
                  />
                  <Stack gap={4} w="100%">
                    <Group justify="space-between"><Text size="sm">Revenue</Text><Text size="sm" fw={600}>{fmt(data?.monthRevenue)}</Text></Group>
                    <Group justify="space-between"><Text size="sm">Expenses</Text><Text size="sm" fw={600} c="red">{fmt(data?.monthExpenses)}</Text></Group>
                    <Group justify="space-between" style={{ borderTop: '1px solid #E9ECEF', paddingTop: 6, marginTop: 4 }}>
                      <Text size="sm" fw={600}>Profit</Text>
                      <Text size="sm" fw={700} c="teal">{fmt(data?.profit)}</Text>
                    </Group>
                  </Stack>
                </Stack>
              )}
            </Paper>
          </Grid.Col>
        </Grid>

        <Paper p="lg" radius="lg" withBorder>
          <Text fw={600} mb="md">Recent invoices</Text>
          {loading ? <Skeleton height={150} /> : (
            <table className="data-table">
              <thead>
                <tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {(data?.recentInvoices || []).map(inv => (
                  <tr key={inv.id}>
                    <td><Text size="sm" fw={500}>{inv.number}</Text></td>
                    <td><Text size="sm">{inv.customer?.name || 'Walk-in'}</Text></td>
                    <td><Text size="sm" fw={500}>{fmt(inv.total)}</Text></td>
                    <td><Badge color={statusColor[inv.status]} size="sm" variant="light">{inv.status}</Badge></td>
                    <td><Text size="sm" c="dimmed">{dayjs(inv.createdAt).format('D MMM YYYY')}</Text></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Paper>
      </Stack>
    </DashboardShell>
  )
}
