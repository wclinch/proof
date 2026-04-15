'use client'
import { ReactNode } from 'react'

export default function Tag({ children, dim }: { children: ReactNode; dim?: boolean }) {
  return (
    <span
      style={{
        padding: '3px 8px',
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: '3px',
        fontSize: '11px',
        color: dim ? '#333' : '#4a4a4a',
        letterSpacing: '0.03em',
      }}
    >
      {children}
    </span>
  )
}
