'use client'

import { colors } from '@/components/ui/tokens'
import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { searchAnimals, type AnimalMatch } from '@/app/(office)/find/actions'

const TAG_LABEL: Record<string, string> = {
  eid: 'EID', back_tag: 'Back tag', visual_tag: 'Tag #', metal_tag: 'Metal tag',
}

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Chip({ children }: { children: ReactNode }) {
  return <span style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary, background: '#F1F2F4', border: '1px solid #E4E4DE', borderRadius: 999, padding: '3px 10px' }}>{children}</span>
}

export function FindAnimal() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<AnimalMatch[]>([])
  const [searched, setSearched] = useState(false)
  const [pending, startSearch] = useTransition()

  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) { setResults([]); setSearched(false); return }
    const t = setTimeout(() => {
      startSearch(async () => {
        const r = await searchAnimals(query)
        setResults(r); setSearched(true)
      })
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: colors.navy }}>Find animal</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: colors.textMuted }}>Search every sale day by EID, back tag, or tag number.</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 48, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 11, padding: '0 14px' }}>
        <span style={{ color: colors.textPlaceholder, fontSize: 16 }}>⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="Scan or type an EID, tag #, or back tag"
          style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: 16, fontWeight: 600, color: colors.textPrimary, outline: 'none', fontFamily: 'inherit' }}
        />
      </div>

      {q.trim().length < 2 ? (
        <p style={{ fontSize: 13, color: colors.textPlaceholder, margin: '4px 2px' }}>Type at least 2 characters. A full scanned EID lands exactly; a few digits of a tag matches partials.</p>
      ) : searched && results.length === 0 && !pending ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.navy }}>No animal found</div>
          <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Nothing matches “{q.trim()}” on any sale day.</div>
        </div>
      ) : (
        <>
          {results.length > 0 ? (
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.03em' }}>
              {results.length} {results.length === 1 ? 'match' : 'matches'}
            </div>
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map((r) => {
              const recorded: ReactNode[] = []
              if (r.color) recorded.push(<Chip key="c">{r.color}</Chip>)
              if (r.breed) recorded.push(<Chip key="b">{r.breed}</Chip>)
              if (r.age) recorded.push(<Chip key="a">{r.age}</Chip>)
              if (r.pregStatus) recorded.push(<Chip key="p">Preg: {r.pregStatus}</Chip>)
              if (r.pregTiming) recorded.push(<Chip key="pt">Bred: {r.pregTiming}</Chip>)
              if (r.fetalSex) recorded.push(<Chip key="fs">Fetal: {r.fetalSex}</Chip>)
              return (
                <div key={`${r.animalId}-${r.matchedType}-${r.matchedValue}`} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="tnum" style={{ fontSize: 16, fontWeight: 800, color: colors.navy, letterSpacing: '-0.01em' }}>{r.matchedValue}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: colors.navy, borderRadius: 999, padding: '2px 9px' }}>{TAG_LABEL[r.matchedType] ?? r.matchedType}</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>{r.saleDate ? shortDate(r.saleDate) : 'No sale day'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: colors.teal }}>{r.partyName ?? '—'}</span>
                    {r.role ? <span style={{ fontSize: 11, fontWeight: 700, color: r.role === 'buyer' ? '#946A00' : colors.navy, background: r.role === 'buyer' ? '#FBEFC2' : '#E7ECF5', border: `1px solid ${r.role === 'buyer' ? '#EBD489' : '#CBD5E8'}`, borderRadius: 999, padding: '2px 8px' }}>{r.role === 'buyer' ? `Buyer #${r.buyerNumber ?? '—'}` : 'Seller'}</span> : null}
                    <span style={{ color: '#D4D4D0' }}>·</span>
                    <span style={{ fontWeight: 600, color: colors.textMuted }}>{r.pen ? `Pen ${r.pen}` : 'No pen'}</span>
                    {r.workType ? <><span style={{ color: '#D4D4D0' }}>·</span><span style={{ fontWeight: 600, color: colors.textMuted }}>{r.workType}</span></> : null}
                  </div>
                  {recorded.length > 0 ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{recorded}</div> : null}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
