'use client'

import { useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, ChevronDownIcon, FlagIcon, PlusIcon } from '@/components/ui/icons'

type AnimalType = { id: string; name: string }

type Props = {
  animalTypes: AnimalType[]
  hasSaleDay: boolean
  existingOfficialIds: string[]
  createPen: (input: {
    pen: string
    expected: number | null
    sellerName: string
    animalTypeId: string | null
  }) => Promise<{ lotId: string }>
  saveAnimal: (input: {
    lotId: string
    officialId: string
    secondaryEid: string
    backTag: string
    tagColor: string | null
    pregStatus: 'bred' | 'open' | null
    pregTiming: string | null
    quickNotes: string[]
  }) => Promise<{ count: number }>
}

const TAG_COLORS: { label: string; swatch: string; swatchBorder: string }[] = [
  { label: 'White', swatch: '#FFFFFF', swatchBorder: '1.5px solid #C9C9C4' },
  { label: 'Yellow', swatch: '#F3D12A', swatchBorder: '1px solid rgba(0,0,0,0.12)' },
  { label: 'Green', swatch: '#3FA66A', swatchBorder: '1px solid rgba(0,0,0,0.12)' },
  { label: 'Orange', swatch: '#E8853B', swatchBorder: '1px solid rgba(0,0,0,0.12)' },
  { label: 'Red', swatch: '#E24B4A', swatchBorder: '1px solid rgba(0,0,0,0.12)' },
  { label: 'Blue', swatch: '#3B82C4', swatchBorder: '1px solid rgba(0,0,0,0.12)' },
]
const PREG_TIMINGS = ['2 mo', '3 mo', '4 mo', '5 mo', '6 mo', '7 mo', '8 mo']
const QUICK_NOTES: { label: string; flag: boolean }[] = [
  { label: 'Horns', flag: false },
  { label: 'Lame', flag: true },
  { label: 'Lump jaw', flag: true },
  { label: 'Thin', flag: false },
  { label: 'Wild', flag: true },
]

const cardHeader = (title: string) => (
  <div style={{ background: '#EEF1F6', padding: '7px 12px 8px', borderBottom: '1px solid #DEE3EC' }}>
    <div style={{ fontSize: 14, fontWeight: 700, color: '#0E2646', letterSpacing: '-0.01em' }}>{title}</div>
    <div style={{ width: 26, height: 3, borderRadius: 2, background: '#F3D12A', marginTop: 4 }} />
  </div>
)
const cardStyle: CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #D4D4D0',
  borderRadius: 12,
  overflow: 'hidden',
}
function chipStyle(selected: boolean, height = 38): CSSProperties {
  return {
    height,
    padding: '0 13px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    background: selected ? '#0E2646' : '#FFFFFF',
    color: selected ? '#FFFFFF' : '#1A1A1A',
    border: `1px solid ${selected ? '#0E2646' : '#D4D4D0'}`,
    fontVariantNumeric: 'tabular-nums',
  }
}
const batchField: CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10,
  padding: '7px 12px',
}
const batchLabel: CSSProperties = { fontSize: 11, fontWeight: 600, color: '#55BAAA' }
const batchValue: CSSProperties = { fontSize: 16, fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }

export function CaptureScreen({ animalTypes, hasSaleDay, existingOfficialIds, createPen, saveAnimal }: Props) {
  const [mode, setMode] = useState<'setup' | 'capture'>('setup')
  const [lotId, setLotId] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  // sticky batch (carries across animals)
  const [pen, setPen] = useState('')
  const [expected, setExpected] = useState('')
  const [seller, setSeller] = useState('')
  const [animalTypeId, setAnimalTypeId] = useState(animalTypes[0]?.id ?? '')

  // fresh per-animal fields
  const [officialId, setOfficialId] = useState('')
  const [officialFocused, setOfficialFocused] = useState(false)
  const [secondaryEid, setSecondaryEid] = useState('')
  const [backTag, setBackTag] = useState('')
  const [tagColor, setTagColor] = useState<string | null>(null)
  const [pregStatus, setPregStatus] = useState<'bred' | 'open' | null>(null)
  const [pregTiming, setPregTiming] = useState<string | null>(null)
  const [quickNotes, setQuickNotes] = useState<string[]>([])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const seenIds = useRef(new Set(existingOfficialIds))
  const officialRef = useRef<HTMLInputElement>(null)

  const animalTypeName = animalTypes.find((t) => t.id === animalTypeId)?.name ?? ''
  const expectedNum = expected.trim() ? Number.parseInt(expected, 10) : null
  const trimmedOfficial = officialId.trim()
  const isDuplicate = trimmedOfficial !== '' && seenIds.current.has(trimmedOfficial)
  const overCount = expectedNum != null && count >= expectedNum

  function resetFresh() {
    setOfficialId('')
    setSecondaryEid('')
    setBackTag('')
    setTagColor(null)
    setPregStatus(null)
    setPregTiming(null)
    setQuickNotes([])
  }
  const focusOfficial = () => requestAnimationFrame(() => officialRef.current?.focus())

  async function startPen() {
    setBusy(true)
    setError(null)
    try {
      const { lotId } = await createPen({
        pen,
        expected: expectedNum,
        sellerName: seller,
        animalTypeId: animalTypeId || null,
      })
      setLotId(lotId)
      setCount(0)
      resetFresh()
      setMode('capture')
      focusOfficial()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the pen.')
    } finally {
      setBusy(false)
    }
  }

  async function saveAndNext() {
    if (!lotId || busy) return
    setBusy(true)
    setError(null)
    try {
      const { count: newCount } = await saveAnimal({
        lotId,
        officialId,
        secondaryEid,
        backTag,
        tagColor,
        pregStatus,
        pregTiming,
        quickNotes,
      })
      if (trimmedOfficial) seenIds.current.add(trimmedOfficial)
      setCount(newCount)
      resetFresh()
      focusOfficial()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the animal.')
    } finally {
      setBusy(false)
    }
  }

  function nextPen() {
    // Pen + expected are pen-specific; seller + animal type stay sticky.
    setMode('setup')
    setLotId(null)
    setCount(0)
    setPen('')
    setExpected('')
    resetFresh()
  }

  function toggleNote(label: string) {
    setQuickNotes((n) => (n.includes(label) ? n.filter((x) => x !== label) : [...n, label]))
  }
  function addCustomNote() {
    const t = window.prompt('Add a quick note')?.trim()
    if (t) setQuickNotes((n) => (n.includes(t) ? n : [...n, t]))
  }

  // ---------------- SETUP MODE ----------------
  if (mode === 'setup') {
    return (
      <>
        <div
          style={{
            background: '#0E2646',
            minHeight: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px 6px 4px',
            flexShrink: 0,
            borderRadius: '17px 17px 0 0',
          }}
        >
          <Link href="/" aria-label="Back" className="sbv-iconbtn" style={{ color: '#FFFFFF' }}>
            <ArrowLeftIcon size={22} />
          </Link>
          <div style={{ flex: '1 1 0%', minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.01em' }}>New pen</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#55BAAA' }}>Set up the sticky batch</div>
          </div>
        </div>

        <main className="sbv-scroll" style={{ padding: '14px 12px' }}>
          {!hasSaleDay ? (
            <div style={{ padding: '32px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#717182', lineHeight: 1.4 }}>
                There&apos;s no sale day to work yet. Create one on the home screen first.
              </p>
              <Link href="/" className="sbv-gold-btn" style={{ maxWidth: 240, margin: '16px auto 0' }}>
                Go to home
              </Link>
            </div>
          ) : (
            <div style={cardStyle}>
              {cardHeader('New pen')}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SetupField label="Pen">
                  <input
                    value={pen}
                    onChange={(e) => setPen(e.target.value)}
                    inputMode="numeric"
                    placeholder="e.g. 4"
                    style={setupInput}
                  />
                </SetupField>
                <SetupField label="Expected">
                  <input
                    value={expected}
                    onChange={(e) => setExpected(e.target.value.replace(/[^0-9]/g, ''))}
                    inputMode="numeric"
                    placeholder="head count"
                    style={setupInput}
                  />
                </SetupField>
                <SetupField label="Seller">
                  <input
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                    placeholder="consignor name"
                    style={setupInput}
                  />
                </SetupField>
                <SetupField label="Animal type">
                  <select value={animalTypeId} onChange={(e) => setAnimalTypeId(e.target.value)} style={setupInput}>
                    {animalTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </SetupField>
              </div>
            </div>
          )}
          {error ? <p style={errorLine}>{error}</p> : null}
        </main>

        {hasSaleDay ? (
          <div style={{ flexShrink: 0, padding: '12px 12px 20px' }}>
            <button className="sbv-gold-btn" onClick={startPen} disabled={busy}>
              {busy ? 'Starting…' : 'Start pen'}
            </button>
          </div>
        ) : null}
      </>
    )
  }

  // ---------------- CAPTURE MODE ----------------
  const subtitle = [pen ? `Pen ${pen}` : null, seller || null, animalTypeName || null].filter(Boolean).join(' · ')

  return (
    <>
      {/* Top bar */}
      <div
        style={{
          background: '#0E2646',
          minHeight: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 12px 6px 4px',
          flexShrink: 0,
          borderRadius: '17px 17px 0 0',
        }}
      >
        <Link href="/" aria-label="Back" className="sbv-iconbtn" style={{ color: '#FFFFFF' }}>
          <ArrowLeftIcon size={22} />
        </Link>
        <div style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.01em' }}>Capture</div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#55BAAA',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle || 'Pen'}
          </div>
        </div>
        <span
          className="tnum"
          style={{
            height: 34,
            minWidth: 44,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F3D12A',
            color: '#0E2646',
            borderRadius: 999,
            padding: '0 16px',
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {expectedNum != null ? `${count} of ${expectedNum}` : count}
        </span>
      </div>

      {/* Duplicate-tag soft flag — warns, never blocks */}
      {isDuplicate ? (
        <div
          style={{
            background: '#E24B4A',
            color: '#FFFFFF',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <FlagIcon size={26} strokeWidth={2} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>Duplicate tag</div>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.95 }}>
              {trimmedOfficial} already worked this sale day
            </div>
          </div>
        </div>
      ) : null}

      {/* Sticky batch header */}
      <div style={{ flexShrink: 0, padding: '12px 12px 0' }}>
        <div className="sbv-navy-surface" style={{ borderRadius: 12, padding: '11px 12px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: '#8FA8CC' }}>STICKY BATCH</div>
            <button
              onClick={nextPen}
              style={{
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '0 11px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.22)',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 700,
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              Next pen
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={batchField}>
              <div style={batchLabel}>Pen</div>
              <div style={batchValue}>{pen || '—'}</div>
            </div>
            <div style={batchField}>
              <div style={batchLabel}>Expected</div>
              <div style={batchValue}>{expectedNum ?? '—'}</div>
            </div>
            <button onClick={nextPen} style={{ ...batchField, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ flex: '1 1 0%', minWidth: 0 }}>
                <span style={{ display: 'block', ...batchLabel }}>Seller</span>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {seller || '—'}
                </span>
              </span>
              <ChevronDownIcon size={15} style={{ color: '#8FA8CC', flexShrink: 0 }} />
            </button>
            <button onClick={nextPen} style={{ ...batchField, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ flex: '1 1 0%', minWidth: 0 }}>
                <span style={{ display: 'block', ...batchLabel }}>Animal type</span>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {animalTypeName || '—'}
                </span>
              </span>
              <ChevronDownIcon size={15} style={{ color: '#8FA8CC', flexShrink: 0 }} />
            </button>
          </div>
          {overCount ? (
            <div style={{ marginTop: 9, fontSize: 12, fontWeight: 600, color: '#F3D12A' }}>
              You&apos;re at {count} of {expectedNum} — recount or tap Next pen.
            </div>
          ) : null}
        </div>
      </div>

      {/* Scrolling form */}
      <main className="sbv-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 12px 0' }}>
        {/* Identity */}
        <div style={cardStyle}>
          {cardHeader('Identity')}
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 85, flexShrink: 0, fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>Official ID</div>
              <div
                style={{
                  flex: '1 1 0%',
                  minWidth: 0,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 14px',
                  borderRadius: 10,
                  background: isDuplicate ? '#FCEBEB' : officialFocused ? '#E1F5EE' : '#FFFFFF',
                  border: `1px solid ${isDuplicate ? '#E24B4A' : officialFocused ? '#55BAAA' : '#D4D4D0'}`,
                }}
              >
                <input
                  ref={officialRef}
                  value={officialId}
                  onChange={(e) => setOfficialId(e.target.value)}
                  onFocus={() => setOfficialFocused(true)}
                  onBlur={() => setOfficialFocused(false)}
                  placeholder="Scan or tap to enter"
                  inputMode="numeric"
                  style={{
                    flex: '1 1 0%',
                    minWidth: 0,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontFamily: 'inherit',
                    fontSize: 16,
                    fontWeight: 600,
                    color: isDuplicate ? '#E24B4A' : '#1A1A1A',
                  }}
                />
                {isDuplicate ? (
                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#E24B4A' }}>
                    DUPLICATE
                  </span>
                ) : officialFocused ? (
                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#2E9486', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: '#55BAAA' }} />
                    SCANNING
                  </span>
                ) : null}
              </div>
            </div>

            <IdentityRow label="Secondary EID">
              <input value={secondaryEid} onChange={(e) => setSecondaryEid(e.target.value)} placeholder="Optional · 900-series" inputMode="numeric" style={identityInput} />
            </IdentityRow>
            <IdentityRow label="Back tag">
              <input value={backTag} onChange={(e) => setBackTag(e.target.value)} placeholder="Optional · barcode" style={identityInput} />
            </IdentityRow>
          </div>
        </div>

        {/* Attributes */}
        <div style={cardStyle}>
          {cardHeader('Attributes')}
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Age — tag color */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Age — tag color</div>
                <div style={{ flex: '1 1 0%' }} />
                <span style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 999, background: '#F3F3F5', border: '1px solid #D4D4D0', fontSize: 13, fontWeight: 600, color: '#717182' }}>
                  Age <span style={{ color: '#C2C2CA' }}>·</span> <span style={{ color: '#9A9AA6' }}>—</span>
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TAG_COLORS.map((c) => {
                  const selected = tagColor === c.label
                  return (
                    <button
                      key={c.label}
                      onClick={() => setTagColor(selected ? null : c.label)}
                      style={{
                        height: 38,
                        padding: '0 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 999,
                        fontFamily: 'inherit',
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        background: selected ? '#E1F5EE' : '#FFFFFF',
                        color: selected ? '#2E9486' : '#1A1A1A',
                        border: selected ? '1px dashed #55BAAA' : '1px solid #D4D4D0',
                      }}
                    >
                      <span style={{ width: 11, height: 11, borderRadius: 999, flexShrink: 0, background: c.swatch, border: c.swatchBorder }} />
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Preg status */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Preg status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(['bred', 'open'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setPregStatus((cur) => (cur === s ? null : s))
                      if (s === 'open') setPregTiming(null)
                    }}
                    style={{ ...chipStyle(pregStatus === s), padding: '0 20px' }}
                  >
                    {s === 'bred' ? 'Bred' : 'Open'}
                  </button>
                ))}
              </div>
              {pregStatus === 'bred' ? (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #DEE3EC' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#717182', marginBottom: 8 }}>
                    Bred timing <span style={{ fontWeight: 500 }}>· optional</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {PREG_TIMINGS.map((t) => (
                      <button key={t} onClick={() => setPregTiming((cur) => (cur === t ? null : t))} style={chipStyle(pregTiming === t, 36)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Quick notes */}
        <div style={cardStyle}>
          {cardHeader('Quick notes')}
          <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {QUICK_NOTES.map((n) => {
              const selected = quickNotes.includes(n.label)
              return (
                <button key={n.label} onClick={() => toggleNote(n.label)} style={chipStyle(selected)}>
                  {n.flag ? (
                    <span style={{ display: 'inline-flex', marginRight: 1, color: selected ? '#FFFFFF' : '#E24B4A' }}>
                      <FlagIcon size={12} />
                    </span>
                  ) : null}
                  {n.label}
                </button>
              )
            })}
            {/* custom notes the vet added */}
            {quickNotes
              .filter((q) => !QUICK_NOTES.some((n) => n.label === q))
              .map((q) => (
                <button key={q} onClick={() => toggleNote(q)} style={chipStyle(true)}>
                  {q}
                </button>
              ))}
            <button aria-label="Add quick note" onClick={addCustomNote} style={{ width: 38, height: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: '#FFFFFF', border: '1px solid #D4D4D0', cursor: 'pointer', padding: 0, color: '#717182' }}>
              <PlusIcon size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {error ? <p style={errorLine}>{error}</p> : null}
      </main>

      {/* Save & Next */}
      <div style={{ flexShrink: 0, padding: '12px 12px 20px' }}>
        <button className="sbv-gold-btn" onClick={saveAndNext} disabled={busy}>
          {busy ? 'Saving…' : 'Save & Next'}
        </button>
      </div>
    </>
  )
}

const setupInput: CSSProperties = {
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
const identityInput: CSSProperties = {
  flex: '1 1 0%',
  minWidth: 0,
  height: 44,
  padding: '0 14px',
  borderRadius: 10,
  border: '1px solid #D4D4D0',
  background: '#FFFFFF',
  fontFamily: 'inherit',
  fontSize: 16,
  fontWeight: 600,
  color: '#1A1A1A',
  outline: 'none',
}
const errorLine: CSSProperties = { color: '#E24B4A', fontSize: 13, fontWeight: 600, padding: '4px 2px', margin: 0 }

function SetupField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 92, flexShrink: 0, fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{label}</div>
      <div style={{ flex: '1 1 0%', minWidth: 0 }}>{children}</div>
    </div>
  )
}
function IdentityRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 85, flexShrink: 0, fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{label}</div>
      {children}
    </div>
  )
}
