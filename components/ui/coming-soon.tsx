/** Placeholder for routes that are linked but not built yet. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 14, color: '#717182', marginTop: 8 }}>Coming soon.</p>
    </div>
  )
}
