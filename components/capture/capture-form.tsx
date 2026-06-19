'use client'

import { useRef, useState } from 'react'
import { tagColorHex, isPaleSwatch } from '@/lib/capture/colors'
import { isBredStage } from '@/lib/capture/types'
import type { CaptureApi } from '@/lib/capture/use-capture'
import { ChevronLeft, ChevronDown, ChevronUp, ScanIcon, CalendarIcon, PencilIcon, SortIcon, CloseOutIcon, FlagIcon, CheckIcon, XIcon } from './icons'
import { OptionPicker, type Option } from './sheets'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Fields inside the white "Fields" card, rendered in resolved sort_order.
const CARD_FIELDS = ['age', 'breed', 'hide_color', 'preg_stage', 'preg_timing', 'fetal_sex'] as const

const cardHead = (title: string) => (
  <div style={{ background: '#EEF1F6', padding: '8px 14px 9px', borderBottom: '1px solid #DEE3EC' }}>
    <div style={{ fontSize: 14, fontWeight: 700, color: '#0E2646', letterSpacing: '-0.01em' }}>{title}</div>
    <div style={{ width: 26, height: 3, borderRadius: 2, background: '#F3D12A', marginTop: 4 }} />
  </div>
)

const RequiredChip = () => (
  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#B45309', background: '#FEF3C7', border: '1px solid #F2C879', borderRadius: 999, padding: '2px 8px' }}>
    REQUIRED
  </span>
)

const fieldLabel = (label: string, hint?: string, requiredEmpty?: boolean) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 8 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{label}</div>
    {hint && <div style={{ fontSize: 12, fontWeight: 500, color: '#9A9AA6' }}>{hint}</div>}
    {requiredEmpty && <RequiredChip />}
  </div>
)

export function CaptureForm({
  api,
  onOpenCloseOut,
  onTapSort,
}: {
  api: CaptureApi
  onOpenCloseOut: () => void
  onTapSort: () => void
}) {
  const { bootstrap, batch, draft, worked, sorted, sortPens, saving, resolved, shows, required, patchDraft, toggleQuickNote, saveNext, handleScan } = api
  const eidRef = useRef<HTMLInputElement>(null)
  const [scanLine, setScanLine] = useState('')
  const [breedExpanded, setBreedExpanded] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [monthOpen, setMonthOpen] = useState(false)

  if (!batch) return null

  const head = batch.headStarted
  const left = head != null ? Math.max(0, head - worked) : null
  const goldPct = head && head > 0 ? Math.min(100, (worked / head) * 100) : 0
  const tealPct = head && head > 0 ? Math.min(100 - goldPct, (sorted / head) * 100) : 0

  const flaggedOn = bootstrap.quickNotes.filter((q) => q.is_flag && draft.quickNotes.includes(q.label))
  const sortPen = draft.sortPenId ? sortPens.find((p) => p.id === draft.sortPenId) : null
  const active = draft.eid.trim().length > 0

  const monthOptions: Option[] = (bootstrap.barn.preg_active_months.length ? bootstrap.barn.preg_active_months : MONTHS).map(
    (m) => ({ id: m, label: m }),
  )

  const orderedFields = CARD_FIELDS.filter((k) => shows(k)).sort(
    (a, b) => (resolved.get(a)?.sort_order ?? 0) - (resolved.get(b)?.sort_order ?? 0),
  )

  // A scan landed on the EID line (wand sends the code then Enter).
  async function onScanEnter() {
    const v = scanLine.trim()
    if (!v) return
    await handleScan(v)
    setScanLine('')
    eidRef.current?.focus()
  }

  // Deliberate Save & next. Carry an uncommitted typed EID through as the value.
  async function onSaveNext() {
    const override = !draft.eid.trim() && scanLine.trim() ? scanLine.trim() : undefined
    const ok = await saveNext(override)
    if (ok) {
      setScanLine('')
      setNoteOpen(false)
      setBreedExpanded(false)
      eidRef.current?.focus()
    }
  }

  // --- identity inputs (typed tags) ---
  const navyInput = (key: 'backTag' | 'visualTag' | 'metalTag', label: string, placeholder: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
      <div style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#C9D5EA' }}>{label}</div>
      <input
        value={draft[key]}
        onChange={(e) => patchDraft({ [key]: e.target.value } as Partial<typeof draft>)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          height: 46,
          padding: '0 13px',
          borderRadius: 11,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#FFFFFF',
          fontFamily: 'inherit',
          fontSize: 15,
          fontWeight: 700,
          outline: 'none',
        }}
      />
    </div>
  )

  const scanInput = (placeholder: string, dashed: boolean) => (
    <input
      ref={eidRef}
      autoFocus
      value={scanLine}
      onChange={(e) => setScanLine(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          void onScanEnter()
        }
      }}
      placeholder={placeholder}
      style={{
        flex: 1,
        minWidth: 0,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontFamily: 'inherit',
        fontSize: dashed ? 14 : 16,
        fontWeight: 700,
        color: '#1A1A1A',
        fontVariantNumeric: 'tabular-nums',
      }}
    />
  )

  function renderField(key: string) {
    switch (key) {
      case 'age':
        return (
          <div key="age">
            {fieldLabel('Age', 'by tag color', required('age') && !draft.ageDesignation)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {bootstrap.ageOptions.map((a) => {
                const selected = draft.ageDesignation === a.designation_value
                const hex = tagColorHex(a.designation_value)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => patchDraft({ ageDesignation: selected ? null : a.designation_value })}
                    style={{ height: 40, padding: '0 13px', display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, background: selected ? '#0E2646' : '#FFFFFF', color: selected ? '#FFFFFF' : '#1A1A1A', border: `1px solid ${selected ? '#0E2646' : '#D4D4D0'}`, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}
                  >
                    <span style={{ width: 13, height: 13, borderRadius: 999, background: hex, border: isPaleSwatch(a.designation_value) ? '1.5px solid #C9C9C4' : '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
                    {a.age_label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      case 'breed':
        return (
          <PillField key="breed" label="Breed" options={bootstrap.breedOptions} value={draft.breed} onPick={(v) => patchDraft({ breed: v })} expanded={breedExpanded} setExpanded={setBreedExpanded} requiredEmpty={required('breed') && !draft.breed} />
        )
      case 'hide_color':
        return (
          <PillField key="hide_color" label="Color" options={bootstrap.colorOptions} value={draft.color} onPick={(v) => patchDraft({ color: v })} expanded={false} setExpanded={() => {}} alwaysAll requiredEmpty={required('hide_color') && !draft.color} />
        )
      case 'preg_stage':
        return (
          <div key="preg_stage">
            {fieldLabel('Stage', undefined, required('preg_stage') && !draft.pregStatus)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {bootstrap.pregStages.map((s) => {
                const selected = draft.pregStatus === s.stage_code
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => patchDraft({ pregStatus: selected ? null : s.stage_code, pregTiming: isBredStage(s.stage_code) ? draft.pregTiming : null })}
                    style={{ height: 44, padding: '0 16px', borderRadius: 11, background: selected ? '#0E2646' : '#FFFFFF', color: selected ? '#FFFFFF' : '#1A1A1A', border: `1px solid ${selected ? '#0E2646' : '#D4D4D0'}`, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {s.display_label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      case 'preg_timing':
        return (
          <div key="preg_timing">
            {fieldLabel('Month bred', 'shows for a bred stage', required('preg_timing') && !draft.pregTiming)}
            <button
              type="button"
              onClick={() => setMonthOpen(true)}
              style={{ height: 46, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 11, background: '#FFFFFF', border: '1px solid #D4D4D0', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              <CalendarIcon size={17} color="#717182" />
              <span style={{ fontSize: 15, fontWeight: 700, color: draft.pregTiming ? '#1A1A1A' : '#9A9AA6' }}>{draft.pregTiming ?? 'Pick month'}</span>
              <ChevronDown size={16} color="#9A9AA6" />
            </button>
          </div>
        )
      case 'fetal_sex':
        return (
          <div key="fetal_sex">
            {fieldLabel('Fetal sex', undefined, required('fetal_sex') && !draft.fetalSex)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Heifer', 'Bull'].map((fx) => {
                const selected = draft.fetalSex === fx
                return (
                  <button
                    key={fx}
                    type="button"
                    onClick={() => patchDraft({ fetalSex: selected ? null : fx })}
                    style={{ height: 40, padding: '0 16px', borderRadius: 999, background: selected ? '#0E2646' : '#FFFFFF', color: selected ? '#FFFFFF' : '#1A1A1A', border: `1px solid ${selected ? '#0E2646' : '#D4D4D0'}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {fx}
                  </button>
                )
              })}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ background: '#0E2646', flexShrink: 0, padding: '14px 16px 16px', borderRadius: '17px 17px 0 0', boxShadow: '0 6px 18px rgba(8,18,40,0.30)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/capture" aria-label="Back" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={22} color="#FFFFFF" />
          </a>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>{batch.workTypeName}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#55BAAA', marginTop: 1 }}>
              {batch.sellerName}{batch.penNumber ? ` · Pen ${batch.penNumber}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCloseOut}
            style={{ flexShrink: 0, height: 36, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 13px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.28)', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <CloseOutIcon size={14} color="#FFFFFF" sw={2.2} />
            Close out
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
              {head != null ? `${worked} of ${head} head` : `${worked} head`}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: sorted > 0 ? '#7FD9CB' : '#8FA8CC', fontVariantNumeric: 'tabular-nums' }}>
              {sorted > 0 ? `${sorted} sorted${left != null ? ` · ${left} left` : ''}` : left != null ? `${left} left` : 'in this batch'}
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.14)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ height: '100%', width: `${goldPct}%`, background: '#F3D12A' }} />
            <div style={{ height: '100%', width: `${tealPct}%`, background: '#55BAAA' }} />
          </div>
        </div>
      </div>

      {/* body — sbv-scroll just scrolls; an inner wrapper holds the spacing so
          the cards keep their natural height instead of being shrunk to fit */}
      <div className="sbv-scroll">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 12 }}>
          {flaggedOn.length > 0 && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <FlagIcon size={26} color="#B45309" sw={2.4} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#7A4A06', letterSpacing: '-0.01em' }}>{flaggedOn.map((f) => f.label).join(' · ')}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#A86A12', marginTop: 1 }}>Flagged note — shows loud, doesn&apos;t block</div>
            </div>
          </div>
        )}

        {sortPen && (
          <div style={{ background: '#E1F5EE', border: '1px solid #55BAAA', borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <SortIcon size={24} color="#2E9486" sw={2.2} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#155E54', letterSpacing: '-0.01em' }}>
                Sort pen {sortPen.pen_number} · {sortPen.count + 1} head so far
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2E9486', marginTop: 1 }}>
                Out of this pen&apos;s count — stays open all day
              </div>
            </div>
          </div>
        )}

        {/* identity */}
        <div style={{ background: '#0E2646', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#8FA8CC', textTransform: 'uppercase', marginBottom: 11 }}>
            Identity · {bootstrap.barn.official_id_type} barn
          </div>
          {shows('eid') && (
            <div style={{ marginBottom: 9 }}>
              {active ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#C9D5EA' }}>EID</div>
                    <div style={{ flex: 1, minWidth: 0, height: 50, display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px', borderRadius: 11, background: '#E1F5EE', border: '1px solid #55BAAA' }}>
                      <ScanIcon size={19} color="#2E9486" />
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1A6B5E', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{draft.eid}</span>
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#2E9486' }}>SCANNED</span>
                      <button type="button" aria-label="Clear EID" onClick={() => patchDraft({ eid: '' })} style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                        <XIcon size={15} color="#2E9486" sw={2.2} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 60, flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#8FA8CC' }}>Next</div>
                    <div style={{ flex: 1, minWidth: 0, height: 42, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRadius: 10, background: 'rgba(255,255,255,0.10)', border: '1px dashed rgba(255,255,255,0.4)' }}>
                      {scanInput('Scan the next cow', true)}
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#F3D12A' }}>READER ON</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#C9D5EA' }}>EID</div>
                  <div style={{ flex: 1, minWidth: 0, height: 50, display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px', borderRadius: 11, background: '#FFFFFF', border: '2px solid #55BAAA', boxShadow: '0 0 0 3px rgba(85,186,170,0.35)' }}>
                    <ScanIcon size={19} color="#2E9486" />
                    {scanInput('Scan tag', false)}
                    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#2E9486' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#2E9486' }} />
                      READER ON
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          {shows('back_tag') && navyInput('backTag', 'Back tag', 'Optional · scan barcode')}
          {shows('visual_tag') && navyInput('visualTag', 'Tag #', 'Type if no tag scanned')}
          {shows('metal_tag') && navyInput('metalTag', 'Metal tag', 'Optional')}
        </div>

        {/* fields */}
        {orderedFields.length > 0 && (
          <div style={{ background: '#FFFFFF', border: '1px solid #D4D4D0', borderRadius: 14, overflow: 'hidden' }}>
            {cardHead('Fields')}
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {orderedFields.map((k) => renderField(k))}
            </div>
          </div>
        )}

        {/* quick notes */}
        {shows('quick_notes') && (
          <div style={{ background: '#FFFFFF', border: '1px solid #D4D4D0', borderRadius: 14, overflow: 'hidden' }}>
            {cardHead('Quick notes')}
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 11, marginBottom: 11, borderBottom: '1px solid #ECECE8' }}>
                <button
                  type="button"
                  onClick={onTapSort}
                  style={{ flexShrink: 0, height: 42, padding: draft.sortPenId ? '0 13px' : '0 15px 0 13px', display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, background: draft.sortPenId ? '#2E9486' : '#E1F5EE', border: `1px solid ${draft.sortPenId ? '#2E9486' : '#55BAAA'}`, color: draft.sortPenId ? '#FFFFFF' : '#1A6B5E', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  <SortIcon size={15} color={draft.sortPenId ? '#FFFFFF' : '#2E9486'} sw={2.2} />
                  Sort
                  {draft.sortPenId && <CheckIcon size={15} color="#FFFFFF" sw={2.6} />}
                </button>
                <div style={{ fontSize: 11, fontWeight: 600, color: draft.sortPenId ? '#2E9486' : '#717182', lineHeight: 1.3 }}>
                  {draft.sortPenId ? "In the sort pen — out of this pen's count" : 'Pinned · pulls her into a shared sort pen, out of this count'}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {bootstrap.quickNotes.map((q) => {
                  const on = draft.quickNotes.includes(q.label)
                  const flag = q.is_flag
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => toggleQuickNote(q.label)}
                      style={{ height: 42, padding: on && flag ? '0 13px 0 14px' : '0 16px', display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, background: on ? (flag ? '#FEF3C7' : '#0E2646') : '#FFFFFF', border: `1px solid ${on ? (flag ? '#F59E0B' : '#0E2646') : '#D4D4D0'}`, color: on ? (flag ? '#7A4A06' : '#FFFFFF') : '#1A1A1A', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {on && flag && <FlagIcon size={13} color="#B45309" sw={2.4} />}
                      {q.label}
                      {on && !flag && <CheckIcon size={15} color="#FFFFFF" sw={2.6} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* freeform note */}
        {shows('notes') &&
          (noteOpen || draft.notes ? (
            <div style={{ background: '#FFFFFF', border: '1px solid #D4D4D0', borderRadius: 14, padding: 12 }}>
              <textarea
                autoFocus
                value={draft.notes}
                onChange={(e) => patchDraft({ notes: e.target.value })}
                placeholder="Note for this animal"
                rows={2}
                style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: '#1A1A1A', background: 'transparent' }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: '#FFFFFF', border: '1px solid #D4D4D0', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <PencilIcon size={16} color="#9A9AA6" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#9A9AA6' }}>Add a note</span>
            </button>
          ))}
        </div>
      </div>

      {/* save bar */}
      <div style={{ flexShrink: 0, background: '#FFFFFF', borderTop: '1px solid #E4E4DE', padding: '12px 16px 18px', boxShadow: '0 -6px 18px rgba(8,18,40,0.06)' }}>
        <button
          type="button"
          onClick={() => void onSaveNext()}
          disabled={saving}
          style={{ width: '100%', height: 56, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 13, background: '#F3D12A', color: '#0E2646', border: 'none', fontFamily: 'inherit', fontSize: 18, fontWeight: 800, cursor: saving ? 'default' : 'pointer', letterSpacing: '-0.01em', opacity: saving ? 0.7 : 1 }}
        >
          {draft.sortPenId ? <SortIcon size={20} color="#0E2646" sw={2.6} /> : <CheckIcon size={20} color="#0E2646" sw={2.6} />}
          {draft.sortPenId ? 'Sort & next' : 'Save & next'}
        </button>
      </div>

      <OptionPicker
        open={monthOpen}
        title="Month bred"
        options={monthOptions}
        selectedId={draft.pregTiming}
        onPick={(m) => {
          patchDraft({ pregTiming: m })
          setMonthOpen(false)
        }}
        onClose={() => setMonthOpen(false)}
      />
    </div>
  )
}

function PillField({
  label,
  options,
  value,
  onPick,
  expanded,
  setExpanded,
  alwaysAll = false,
  requiredEmpty = false,
}: {
  label: string
  options: { id: string; value: string; label: string; is_pinned: boolean }[]
  value: string | null
  onPick: (v: string | null) => void
  expanded: boolean
  setExpanded: (b: boolean) => void
  alwaysAll?: boolean
  requiredEmpty?: boolean
}) {
  const pinned = options.filter((o) => o.is_pinned)
  const hasMore = options.length > pinned.length
  const shown = alwaysAll || expanded ? options : pinned

  const pill = (o: { id: string; value: string; label: string }) => {
    const selected = value === o.value
    return (
      <button
        key={o.id}
        type="button"
        onClick={() => onPick(selected ? null : o.value)}
        style={{ height: 38, padding: '0 15px', borderRadius: 999, background: selected ? '#0E2646' : '#FFFFFF', color: selected ? '#FFFFFF' : '#1A1A1A', border: `1px solid ${selected ? '#0E2646' : '#D4D4D0'}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
      >
        {o.label}
      </button>
    )
  }

  return (
    <div>
      {fieldLabel(label, undefined, requiredEmpty)}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {shown.map(pill)}
        {!alwaysAll && hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{ height: 38, padding: '0 13px 0 12px', display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, background: '#FFFFFF', color: '#717182', border: '1px dashed #C2C2CA', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            {expanded ? 'less' : '+ more'}
            {expanded ? <ChevronUp size={15} color="#717182" sw={2.2} /> : <ChevronDown size={15} color="#717182" sw={2.2} />}
          </button>
        )}
      </div>
    </div>
  )
}
