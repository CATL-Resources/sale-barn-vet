'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { CaptureBootstrap } from '@/lib/capture/types'
import type { StartBatchInput } from '@/lib/capture/use-capture'
import { ChevronLeft, ChevronRight } from './icons'
import { OptionPicker, type Option } from './sheets'

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type Picker = 'saleDay' | 'pen' | 'consignor' | null

export function StartBatch({
  bootstrap,
  onStart,
  saving,
}: {
  bootstrap: CaptureBootstrap
  onStart: (input: StartBatchInput) => void
  saving: boolean
}) {
  const [saleDayId, setSaleDayId] = useState<string | null>(bootstrap.todaySaleDayId)
  const [pen, setPen] = useState<{ id: string | null; number: string | null }>({ id: null, number: null })
  const [workTypeId, setWorkTypeId] = useState<string | null>(null)
  const [seller, setSeller] = useState<{ id: string | null; name: string }>({ id: null, name: '' })
  const [head, setHead] = useState('')
  const [picker, setPicker] = useState<Picker>(null)

  const saleDayLabel = saleDayId
    ? `${shortDate(bootstrap.saleDays.find((d) => d.id === saleDayId)?.sale_date ?? bootstrap.today)}`
    : `Today · ${shortDate(bootstrap.today)}`

  const saleDayOptions: Option[] = useMemo(() => {
    const opts: Option[] = []
    if (!bootstrap.todaySaleDayId) opts.push({ id: 'TODAY_NEW', label: `Today · ${shortDate(bootstrap.today)}`, sub: 'start a new sale day' })
    for (const d of bootstrap.saleDays) opts.push({ id: d.id, label: shortDate(d.sale_date), sub: d.status })
    return opts
  }, [bootstrap])

  const penOptions: Option[] = useMemo(
    () =>
      bootstrap.pens
        .filter((p) => (saleDayId ? p.sale_day_id === saleDayId : false))
        .map((p) => ({ id: p.id, label: `Pen ${p.pen_number}`.replace('Pen Pen', 'Pen') })),
    [bootstrap.pens, saleDayId],
  )

  const consignorOptions: Option[] = useMemo(
    () => bootstrap.parties.map((p) => ({ id: p.id, label: p.name })),
    [bootstrap.parties],
  )

  const ready = !!workTypeId && (!!seller.id || seller.name.trim().length > 0)

  function submit() {
    if (!workTypeId) return
    const headStarted = head.trim() ? Math.max(0, parseInt(head.trim(), 10) || 0) : null
    onStart({
      saleDayId,
      penId: pen.id,
      penNumber: pen.number,
      workTypeId,
      sellerPartyId: seller.id,
      sellerName: seller.name,
      headStarted,
    })
  }

  const fieldBtn = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '13px 14px',
    background: '#FFFFFF',
    border: '1px solid #D4D4D0',
    borderRadius: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0E2646', flexShrink: 0, padding: '16px 16px 18px', borderRadius: '17px 17px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" aria-label="Back" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
            <ChevronLeft size={22} color="#FFFFFF" />
          </Link>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>New batch</div>
        </div>
      </div>

      <div className="sbv-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
        <button type="button" style={fieldBtn} onClick={() => setPicker('saleDay')}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#717182' }}>Sale day</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginTop: 1 }}>{saleDayLabel}</div>
          </div>
          <ChevronRight size={20} color="#9A9AA6" />
        </button>

        <button type="button" style={fieldBtn} onClick={() => setPicker('pen')}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#717182' }}>Pen</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: pen.number ? '#1A1A1A' : '#9A9AA6', marginTop: 1 }}>
              {pen.number ? `Pen ${pen.number}` : 'Choose a pen'}
            </div>
          </div>
          <ChevronRight size={20} color="#9A9AA6" />
        </button>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Work type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {bootstrap.workTypes.map((wt) => {
              const selected = wt.id === workTypeId
              return (
                <button
                  key={wt.id}
                  type="button"
                  onClick={() => setWorkTypeId(wt.id)}
                  style={{
                    height: 40,
                    padding: '0 16px',
                    borderRadius: 999,
                    background: selected ? '#0E2646' : '#FFFFFF',
                    color: selected ? '#FFFFFF' : '#1A1A1A',
                    border: `1px solid ${selected ? '#0E2646' : '#D4D4D0'}`,
                    fontFamily: 'inherit',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {wt.name}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Consignor</div>
          <button
            type="button"
            onClick={() => setPicker('consignor')}
            style={{
              width: '100%',
              minHeight: 48,
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
              borderRadius: 12,
              background: '#FFFFFF',
              border: '1px solid #D4D4D0',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: seller.name ? '#1A1A1A' : '#9A9AA6' }}>
              {seller.name || 'Pick or add a consignor'}
            </span>
          </button>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Head expected</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#9A9AA6' }}>optional</div>
          </div>
          <input
            value={head}
            onChange={(e) => setHead(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="—"
            style={{
              width: '100%',
              height: 48,
              padding: '0 14px',
              borderRadius: 12,
              background: '#FFFFFF',
              border: '1px solid #D4D4D0',
              fontFamily: 'inherit',
              fontSize: 16,
              fontWeight: 700,
              color: '#1A1A1A',
              outline: 'none',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
        </div>
      </div>

      <div style={{ flexShrink: 0, background: '#FFFFFF', borderTop: '1px solid #E4E4DE', padding: '12px 16px 18px' }}>
        <button
          type="button"
          onClick={submit}
          disabled={!ready || saving}
          style={{
            width: '100%',
            height: 56,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            borderRadius: 13,
            background: ready ? '#F3D12A' : '#EDE7C2',
            color: '#0E2646',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 18,
            fontWeight: 800,
            cursor: ready && !saving ? 'pointer' : 'default',
            letterSpacing: '-0.01em',
            opacity: saving ? 0.7 : 1,
          }}
        >
          Start working
          <ChevronRight size={20} color="#0E2646" sw={2.6} />
        </button>
      </div>

      <OptionPicker
        open={picker === 'saleDay'}
        title="Sale day"
        options={saleDayOptions}
        selectedId={saleDayId ?? 'TODAY_NEW'}
        onPick={(id) => {
          setSaleDayId(id === 'TODAY_NEW' ? null : id)
          setPen({ id: null, number: null })
          setPicker(null)
        }}
        onClose={() => setPicker(null)}
      />
      <OptionPicker
        open={picker === 'pen'}
        title="Pen"
        options={penOptions}
        selectedId={pen.id}
        searchable
        createLabel="Use pen"
        onCreate={(text) => {
          setPen({ id: null, number: text })
          setPicker(null)
        }}
        onPick={(id) => {
          const p = bootstrap.pens.find((x) => x.id === id)
          setPen({ id, number: p?.pen_number ?? null })
          setPicker(null)
        }}
        onClose={() => setPicker(null)}
      />
      <OptionPicker
        open={picker === 'consignor'}
        title="Consignor"
        options={consignorOptions}
        selectedId={seller.id}
        searchable
        createLabel="Add"
        onCreate={(text) => {
          setSeller({ id: null, name: text })
          setPicker(null)
        }}
        onPick={(id) => {
          const p = bootstrap.parties.find((x) => x.id === id)
          setSeller({ id, name: p?.name ?? '' })
          setPicker(null)
        }}
        onClose={() => setPicker(null)}
      />
    </div>
  )
}
