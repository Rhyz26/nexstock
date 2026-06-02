import { MantineProvider, ColorSchemeScript } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { Inter } from 'next/font/google'
import SessionWrapper from '@/components/layout/SessionWrapper'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = {
  title: 'Nexstock — Business Management',
  description: 'Inventory, invoicing and mobile money for Ugandan businesses',
  manifest: '/manifest.json',
  themeColor: '#1971C2',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <ColorSchemeScript />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <SessionWrapper>
          <MantineProvider
            theme={{
              primaryColor: 'blue',
              fontFamily: 'var(--font-inter)',
              defaultRadius: 'md',
              components: {
                Button: { defaultProps: { size: 'sm' } },
                TextInput: { defaultProps: { size: 'sm' } },
                Select: { defaultProps: { size: 'sm' } },
                NumberInput: { defaultProps: { size: 'sm' } },
              },
            }}
          >
            <Notifications position="top-right" />
            {children}
          </MantineProvider>
        </SessionWrapper>
      </body>
    </html>
  )
}
