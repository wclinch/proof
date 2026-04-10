import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Proof — Citation Generator',
  description: 'Paste a DOI or URL. Get a citation in MLA, APA, or Chicago. Free, no sign-up.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
