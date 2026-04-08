'use client'

import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="page-enter" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {children}
    </div>
  )
}
