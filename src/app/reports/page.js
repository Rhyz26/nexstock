'use client'
import { useEffect, useState } from 'react'
import { Stack, Group, Title, Paper, Text, Select, Grid, SegmentedControl } from '@mantine/core'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import DashboardShell from '@/components/layout/DashboardShell'
import dayjs from 'dayjs'

const COLORS = ['#1971C2', '#2F9E44', '#E67700', '#C92A2A', '#7950F2', '#0C8599']
const fmt = n => `UGX ${Number(n || 0).toLocaleString()}`

export default function ReportsPage() {
  const [type, setType] = useState('sales')
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('this_month')

  const getPeriod = () => {
    const now = dayjs()
    if (period === 'this_month') return { from: now.startOf('month').toISOString(), to: now.toISOString() }
    if (period === 'last_month') return { from: now.subtract(1, 'month').startOf('month').toISOString(), to: now.subtract(1, 'month').endOf('month').toISOString() }
    if (period === 'last_7') return { from: now.subtract(7, 'day').toISOString(), to: now.toISOString() }
    if (period === 'last_30') return { from: now.subtract(30, 'day').toISOString(), to: now.toISOString() }
    return { from: now.startOf('month').toISOString(), to: now.toISOString() }
  }

  const load = async () => {
    const { from, to } = getPeriod()
    const res = await fetch(`/api/reports?type=${type}&from=${from}&to=${to}`)
    setData(await res.json())
  }

  useEffect(() => { load() }, [type, period])

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <Group justify="space-between" wrap="wrap">
          <Title order={3}>Reports</Title>
          <Group gap="sm">
            <SegmentedControl size="xs"
              value={period}
              onChange={setPeriod}
              data={[
                { value: 'last_7', label: '7 days' },
                { value: 'this_month', label: 'This month' },
                { value: 'last_month', label: 'Last month' },
                { value: 'last_30', label: '30 days' },
              ]}
            />
            <Select value={type} onChange={setType} w={150}
              data={[
                { value: 'sales', label: 'Sales' },
                { value: 'products', label: 'Top products' },
                { value: 'expenses', label: 'Expenses' },
              ]}
            />
          </Group>
        </Group>

        {type === 'sales' && data && (
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Grid gutter="md">
                {[
                  { label: 'Total revenue', value: fmt(data.total) },
                  { label: 'Transactions', value: data.count },
                ].map((s, i) => (
                  <Grid.Col key={i} span={12}>
                    <Paper p="lg" radius="lg" withBorder>
                      <Text size="sm" c="dimmed">{s.label}</Text>
                      <Text fw={700} size="xl" mt={4}>{s.value}</Text>
                    </Paper>
                  </Grid.Col>
                ))}
                <Grid.Col span={12}>
                  <Paper p="lg" radius="lg" withBorder>
                    <Text size="sm" c="dimmed" mb="md">By payment method</Text>
                    <PieChart width={200} height={200}>
                      <Pie data={Object.entries(data.byMethod || {}).map(([name, value]) => ({ name, value }))}
                        cx={100} cy={100} innerRadius={50} outerRadius={80} dataKey="value">
                        {Object.keys(data.byMethod || {}).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Tooltip formatter={v => fmt(v)} />
                    </PieChart>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Paper p="lg" radius="lg" withBorder>
                <Text fw={600} mb="md">Daily revenue</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.byDay || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => dayjs(d).format('D MMM')} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={v => [fmt(v), 'Revenue']} />
                    <Bar dataKey="total" fill="#1971C2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid.Col>
          </Grid>
        )}

        {type === 'products' && data && (
          <Paper p="lg" radius="lg" withBorder>
            <Text fw={600} mb="md">Top selling products</Text>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={(data || []).slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                <Tooltip formatter={v => [fmt(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#2F9E44" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        )}

        {type === 'expenses' && data && (
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="lg" radius="lg" withBorder>
                <Text size="sm" c="dimmed">Total expenses</Text>
                <Text fw={700} size="xl" mt={4}>{fmt(data.total)}</Text>
                <Stack gap={6} mt="md">
                  {(data.byCategory || []).map((e, i) => (
                    <Group key={i} justify="space-between">
                      <Text size="sm">{e.category}</Text>
                      <Text size="sm" fw={500}>{fmt(e.total)}</Text>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Paper p="lg" radius="lg" withBorder>
                <Text fw={600} mb="md">Expenses by category</Text>
                <PieChart width={400} height={300}>
                  <Pie data={data.byCategory || []} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={110}>
                    {(data.byCategory || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip formatter={v => fmt(v)} />
                </PieChart>
              </Paper>
            </Grid.Col>
          </Grid>
        )}
      </Stack>
    </DashboardShell>
  )
}
