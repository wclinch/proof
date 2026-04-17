import type { Metadata } from 'next'
import { DM_Mono } from 'next/font/google'
import { PostHogProvider } from '@/lib/posthog'
import './globals.css'

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
})

const BASE = 'https://proof-kxfz.onrender.com'

export const metadata: Metadata = {
  title: {
    default: 'Proof',
    template: '%s — Proof',
  },
  description: 'Drop in a PDF. Proof extracts every fact, statistic, and quote — and pins each one to its exact location in the source.',
  metadataBase: new URL(BASE),
  openGraph: {
    siteName: 'Proof',
    title: 'Proof — Verify faster.',
    description: 'Drop in a PDF. Proof extracts every fact, statistic, and quote — and pins each one to its exact location in the source.',
    url: BASE,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Proof — Verify faster.',
    description: 'Drop in a PDF. Proof extracts every fact, statistic, and quote — and pins each one to its exact location in the source.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmMono.className}>
      <body suppressHydrationWarning><PostHogProvider>{children}</PostHogProvider></body>
    </html>
  )
}
