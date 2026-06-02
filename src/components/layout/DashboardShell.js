'use client'
import { useState } from 'react'
import { AppShell, Burger, NavLink, Text, Avatar, Menu, Badge, Stack } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import {
  IconDashboard, IconPackage, IconFileInvoice, IconUsers,
  IconChartBar, IconSettings, IconUserCircle, IconLogout,
  IconBuildingStore, IconCashBanknote,
} from '@tabler/icons-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { href: '/inventory', label: 'Inventory', icon: IconPackage },
  { href: '/invoices', label: 'Invoices', icon: IconFileInvoice },
  { href: '/customers', label: 'Customers', icon: IconUsers },
  { href: '/reports', label: 'Reports', icon: IconChartBar },
  { href: '/expenses', label: 'Expenses', icon: IconCashBanknote },
  { href: '/staff', label: 'Staff', icon: IconUserCircle },
  { href: '/settings', label: 'Settings', icon: IconSettings },
]

export default function DashboardShell({ children }) {
  const [opened, { toggle }] = useDisclosure()
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: '1px solid #E9ECEF' }}>
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        <IconBuildingStore size={24} color="#1971C2" />
        <Text fw={700} size="lg" c="blue.7">Nexstock</Text>
        <div style={{ flex: 1 }} />
        <Menu shadow="md" width={180}>
          <Menu.Target>
            <Avatar
              size={32}
              radius="xl"
              color="blue"
              style={{ cursor: 'pointer' }}
            >
              {session?.user?.name?.[0]?.toUpperCase()}
            </Avatar>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{session?.user?.name}</Menu.Label>
            <Menu.Label>{session?.user?.businessName}</Menu.Label>
            <Menu.Divider />
            <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => router.push('/settings')}>
              Settings
            </Menu.Item>
            <Menu.Item leftSection={<IconLogout size={14} />} color="red" onClick={() => signOut({ callbackUrl: '/auth/login' })}>
              Sign out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </AppShell.Header>

      <AppShell.Navbar p="xs" style={{ borderRight: '1px solid #E9ECEF', background: 'white' }}>
        <Stack gap={2}>
          {NAV.map(({ href, label, icon: Icon }) => (
            <NavLink
              key={href}
              label={label}
              leftSection={<Icon size={17} />}
              active={pathname.startsWith(href)}
              onClick={() => router.push(href)}
              style={{ borderRadius: 8 }}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main style={{ background: '#F8F9FA', minHeight: '100vh' }}>
        {children}
      </AppShell.Main>
    </AppShell>
  )
}
