'use client'
import { useState } from 'react'

export default function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        })
      }}
      title="Copy"
      style={{
        background: 'none',
        border: 'none',
        padding: '0 7px',
        height: '22px',
        cursor: 'pointer',
        color: copied ? '#4a8' : '#333',
        fontSize: '13px',
        lineHeight: 1,
        outline: 'none',
        flexShrink: 0,
        fontFamily: 'inherit',
        letterSpacing: '0.04em',
        transition: 'color 0.15s',
        borderRadius: '3px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.color = '#888' }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = '#333' }}
    >
      {copied ? '✓' : '⌘'}
    </button>
  )
}
