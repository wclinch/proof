'use client'
import JumpBtn from './JumpBtn'

export default function Row({ value, onJump }: { value: string; onJump?: (t: string) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
        borderLeft: '2px solid #1a1a1a',
        marginBottom: '6px',
      }}
    >
      <div
        style={{
          fontSize: '13px',
          color: '#999',
          lineHeight: 1.7,
          padding: '5px 12px',
          flex: 1,
        }}
      >
        {value}
      </div>
      {onJump && <JumpBtn onClick={() => onJump(value)} />}
    </div>
  )
}
