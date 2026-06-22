'use client'

import { useEffect, useRef } from 'react'

/**
 * Set an <input>/<textarea> value so React's onChange notices. Used to pull back
 * the one stray character that slips into the focused field before we know a
 * scan has begun (React tracks the value itself, so a plain assignment is
 * ignored — we have to go through the native setter and fire an input event).
 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Screen-level scan capture. A keyboard-wedge wand types a fast burst of
 * characters then Enter, into whatever field has focus — so scans land in the
 * wrong place. We watch keydowns at the window (capture phase), recognise the
 * burst by its speed, keep those characters out of the focused field, and on
 * Enter hand the whole code to `onScan` to be routed by its shape. Slow, human
 * typing is left completely alone.
 *
 * We can't tell the first key of a burst from a person until the SECOND fast key
 * arrives, so that first character does slip into the focused field. The moment
 * we know it's a scan we pull it back out — otherwise the leading digit of an
 * EID gets left behind in the back-tag / tag field and cascades down the form.
 *
 * A real wand on a busy phone doesn't deliver keys perfectly evenly, so once a
 * burst is underway we keep collecting every character until a clearly
 * human-length pause (or Enter); one slightly-late key must never split a scan.
 */
export function useScanRouter(onScan: (code: string) => void, active: boolean) {
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!active) return

    let buffer = ''
    let lastTime = 0
    let inBurst = false
    // The field the first (un-prevented) character slipped into, and that
    // field's value just before it, so we can undo that one stray char.
    let leakEl: HTMLInputElement | HTMLTextAreaElement | null = null
    let leakPrior = ''
    // A follow-up key this close to the last one is wand speed, not a person.
    const FAST_MS = 80
    // Once we're in a burst, only a real pause this long ends it.
    const END_MS = 400
    const MIN_LEN = 3 // shortest burst we'll treat as a scan

    function rememberLeak(target: EventTarget | null) {
      leakEl = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : null
      leakPrior = leakEl ? leakEl.value : ''
    }
    function undoLeak() {
      if (leakEl) {
        try {
          setNativeValue(leakEl, leakPrior)
        } catch {
          /* field went away — nothing to undo */
        }
      }
      leakEl = null
      leakPrior = ''
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'Enter') {
        const code = buffer
        const wasBurst = inBurst && code.length >= MIN_LEN
        buffer = ''
        inBurst = false
        leakEl = null
        leakPrior = ''
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
          rememberLeak(e.target)
        } else {
          buffer += e.key
          e.preventDefault()
          e.stopPropagation()
        }
        return
      }

      if (gap <= FAST_MS && buffer) {
        // Second fast key in a row: this is the wand. Pull back the one stray
        // character the first key left in the focused field, keep the first
        // char in the buffer so the routed code is whole, and block the rest.
        buffer += e.key
        inBurst = true
        undoLeak()
        e.preventDefault()
        e.stopPropagation()
      } else {
        // First keypress, or slow human typing: let it type into the focused
        // field as normal, but remember where it went in case this turns into a
        // scan on the very next key.
        buffer = e.key
        rememberLeak(e.target)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active])
}
