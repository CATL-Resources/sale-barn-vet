'use client'

import type { CaptureStatus } from '@/lib/capture/use-capture'
import { AlertIcon, CheckIcon } from './icons'

// The ONE status region for the capture screen — the same position and the same
// big, bold size as the old duplicate-tag box. Every system message lands here,
// color-coded by severity: a blocking error (a duplicate ID) is salmon, a warning
// (a required field, or an unrecognized scan to rescan) is amber, a save is green.
// The hook shows one at a time with precedence error > warning > success, so this
// only ever renders the current message.
const STYLES = {
  error: { bg: '#E24B4A', icon: '#FCEBEB' },
  warning: { bg: '#F59E0B', icon: '#FFF7E6' },
  success: { bg: '#16A34A', icon: '#E7F8EE' },
} as const

export function StatusBanner({ status }: { status: CaptureStatus }) {
  if (!status) return null
  const s = STYLES[status.severity]
  return (
    <div
      style={{
        background: s.bg,
        padding: '13px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderRadius: 14,
        flexShrink: 0,
      }}
    >
      {status.severity === 'success' ? (
        <CheckIcon size={28} color={s.icon} sw={3} />
      ) : (
        <AlertIcon size={26} color={s.icon} sw={2.5} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.05, letterSpacing: '0.01em' }}>
          {status.title}
        </div>
        {status.detail ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginTop: 1 }}>{status.detail}</div>
        ) : null}
      </div>
    </div>
  )
}
