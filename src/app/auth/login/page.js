'use client'
import { useState } from 'react'
import { Paper, TextInput, PasswordInput, Button, Title, Text, Anchor, Stack, Alert } from '@mantine/core'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { IconBuildingStore, IconAlertCircle } from '@tabler/icons-react'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { ...form, redirect: false })
    if (res?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #E7F5FF 0%, #F8F9FA 100%)', padding: 16 }}>
      <Paper shadow="md" p="xl" w="100%" maw={420} radius="lg" withBorder>
        <Stack align="center" mb="xl">
          <div style={{ background: '#E7F5FF', borderRadius: 12, padding: 12 }}>
            <IconBuildingStore size={32} color="#1971C2" />
          </div>
          <Title order={2} ta="center">Welcome back</Title>
          <Text c="dimmed" size="sm" ta="center">Sign in to your Nexstock account</Text>
        </Stack>

        {error && (
          <Alert icon={<IconAlertCircle size={14} />} color="red" mb="md" radius="md">
            {error}
          </Alert>
        )}

        <form onSubmit={handle}>
          <Stack gap="md">
            <TextInput
              label="Email"
              type="email"
              placeholder="you@business.com"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
            <Button type="submit" fullWidth loading={loading} mt="sm">
              Sign in
            </Button>
          </Stack>
        </form>

        <Text ta="center" mt="md" size="sm">
          New business?{' '}
          <Anchor href="/auth/register" size="sm">Create account</Anchor>
        </Text>

        <Text ta="center" mt="xs" size="xs" c="dimmed">
          Demo: demo@nexstock.co.ug / password123
        </Text>
      </Paper>
    </div>
  )
}
