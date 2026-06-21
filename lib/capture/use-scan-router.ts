'use client'

import { useEffect, useRef } from 'react'

/**
 * Screen-level scan capture. A keyboard-wedge wand types a fast burst of
 * characters then Enter, into whatever field has focus — so scans land in the
 * wrong place. We watch keydowns at the window (capture phase), recognise the
 * burst by its speed, keep those characters out of the focused field, and on
 * Enter hand the whole code to `onScan` to be routed by its shape. Slow, human
 * typing is left completely alone.
 */
export function useScanRouter(onScan: (code: string) => void, active: boolean) {
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!active) return

    let buffer = ''
    let lastTime = 0
    let burst = false
    const GAP_MS = 45 // keys closer together than this came from the wand, not a person
    const MIN_LEN = 3 // shortest burst we'll treat as a scan

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'Enter') {
        const code = buffer
        const wasBurst = burst && code.length >= MIN_LEN
        buffer = ''
        burst = false
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

      if (gap > GAP_MS) {
        // Slow keypress: a person typing, or the very first char of a burst.
        buffer = e.key
        burst = false
      } else {
        // Fast follow-up: this is the wand. Keep it out of the focused field.
        buffer += e.key
        burst = true
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active])
}
