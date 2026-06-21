'use client'

import type { ToastMsg } from '@/lib/capture/use-capture'
import { AlertIcon, CheckCircleIcon, XIcon } from './icons'

// Floating status strip. Success auto-dismisses (handled in the hook); a warn
// stays until the next action. Never blocks the screen.
export function CaptureToast({ toast, onDismiss }: { toast: ToastMsg; onDismiss: () => void }) {
  if (!toast) return null
  const success = toast.kind === 'success'
  const bg = success ? '#E1F5EE' : '#FEF3C7'
  const border = success ? '#55BAAA' : '#F59E0B'
  const text = success ? '#1A6B5E' : '#7A4A06'
  const iconColor = success ? '#55BAAA' : '#B45309'

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        top: 12,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: '11px 13px',
        boxShadow: '0 10px 28px rgba(8,18,40,0.18)',
      }}
    >
      {success ? <CheckCircleIcon size={19} color={iconColor} sw={2.2} /> : <AlertIcon size={19} color={iconColor} sw={2.4} />}
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>
        {toast.message}
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
      >
        <XIcon size={16} color={iconColor} sw={2.2} />
      </button>
    </div>
  )
}
