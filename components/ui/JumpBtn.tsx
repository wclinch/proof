'use client'

export default function JumpBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Locate in source"
      style={{
        background: 'none',
        border: '1px solid #1a1a1a',
        padding: '0 8px',
        height: '22px',
        cursor: 'pointer',
        color: '#444',
        fontSize: '10px',
        lineHeight: 1,
        outline: 'none',
        flexShrink: 0,
        fontFamily: 'inherit',
        letterSpacing: '0.08em',
        borderRadius: '3px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '6px',
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#777' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#444' }}
    >
      source
    </button>
  )
}
