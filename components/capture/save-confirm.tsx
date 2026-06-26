'use client'

import type { SaveConfirm } from '@/lib/capture/use-capture'
import { CheckIcon } from './icons'

// The strong, can't-miss "Saved" confirmation that fires after a good save. This
// is the GUARANTEED channel — it has to land on its own without the beep or the
// buzz. Three things at once, all gone within about a second so they never lag
// the next animal:
//   - a full-width green band with a big check and "Saved" (+ the running head
//     count when we have it), readable at arm's length on a phone in a barn
//   - a quick full-screen green wash, caught in peripheral vision when nobody is
//     looking at the band
//   - a thick green edge pulse around the screen for the same reason
// Everything sits above the form but ignores taps (pointer-events: none) so it
// never gets in the way of the next scan. Keyed by the save id by the parent, so
// the animation restarts cleanly on every save, including rapid back-to-back
// ones.

// Keyframes (sbv-save-wash / sbv-save-edge / sbv-save-band) live in app/globals.css.
const GREEN = '#16A34A'
const GREEN_DARK = '#15803D'

export function SaveConfirmBurst({ confirm }: { confirm: SaveConfirm }) {
  if (!confirm) return null
  const label = confirm.head != null ? `Saved — ${confirm.head} head` : 'Saved'

  return (
    <div
      // The id keys this whole tree from the parent, so each save remounts it and
      // every animation plays again from the top.
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Full-screen green wash — quick, for the corner of the eye. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: GREEN,
          animation: 'sbv-save-wash 0.7s ease-out forwards',
        }}
      />

      {/* Thick green edge pulse around the whole screen. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 0 12px ${GREEN}`,
          animation: 'sbv-save-edge 0.85s ease-out forwards',
        }}
      />

      {/* The guaranteed part: a big, bold, full-width "Saved" band. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '32%',
          background: GREEN_DARK,
          color: '#fff',
          padding: '22px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          boxShadow: '0 18px 50px rgba(8,18,40,0.45)',
          animation: 'sbv-save-band 1s ease-out forwards',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#fff',
            flexShrink: 0,
          }}
        >
          <CheckIcon size={34} color={GREEN_DARK} sw={3.5} />
        </span>
        <span
          style={{
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
