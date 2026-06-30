'use client'

// The "Assign to buyer" popover for the Animals report. Pick a buyer number
// (search the recorded ones, or free-type a new one), confirm the destination
// (pre-filled from the buyer number's usual one), set the expected head, and the
// selected animals go on that buyer's load for the day. Paperwork only — the
// writing and guardrails live in assignAnimalsToLoad.

import { useEffect, useState } from 'react'
import { colors } from '@/components/ui/tokens'
import { searchBuyerNumbers, type AssignInput, type BuyerNumberMatch } from '@/app/(app)/loads/actions'

export function AssignToBuyerPanel({
  count,
  busy,
  error,
  onApply,
  onClose,
}: {
  count: number
  busy: boolean
  error: string | null
  onApply: (input: AssignInput) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BuyerNumberMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<BuyerNumberMatch | null>(null)
  const [freeText, setFreeText] = useState('')
  const [destinationName, setDestinationName] = useState('')
  const [destinationState, setDestinationState] = useState('')
  const [expectedHead, setExpectedHead] = useState('')

  // Search the recorded buyer numbers as the office types (small debounce).
  useEffect(() => {
    const q = query.trim()
    if (q.length < 1 || picked) {
      setResults([])
      return
    }
    let alive = true
    setSearching(true)
    const t = window.setTimeout(() => {
      searchBuyerNumbers(q)
        .then((r) => {
          if (alive) setResults(r)
        })
        .finally(() => {
          if (alive) setSearching(false)
        })
    }, 250)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [query, picked])

  function pick(m: BuyerNumberMatch) {
    setPicked(m)
    setFreeText('')
    setResults([])
    setQuery(`${m.number} · ${m.partyName}`)
    setDestinationName(m.typicalDestination ?? '')
    setDestinationState(m.typicalState ?? '')
  }
  function clearPick() {
    setPicked(null)
    setQuery('')
  }

  const headNum = expectedHead.trim() === '' ? null : Number(expectedHead)
  const expectedValid = headNum === null || (Number.isFinite(headNum) && headNum >= 0)
  const canApply = (!!picked || freeText.trim().length > 0) && expectedValid && !busy
  const noun = `${count} animal${count === 1 ? '' : 's'}`

  function apply() {
    if (!canApply) return
    onApply(
      picked
        ? {
            buyerNumberId: picked.id,
            buyerNumberText: picked.number,
            buyerPartyId: picked.partyId,
            destinationName,
            destinationState,
            expectedHead: headNum,
          }
        : {
            buyerNumberId: null,
            buyerNumberText: freeText.trim(),
            buyerPartyId: null,
            destinationName,
            destinationState,
            expectedHead: headNum,
          },
    )
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} aria-hidden />
      <div
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          zIndex: 41,
          marginTop: 2,
          width: 320,
          maxHeight: 460,
          overflowY: 'auto',
          background: '#fff',
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          boxShadow: '0 12px 30px rgba(14,38,70,0.18)',
          padding: 12,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: colors.navy, marginBottom: 8 }}>Assign {noun} to a buyer</div>

        <div style={label}>Buyer number</div>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (picked) setPicked(null)
          }}
          placeholder="Search number or buyer name"
          style={input}
        />
        {picked && (
          <button type="button" onClick={clearPick} style={{ ...linkBtn, marginTop: 4 }}>
            Clear “{picked.number}”
          </button>
        )}
        {!picked && (
          <div style={{ marginTop: 4 }}>
            {searching && <div style={{ fontSize: 12, color: colors.textMuted, padding: '4px 2px' }}>Searching…</div>}
            {!searching && query.trim() && results.length === 0 && (
              <div style={{ fontSize: 12, color: colors.textMuted, padding: '4px 2px' }}>No recorded numbers — free-type one below.</div>
            )}
            {results.map((m) => (
              <button key={m.id} type="button" onClick={() => pick(m)} style={resultRow}>
                <span style={{ fontWeight: 800, color: colors.navy }}>{m.number}</span>
                <span style={{ color: colors.textMuted }}> · {m.partyName}</span>
                {(m.typicalDestination || m.typicalState) && (
                  <span style={{ color: colors.textPlaceholder }}> · {[m.typicalDestination, m.typicalState].filter(Boolean).join(', ')}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {!picked && (
          <div style={{ marginTop: 8 }}>
            <div style={label}>Or free-type a number</div>
            <input value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="e.g. 418-x" style={input} />
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <div style={label}>Destination</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={destinationName} onChange={(e) => setDestinationName(e.target.value)} placeholder="City / yard" style={{ ...input, flex: 2 }} />
            <input value={destinationState} onChange={(e) => setDestinationState(e.target.value)} placeholder="ST" style={{ ...input, flex: 1, minWidth: 0 }} />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={label}>Expected head</div>
          <input value={expectedHead} onChange={(e) => setExpectedHead(e.target.value)} inputMode="numeric" placeholder="optional" style={{ ...input, width: 120 }} />
        </div>

        {error && <div style={{ fontSize: 13, color: colors.danger, marginTop: 10 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button type="button" onClick={onClose} style={{ ...actionBtn, background: '#fff', border: `1px solid ${colors.border}`, color: colors.navy }}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={apply}
            style={{ ...actionBtn, background: canApply ? colors.gold : '#EFEFEA', border: `1px solid ${canApply ? colors.gold : colors.border}`, color: colors.navy, cursor: canApply ? 'pointer' : 'default' }}
          >
            {busy ? 'Assigning…' : `Assign ${noun}`}
          </button>
        </div>
      </div>
    </>
  )
}

const label: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, marginBottom: 6 }
const input: React.CSSProperties = { width: '100%', height: 34, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0 10px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: colors.textPrimary, outline: 'none' }
const resultRow: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: colors.teal, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, padding: 0 }
const actionBtn: React.CSSProperties = { height: 34, padding: '0 12px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 800 }
