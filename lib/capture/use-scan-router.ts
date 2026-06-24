'use client'

import { useEffect, useRef } from 'react'
import { isEid, isBackTag } from './scan-format'

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
 * Screen-level scan capture, built so it can never drop a digit and so two
 * people scanning the same animal at once don't clobber each other.
 *
 * A keyboard-wedge wand types a fast burst of characters then Enter, into
 * whatever field has focus. The hard lesson from the chute: any scheme that
 * BLOCKS the wand's keys mid-burst and rebuilds the number from a copy is
 * fragile — on a slower tablet one late or missed key and the number comes back
 * as a single digit (or split in two). So we let every character land in the
 * focused field as it arrives and quietly keep a timed copy.
 *
 * COMMIT ON SHAPE MATCH, not just Enter. After each character we test the copy:
 * the moment it forms a COMPLETE tag — a 15-digit EID or an 8-char back tag —
 * we commit it right away. We wipe the characters it dropped into the focused
 * field and hand the whole code to `onScan` to be routed by its shape, then
 * start a fresh copy for whatever comes next. We do NOT wait for Enter. This is
 * what splits a combined burst: when two wands fire on one animal and the codes
 * run together (a back tag then an EID, back to back), the back tag commits at
 * char 8 and the EID commits 15 chars later, each landing in its own field
 * instead of one cutting the other off.
 *
 * Enter is kept only as a fallback delimiter: anything that came in as a fast
 * machine burst but never matched a clean shape is handed to `onScan` on Enter
 * so it can be flagged for a re-scan (see below).
 *
 * Two PERFECTLY simultaneous bursts — chars from both wands interleaved into one
 * stream — can't be pulled apart here: a browser keydown carries no device id,
 * so there's no way to tell which wand a character came from. The interleaved
 * copy never forms a clean shape, so it intentionally falls through to the
 * re-scan flag rather than guessing. In practice the two wands are a hair apart
 * and arrive back-to-back, which the shape-match split handles.
 *
 * Because we never block a key until we KNOW we have a whole tag, the digits are
 * never lost: worst case the burst just isn't recognised and the number stays in
 * the box for the normal Save path — you can't be left with one digit.
 */
export function useScanRouter(onScan: (code: string) => void, active: boolean) {
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!active) return

    let buffer = ''
    let startTime = 0 // when the current run of characters began
    let lastTime = 0 // when the last character arrived
    // Every field this run's characters landed in, mapped to that field's value
    // BEFORE the run touched it, so a recognised scan can be wiped back out of
    // each one. It's a set of fields, not a single field, because committing one
    // tag mid-burst (a back tag) can move focus, so the next tag's characters
    // (the EID right behind it) can land in a DIFFERENT box — we have to be able
    // to clean every box the burst leaked into, not just the first.
    let leaks = new Map<HTMLInputElement | HTMLTextAreaElement, string>()
    // After a shape-match commit the wand still sends its trailing Enter; we
    // swallow that one Enter so it can't submit a form or add a newline.
    let pendingEnterSwallow = false
    let lastCommitTime = 0

    // Silence this long between keys means a new, separate entry has started, so
    // we begin a fresh run. Generous, so one slow key on a busy tablet never
    // splits a single scan in two.
    const END_MS = 400
    // A machine burst averages well under this many ms per key, even on a slow
    // tablet with the odd stalled key; no one hand-types a long code this fast,
    // so it cleanly tells a wand from a person.
    const AVG_GAP_MAX = 80
    const MIN_LEN = 4 // shortest run we'll treat as a scan (a back tag barcode)

    // Record a field the run's characters are landing in, the first time we see
    // it, with the value it held BEFORE this run — that's what we restore it to.
    // (keydown fires before the character lands, so el.value here is the prior.)
    function noteLeak(target: EventTarget | null) {
      const el = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : null
      if (el && !leaks.has(el)) leaks.set(el, el.value)
    }
    // Wipe a recognised scan's characters back out of every field they leaked
    // into, restoring each to the value it had before the burst. We only touch
    // fields this burst actually wrote to (and only if they're still mounted), so
    // we never clobber an unrelated or hand-typed field. Worst case a field went
    // away mid-burst and there's nothing to wipe — we never drop a digit.
    function wipeLeaks() {
      for (const [el, prior] of leaks) {
        if (!el.isConnected) continue
        try {
          setNativeValue(el, prior)
        } catch {
          /* field went away — nothing to wipe */
        }
      }
      leaks.clear()
    }
    function reset() {
      buffer = ''
      leaks.clear()
      // Clear the timing too, so no gap/average state bleeds from one burst into
      // the next back-to-back scan.
      startTime = 0
      lastTime = 0
    }

    // Has the running copy formed a whole tag at machine speed? If so, commit it
    // now. Only fast bursts auto-commit, so a person hand-typing a tag into a
    // field is never wiped out from under them (a wand is far faster than any
    // human). Returns true when it committed (the caller then drops the key that
    // completed the shape, so it doesn't land after we've wiped the field).
    function tryShapeCommit(): boolean {
      if (!isEid(buffer) && !isBackTag(buffer)) return false
      const span = lastTime - startTime
      const avgGap = buffer.length > 1 ? span / (buffer.length - 1) : Infinity
      if (avgGap > AVG_GAP_MAX) return false
      const code = buffer
      wipeLeaks()
      reset()
      pendingEnterSwallow = true
      lastCommitTime = performance.now()
      onScanRef.current(code)
      return true
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'Enter') {
        // The wand's trailing Enter right after a shape-match commit: swallow it
        // so it can't submit a form or drop a newline.
        if (!buffer && pendingEnterSwallow && performance.now() - lastCommitTime <= END_MS) {
          e.preventDefault()
          e.stopPropagation()
          pendingEnterSwallow = false
          return
        }
        const code = buffer
        const span = lastTime - startTime
        const avgGap = code.length > 1 ? span / (code.length - 1) : Infinity
        const wasBurst = code.length >= MIN_LEN && avgGap <= AVG_GAP_MAX
        pendingEnterSwallow = false
        if (wasBurst) {
          // A fast machine burst that never matched a clean shape (e.g. two wands
          // interleaved into garbage). Don't let the Enter submit or add a
          // newline; wipe what it leaked and hand it on so it's flagged for a
          // re-scan rather than dropped into the wrong field.
          e.preventDefault()
          e.stopPropagation()
          wipeLeaks()
          reset()
          onScanRef.current(code)
        } else {
          // A person pressed Enter — leave their typing in place and let the Enter
          // through untouched.
          reset()
        }
        return
      }

      if (e.key.length !== 1) return // ignore Shift, Tab, arrows, Backspace, etc.

      const now = performance.now()
      const gap = now - lastTime
      lastTime = now

      if (!buffer || gap > END_MS) {
        // First key, or a real pause since the last one: this starts a fresh
        // run. Forget any earlier run's leak fields and note where this one is
        // landing. We never block the key — it types in as normal.
        buffer = e.key
        startTime = now
        leaks.clear()
        pendingEnterSwallow = false // a new run began
      } else {
        // Another key right behind the last: same run. Still never blocked.
        buffer += e.key
      }
      // Track the field this character is landing in (the first time we see it)
      // so a recognised scan can be wiped back out of every box it touched.
      noteLeak(e.target)

      // Test the running copy after every character: the moment it forms a whole
      // EID or back tag (at machine speed), commit it now instead of waiting for
      // Enter. Drop the key that completed the shape so it doesn't land in the
      // field after we've already wiped it.
      if (tryShapeCommit()) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active])
}
