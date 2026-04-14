'use client'

export default function JumpBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Find in source"
      style={{
        background: 'none',
        border: 'none',
        padding: '0 7px',
        height: '22px',
        cursor: 'pointer',
        color: '#333',
        fontSize: '13px',
        lineHeight: 1,
        outline: 'none',
        flexShrink: 0,
        fontFamily: 'inherit',
        borderRadius: '3px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#888')}
      onMouseLeave={e => (e.currentTarget.style.color = '#333')}
    >
      ◎
    </button>
  )
}
