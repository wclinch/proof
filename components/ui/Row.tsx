'use client'
import CopyBtn from './CopyBtn'
import JumpBtn from './JumpBtn'

export default function Row({ value, onJump }: { value: string; onJump?: (t: string) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
        borderLeft: '2px solid #1e1e1e',
        marginBottom: '4px',
      }}
    >
      <div
        style={{
          fontSize: '13px',
          color: '#777',
          lineHeight: 1.65,
          padding: '5px 10px',
          flex: 1,
        }}
      >
        {value}
      </div>
      <CopyBtn text={value} />
      {onJump && <JumpBtn onClick={() => onJump(value)} />}
    </div>
  )
}
