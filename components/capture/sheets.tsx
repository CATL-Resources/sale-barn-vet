'use client'

import { useState, type ReactNode } from 'react'
import { PlusIcon, SearchIcon, XIcon } from './icons'

/** A bottom sheet that slides over the 390px frame. */
export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(8,18,40,0.5)' }}
        aria-hidden
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          background: '#FFFFFF',
          borderRadius: '22px 22px 0 0',
          boxShadow: '0 -10px 40px rgba(8,18,40,0.35)',
          maxHeight: '88%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 999, background: '#DEE3EC', margin: '8px auto 6px', flexShrink: 0 }} />
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 18px 12px',
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 19, fontWeight: 800, color: '#0E2646', letterSpacing: '-0.01em' }}>{title}</div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          background: '#F1F2F6',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <XIcon size={18} color="#717182" sw={2.2} />
      </button>
    </div>
  )
}

export type Option = { id: string; label: string; sub?: string }

/** Pick one option from a searchable list, with an optional "add new" row. */
export function OptionPicker({
  open,
  title,
  options,
  onPick,
  onClose,
  selectedId,
  searchable = false,
  createLabel,
  onCreate,
}: {
  open: boolean
  title: string
  options: Option[]
  onPick: (id: string) => void
  onClose: () => void
  selectedId?: string | null
  searchable?: boolean
  createLabel?: string
  onCreate?: (text: string) => void
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options

  return (
    <BottomSheet open={open} onClose={onClose}>
      <SheetHeader title={title} onClose={onClose} />
      {searchable && (
        <div style={{ padding: '0 18px 10px', flexShrink: 0 }}>
          <div
            style={{
              height: 46,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 14px',
              borderRadius: 12,
              background: '#FFFFFF',
              border: '1px solid #D4D4D0',
            }}
          >
            <SearchIcon size={18} color="#9A9AA6" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or type a new name"
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: 16,
                fontWeight: 600,
                color: '#1A1A1A',
              }}
            />
          </div>
        </div>
      )}
      <div style={{ overflowY: 'auto', padding: '0 18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {createLabel && onCreate && q && !filtered.some((o) => o.label.toLowerCase() === q) && (
          <button
            type="button"
            onClick={() => {
              onCreate(query.trim())
              setQuery('')
            }}
            style={{
              height: 52,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 16px',
              borderRadius: 12,
              background: '#E1F5EE',
              border: '1px solid #55BAAA',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <PlusIcon size={18} color="#2E9486" sw={2.2} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#155E54' }}>
              {createLabel} “{query.trim()}”
            </span>
          </button>
        )}
        {filtered.map((o) => {
          const selected = o.id === selectedId
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onPick(o.id)}
              style={{
                minHeight: 52,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 16px',
                borderRadius: 12,
                background: selected ? '#0E2646' : '#FFFFFF',
                border: `1px solid ${selected ? '#0E2646' : '#D4D4D0'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: selected ? '#FFFFFF' : '#1A1A1A' }}>
                  {o.label}
                </div>
                {o.sub && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: selected ? '#8FA8CC' : '#717182', marginTop: 1 }}>
                    {o.sub}
                  </div>
                )}
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && !createLabel && (
          <div style={{ padding: '14px 4px', fontSize: 14, color: '#717182' }}>Nothing here yet.</div>
        )}
      </div>
    </BottomSheet>
  )
}
