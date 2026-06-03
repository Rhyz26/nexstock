'use client'
import { useEffect, useState } from 'react'
import { Stack, Group, Title, Paper, Text, Select, Grid, SegmentedControl } from '@mantine/core'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
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
    setData(null)
    const { from, to } = getPeriod()
    const res = await fetch(`/api/reports?type=${type}&from=${from}&to=${to}`)
    const result = await res.json()
    setData(result)
  }

  useEffect(() => { load() }, [type, period])

  // Sales data is an object with .total, .count, .byMethod, .byDay
  const isSalesData = data && !Array.isArray(data) && data.byDay !== undefined
  // Products data is an array
  const isProductsData = data && Array.isArray(data)
  // Expenses data is an object with .total, .byCategory
  const isExpensesData = data && !Array.isArray(data) && data.byCategory !== undefined

  return (
    <DashboardShell>
      <Stack gap="lg" p="sm">
        <Group justify="space-between" wrap="wrap">
          <Title order={3}>Reports</Title>
          <Group gap="sm">
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
        </Group>

        {!data && (
          <Paper p="xl" radius="lg" withBorder>
            <Text ta="center" c="dimmed">Loading...</Text>
          </Paper>
        )}

        {/* SALES */}
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
                            <Tooltip formatter={v => fmt(v)} />
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
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => dayjs(d).format('D MMM')} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={v => [fmt(v), 'Revenue']} />
                        <Bar dataKey="total" fill="#1971C2" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              </Paper>
            </Grid.Col>
          </Grid>
        )}

        {/* TOP PRODUCTS */}
        {type === 'products' && isProductsData && (
          <Paper p="lg" radius="lg" withBorder>
            <Text fw={600} mb="md">Top selling products</Text>
            {data.length === 0
              ? <Text size="sm" c="dimmed">No sales recorded for this period</Text>
              : (
                <ResponsiveContainer width="100%" height={Math.max(300, data.slice(0, 10).length * 45)}>
                  <BarChart data={data.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={150} />
                    <Tooltip formatter={v => [fmt(v), 'Revenue']} />
                    <Bar dataKey="revenue" fill="#2F9E44" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </Paper>
        )}

        {/* EXPENSES */}
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
                        <Text size="sm" fw={500}>{fmt(e.total)}</Text>
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
                        <Tooltip formatter={v => fmt(v)} />
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