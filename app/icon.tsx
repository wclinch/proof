import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: '#0a0a0a',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '7px',
        fontFamily: 'monospace',
      }}
    >
      <span style={{ color: '#f0f0f0', fontSize: '26px', fontWeight: 400, lineHeight: 1 }}>
        {'{'}
      </span>
    </div>,
    { ...size }
  )
}
