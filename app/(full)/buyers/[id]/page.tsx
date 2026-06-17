import Link from 'next/link'
import { ArrowLeftIcon } from '@/components/ui/icons'

export default function BuyerDetailPage() {
  return (
    <>
      <div
        style={{
          background: '#0E2646',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '0 8px 0 4px',
          flexShrink: 0,
          borderRadius: '17px 17px 0 0',
        }}
      >
        <Link href="/buyers" aria-label="Back" className="sbv-iconbtn" style={{ color: '#FFFFFF' }}>
          <ArrowLeftIcon size={22} />
        </Link>
        <div style={{ flex: '1 1 0%', color: '#FFFFFF', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
          Buyer
        </div>
      </div>
      <main className="sbv-scroll">
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Buyer loads</h2>
          <p style={{ fontSize: 14, color: '#717182', marginTop: 8 }}>Coming soon.</p>
        </div>
      </main>
    </>
  )
}
