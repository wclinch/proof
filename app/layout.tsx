import type { Metadata } from 'next'
import { DM_Mono } from 'next/font/google'
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
  description: 'Drop in a URL, DOI, or PDF. Proof breaks down your sources and puts the breakdown next to where you write.',
  metadataBase: new URL(BASE),
  openGraph: {
    siteName: 'Proof',
    title: 'Proof — Research, broken down.',
    description: 'Drop in a URL, DOI, or PDF. Proof breaks down your sources and puts the breakdown next to where you write.',
    url: BASE,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Proof — Research, broken down.',
    description: 'Drop in a URL, DOI, or PDF. Proof breaks down your sources and puts the breakdown next to where you write.',
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
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
