'use client'
import { ReactNode } from 'react'

export default function Tag({ children, dim }: { children: ReactNode; dim?: boolean }) {
  return (
    <span
      style={{
        padding: '3px 9px',
        background: '#0f0f0f',
        border: '1px solid #1a1a1a',
        borderRadius: '3px',
        fontSize: '11px',
        color: '#999',
        letterSpacing: '0.03em',
      }}
    >
      {children}
    </span>
  )
}
