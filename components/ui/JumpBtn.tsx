'use client'

export default function JumpBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Locate in source"
      style={{
        background: 'none',
        border: 'none',
        padding: '0 7px',
        height: '22px',
        cursor: 'pointer',
        color: '#2a2a2a',
        fontSize: '11px',
        lineHeight: 1,
        outline: 'none',
        flexShrink: 0,
        fontFamily: 'inherit',
        letterSpacing: '0.06em',
        borderRadius: '3px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#666')}
      onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
    >
      src
    </button>
  )
}
