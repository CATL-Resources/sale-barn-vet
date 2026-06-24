'use client'

import { useEffect, useRef } from 'react'

/**
 * Set an <input>/<textarea> value so React's onChange notices. Used to wipe the
 * characters a recognised scan dropped into the focused field (React tracks the
 * value itself, so a plain assignment is ignored — we have to go through the
 * native setter and fire an input event).
 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Screen-level scan capture, rebuilt so it can never drop a digit.
 *
 * A keyboard-wedge wand types a fast burst of characters then Enter, into
 * whatever field has focus. The hard lesson from the chute: any scheme that
 * BLOCKS the wand's keys mid-burst and rebuilds the number from a copy is
 * fragile — on a slower tablet one late or missed key and the number comes back
 * as a single digit (or split in two). So we don't block anything.
 *
 * We let every character land in the focused field as it arrives, exactly like
 * normal typing, and quietly keep a timed copy. When the wand's Enter arrives we
 * look at that copy: if the characters came in as one fast machine burst, we
 * wipe whatever they dropped into the focused field and hand the whole code to
 * `onScan` to be routed by its shape. If it looks like a person typing, we leave
 * it completely alone.
 *
 * Because we never block a key, the digits are never lost: worst case, on a
 * really janky tablet, the burst just isn't recognised and the number simply
 * stays in the box for the normal Save path to pick up — you can't be left with
 * one digit.
 */
export function useScanRouter(onScan: (code: string) => void, active: boolean) {
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!active) return

    let buffer = ''
    let startTime = 0 // when the current run of characters began
    let lastTime = 0 // when the last character arrived
    // The field the characters are landing in, and its value before this run
    // began, so a recognised scan can be wiped back out of it.
    let leakEl: HTMLInputElement | HTMLTextAreaElement | null = null
    let leakPrior = ''

    // Silence this long between keys means a new, separate entry has started, so
    // we begin a fresh run. Generous, so one slow key on a busy tablet never
    // splits a single scan in two.
    const END_MS = 400
    // A machine burst averages well under this many ms per key, even on a slow
    // tablet with the odd stalled key; no one hand-types a long code this fast,
    // so it cleanly tells a wand from a person.
    const AVG_GAP_MAX = 80
    const MIN_LEN = 4 // shortest run we'll treat as a scan (a back tag barcode)

    function rememberLeak(target: EventTarget | null) {
      leakEl = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : null
      leakPrior = leakEl ? leakEl.value : ''
    }
    function reset() {
      buffer = ''
      leakEl = null
      leakPrior = ''
      // Clear the timing too, so no gap/average state bleeds from one burst into
      // the next back-to-back scan.
      startTime = 0
      lastTime = 0
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'Enter') {
        const code = buffer
        const span = lastTime - startTime
        const avgGap = code.length > 1 ? span / (code.length - 1) : Infinity
        const wasBurst = code.length >= MIN_LEN && avgGap <= AVG_GAP_MAX
        const el = leakEl
        const prior = leakPrior
        reset()
        if (wasBurst) {
          // A machine burst — don't let the Enter submit a form or add a
          // newline, wipe the characters it dropped into the focused field, then
          // hand the whole code on to be routed by its shape.
          e.preventDefault()
          e.stopPropagation()
          // Only wipe the field we tracked if it's STILL the focused, mounted
          // element. If a previous scan's save/advance swapped focus or unmounted
          // it between this burst's start and its Enter, leakEl is stale — skip
          // the wipe rather than clobber a different (or gone) field. Per the
          // file's hard rule, worst case the raw characters stay put for the
          // normal Save path; we never type into a stale field and never drop a
          // digit.
          if (el && el.isConnected && document.activeElement === el) {
            try {
              setNativeValue(el, prior)
            } catch {
              /* field went away — nothing to wipe */
            }
          }
          onScanRef.current(code)
        }
        // Otherwise a person pressed Enter — let it through untouched.
        return
      }

      if (e.key.length !== 1) return // ignore Shift, Tab, arrows, Backspace, etc.

      const now = performance.now()
      const gap = now - lastTime
      lastTime = now

      if (!buffer || gap > END_MS) {
        // First key, or a real pause since the last one: this starts a fresh
        // run. Note where it's landing so a recognised scan can be wiped back
        // out. We never block the key — it types in as normal.
        buffer = e.key
        startTime = now
        rememberLeak(e.target)
      } else {
        // Another key right behind the last: same run. Still never blocked.
        buffer += e.key
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active])
}
