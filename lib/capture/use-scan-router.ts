'use client'

import { useEffect, useRef } from 'react'

/**
 * Screen-level scan capture. A keyboard-wedge wand types a fast burst of
 * characters then Enter, into whatever field has focus — so scans land in the
 * wrong place. We watch keydowns at the window (capture phase), recognise the
 * burst by its speed, keep those characters out of the focused field, and on
 * Enter hand the whole code to `onScan` to be routed by its shape. Slow, human
 * typing is left completely alone.
 *
 * Important: a real wand on a busy phone does NOT deliver keys perfectly evenly
 * — the odd character lands a little late. Once a burst is underway we therefore
 * keep collecting every character until a clearly human-length pause (or Enter);
 * a single slow key must never split one scan into two. Splitting was the cause
 * of "only a couple of the EID digits get captured before it jumps fields."
 */
export function useScanRouter(onScan: (code: string) => void, active: boolean) {
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!active) return

    let buffer = ''
    let lastTime = 0
    let inBurst = false
    // A follow-up key this close to the last one is wand speed, not a person.
    // Generous on purpose: wands fire well under this, people rarely do.
    const FAST_MS = 80
    // Once we're in a burst, only a real pause this long ends it. Anything
    // shorter (a momentarily late key) is still part of the same scan.
    const END_MS = 400
    const MIN_LEN = 3 // shortest burst we'll treat as a scan

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'Enter') {
        const code = buffer
        const wasBurst = inBurst && code.length >= MIN_LEN
        buffer = ''
        inBurst = false
        if (wasBurst) {
          // It was a scan — don't let the Enter submit a form or add a newline.
          e.preventDefault()
          e.stopPropagation()
          onScanRef.current(code)
        }
        return
      }

      if (e.key.length !== 1) return // ignore Shift, Tab, arrows, Backspace, etc.

      const now = performance.now()
      const gap = now - lastTime
      lastTime = now

      if (inBurst) {
        // Mid-scan. Keep every character even if one arrives a touch late — only
        // a genuine, human-length pause means a new, separate entry has started.
        if (gap > END_MS) {
          buffer = e.key
          inBurst = false
        } else {
          buffer += e.key
          e.preventDefault()
          e.stopPropagation()
        }
        return
      }

      if (gap <= FAST_MS && buffer) {
        // Second fast key in a row: this is the wand. Start the burst, keeping
        // the first character we already stashed so the routed code is whole.
        buffer += e.key
        inBurst = true
        e.preventDefault()
        e.stopPropagation()
      } else {
        // First keypress, or slow human typing: stash this one char (so a burst
        // that begins on the next key still has it) but let it type normally.
        buffer = e.key
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active])
}
