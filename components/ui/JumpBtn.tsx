'use client'
import { capture } from '@/lib/posthog'

export default function JumpBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={() => { capture('src_clicked'); onClick() }}
      title="Locate in source"
      style={{
        background: 'none',
        border: '1px solid #1a1a1a',
        padding: '0 8px',
        height: '22px',
        cursor: 'pointer',
        color: '#666',
        fontSize: '10px',
        lineHeight: 1,
        outline: 'none',
        flexShrink: 0,
        fontFamily: 'inherit',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: '3px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '6px',
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#aaa' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#666' }}
    >
      source
    </button>
  )
}
