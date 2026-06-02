'use client'
import { useState } from 'react'
import { Paper, TextInput, PasswordInput, Button, Title, Text, Anchor, Stack, Alert } from '@mantine/core'
import { useRouter } from 'next/navigation'
import { IconBuildingStore, IconAlertCircle, IconCheck } from '@tabler/icons-react'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', businessName: '', phone: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setSuccess(true)
    setTimeout(() => router.push('/auth/login'), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #E7F5FF 0%, #F8F9FA 100%)', padding: 16 }}>
      <Paper shadow="md" p="xl" w="100%" maw={440} radius="lg" withBorder>
        <Stack align="center" mb="xl">
          <div style={{ background: '#E7F5FF', borderRadius: 12, padding: 12 }}>
            <IconBuildingStore size={32} color="#1971C2" />
          </div>
          <Title order={2}>Start for free</Title>
          <Text c="dimmed" size="sm">Set up your Nexstock account in 30 seconds</Text>
        </Stack>

        {error && <Alert icon={<IconAlertCircle size={14} />} color="red" mb="md">{error}</Alert>}
        {success && <Alert icon={<IconCheck size={14} />} color="green" mb="md">Account created! Redirecting...</Alert>}

        <form onSubmit={handle}>
          <Stack gap="md">
            <TextInput label="Business name" placeholder="Kampala General Store" required
              value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} />
            <TextInput label="Your name" placeholder="John Mukasa" required
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <TextInput label="Phone" placeholder="+256700000000"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <TextInput label="Email" type="email" placeholder="you@business.com" required
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <PasswordInput label="Password" placeholder="Min 8 characters" required
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <Button type="submit" fullWidth loading={loading} mt="sm">Create account</Button>
          </Stack>
        </form>

        <Text ta="center" mt="md" size="sm">
          Already have an account?{' '}
          <Anchor href="/auth/login" size="sm">Sign in</Anchor>
        </Text>
      </Paper>
    </div>
  )
}
