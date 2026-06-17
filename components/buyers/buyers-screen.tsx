'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
  SortIcon,
} from '@/components/ui/icons'

type Buyer = { partyId: string; name: string; number: string; loads: number; head: number }
type Props = {
  buyers: Buyer[]
  createBuyer: (input: { name: string; number: string }) => Promise<void>
}

export function BuyersScreen({ buyers, createBuyer }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortByHead, setSortByHead] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = buyers.filter(
      (b) => !q || b.name.toLowerCase().includes(q) || b.number.toLowerCase().includes(q),
    )
    return [...list].sort((a, b) => (sortByHead ? b.head - a.head : a.name.localeCompare(b.name)))
  }, [buyers, search, sortByHead])

  async function submitAdd() {
    if (!name.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await createBuyer({ name, number })
      setShowAdd(false)
      setName('')
      setNumber('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the buyer.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Top bar */}
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
        <Link href="/" aria-label="Back" className="sbv-iconbtn" style={{ color: '#FFFFFF' }}>
          <ArrowLeftIcon size={22} />
        </Link>
        <div style={{ flex: '1 1 0%', color: '#FFFFFF', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
          Buyers
        </div>
        <button
          aria-label="Add buyer"
          onClick={() => setShowAdd((s) => !s)}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F3D12A',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            color: '#0E2646',
          }}
        >
          <PlusIcon size={20} strokeWidth={2.5} />
        </button>
        <button aria-label="More" className="sbv-iconbtn" style={{ color: '#FFFFFF' }}>
          <MoreVerticalIcon size={20} />
        </button>
      </div>

      {/* Search + filter/sort */}
      <div style={{ flexShrink: 0, padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="sbv-search" style={{ height: 44 }}>
          <SearchIcon size={16} style={{ color: '#717182' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyer name or number"
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Filter — placeholder for now (needs the seller↔buyer linkage) */}
          <span style={pillStyle}>
            <FilterIcon size={15} style={{ color: '#717182' }} />
            All sellers
          </span>
          <button style={{ ...pillStyle, cursor: 'pointer' }} onClick={() => setSortByHead((s) => !s)}>
            <SortIcon size={15} style={{ color: '#717182' }} />
            {sortByHead ? 'Most head' : 'A–Z'}
          </button>
        </div>
      </div>

      {/* Add buyer form */}
      {showAdd ? (
        <div style={{ flexShrink: 0, padding: '10px 12px 0' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #D4D4D0', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Buyer name" style={inputStyle} autoFocus />
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Buyer number (optional)" style={inputStyle} />
            {error ? <p style={{ color: '#E24B4A', fontSize: 13, fontWeight: 600, margin: 0 }}>{error}</p> : null}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="sbv-gold-btn" style={{ height: 44 }} onClick={submitAdd} disabled={busy}>
                {busy ? 'Adding…' : 'Add buyer'}
              </button>
              <button
                onClick={() => {
                  setShowAdd(false)
                  setError(null)
                }}
                style={{ height: 44, padding: '0 16px', borderRadius: 999, background: '#FFFFFF', border: '1px solid #0E2646', color: '#0E2646', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* List */}
      <main className="sbv-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 12 }}>
        {visible.length === 0 ? (
          <div style={{ padding: '40px 12px', textAlign: 'center', color: '#717182' }}>
            {buyers.length === 0 ? (
              <>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>No buyers yet</p>
                <p style={{ fontSize: 14, marginTop: 6 }}>Tap the gold + to add your first buyer.</p>
              </>
            ) : (
              <p style={{ fontSize: 14 }}>No buyers match “{search}”.</p>
            )}
          </div>
        ) : (
          visible.map((b) => (
            <Link
              key={b.partyId}
              href={`/buyers/${b.partyId}`}
              className="sbv-navy-surface press-card"
              style={{ borderRadius: 13, padding: 14, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
            >
              <span style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.name}
                </span>
                <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: '#55BAAA' }}>
                  {b.number ? `Buyer #${b.number} · ` : ''}
                  {b.loads} {b.loads === 1 ? 'load' : 'loads'}
                </span>
              </span>
              <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span className="tnum" style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                  {b.head}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#8FA8CC', marginTop: 3 }}>head</span>
              </span>
              <ChevronRightIcon size={18} strokeWidth={2} style={{ color: '#8FA8CC', flexShrink: 0 }} />
            </Link>
          ))
        )}
      </main>
    </>
  )
}

const pillStyle: CSSProperties = {
  height: 38,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 14px',
  borderRadius: 999,
  background: '#FFFFFF',
  border: '1px solid #D4D4D0',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  color: '#1A1A1A',
}
const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid #D4D4D0',
  background: '#FFFFFF',
  fontFamily: 'inherit',
  fontSize: 16,
  fontWeight: 600,
  color: '#1A1A1A',
  outline: 'none',
}
