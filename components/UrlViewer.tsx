'use client'

export default function UrlViewer({ url }: { url: string }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <iframe
        src={url}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          background: '#fff',
          borderRadius: '2px',
        }}
        title="source"
      />
      <div style={{
        paddingTop: '10px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '11px', color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          if the page isn&apos;t loading, the site blocks embedding.
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '11px', color: '#666', letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', flexShrink: 0, marginLeft: '12px' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#999')}
          onMouseLeave={e => (e.currentTarget.style.color = '#666')}
        >
          open in tab →
        </a>
      </div>
    </div>
  )
}
