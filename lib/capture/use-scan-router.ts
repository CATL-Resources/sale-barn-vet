'use client'

import { useEffect, useRef } from 'react'
import {
  isEid,
  isBackTagBody,
  backTagBodyCanExtend,
  eidCanExtend,
  BACK_TAG_PREFIX,
} from './scan-format'

/**
 * Set an <input>/<textarea> value so React's onChange notices. Used by the safety
 * flush to drop a burst that never formed a clean shape into the focused field
 * (React tracks the value itself, so a plain assignment is ignored — we go through
 * the native setter and fire an input event).
 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Screen-level wand scan capture for the chute. Both scanners are Bluetooth HID
 * keyboard-wedge devices: a fast burst of single keydowns into whatever field has
 * focus, ending in Enter. There is no device id on a keydown, so two scanners
 * can't be told apart by source alone.
 *
 * OUT-OF-BAND ASSEMBLY. Unlike the old catcher, raw scan characters never land in
 * a field. The moment a machine-speed burst is detected (the second key arrives
 * within the per-key gap), every key is intercepted (preventDefault) into a hidden
 * buffer; only a COMPLETE, shape-validated code is handed to `onScan`, which routes
 * and writes it. This kills the "characters appear then vanish" flicker and stops
 * a garbled or interleaved burst from ever spilling into the field.
 *
 * Two assemblers run in parallel on the bare (non-bracketed) stream — a 15-digit
 * EID and an 8-char back-tag body — each fed every character it can validly extend,
 * committing the instant one completes. So a back tag with no prefix still routes,
 * and two codes that can't be separated complete neither and raise a rescan instead
 * of a corrupt save.
 *
 * BACK-TAG BRACKET. The back-tag scanner wraps its code: "$" + 8-char body + CR.
 * The "$" opens a bracketed capture collected until the carriage return; the body
 * is validated against the exact pattern and committed (or rescanned on a mismatch).
 * Because "$" is neither a digit nor a letter, the back tag is self-identifying even
 * right behind an EID.
 *
 * POST-COMMIT COOLDOWN. After any code commits, a burst that starts within the
 * cooldown window is still assembled but only routed if it is a DIFFERENT code;
 * a repeat of the just-committed code, or a partial that never forms a shape, is
 * dropped (not flushed). That kills the double-fire / repeat-stream partial — whose
 * echo lands ~160ms behind — without eating a genuine second scan of a different
 * tag (a real second scan needs human reaction time and forms a different code).
 *
 * SAFETY FLUSH. If an intercepted burst does not form a valid shape within a short
 * timeout (and it isn't double-fire debris), the raw buffer is flushed into the
 * field so nothing is ever lost on a slow tablet. A slow / human-typed key is
 * detected on the first gap and passes through untouched.
 *
 * A normal single scan still commits on shape-match within its own burst, with no
 * added latency — the cooldown and the buffer only change the double-fire, overflow,
 * and simultaneous cases.
 */
export function useScanRouter(onScan: (code: string) => void, active: boolean) {
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!active) return

    // --- Tunables -----------------------------------------------------------
    // A machine burst averages well under this per key, even on a slow tablet;
    // no one hand-types a long code this fast, so it tells a wand from a person.
    const AVG_GAP_MAX = 80
    // Silence this long ends a run — a new, separate entry has begun.
    const END_MS = 400
    // While still deciding if the first key is a wand or a person, how long we
    // hold that one key before deciding "person" and letting it through.
    const DECIDE_MS = 120
    // A recognised machine burst that never forms a clean shape is flushed to the
    // field after this, so a garbled read is never lost.
    const SAFETY_FLUSH_MS = 350
    // After a commit, how long a fresh burst is treated as possible double-fire
    // debris (routed only if it's a different code). Tunable 150-300; 200 covers
    // the ~160ms echo while staying under human reaction time.
    const SCAN_COOLDOWN_MS = 200
    // A hard cap on a non-bracketed burst that never resolves to a shape.
    const MAX_RUN = 32

    // --- Run state ----------------------------------------------------------
    let phase: 'idle' | 'pending' | 'burst' | 'backtag' | 'passthrough' = 'idle'
    let raw = '' // every intercepted character this run (for the safety flush)
    let eid = '' // EID candidate: the digits so far, kept a valid EID prefix
    let bt = '' // back-tag body candidate: kept a valid body-pattern prefix
    let startTime = 0
    let lastTime = 0
    let field: HTMLInputElement | HTMLTextAreaElement | null = null
    let runInCooldown = false // did this run start inside the post-commit window?
    let cooldownUntil = 0
    let lastCode = '' // the code the last commit routed (to spot a repeat)
    let pendingEnterSwallow = false
    let timer = 0

    const activeEl = (): HTMLInputElement | HTMLTextAreaElement | null => {
      const el = typeof document !== 'undefined' ? document.activeElement : null
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el : null
    }
    const arm = (ms: number) => {
      clearTimeout(timer)
      timer = window.setTimeout(onTimeout, ms)
    }
    const disarm = () => {
      clearTimeout(timer)
      timer = 0
    }
    function reset() {
      phase = 'idle'
      raw = ''
      eid = ''
      bt = ''
      startTime = 0
      lastTime = 0
      field = null
      runInCooldown = false
      disarm()
    }
    function flushToField() {
      const el = field ?? activeEl()
      if (el && raw) {
        try {
          setNativeValue(el, el.value + raw)
        } catch {
          /* field went away — nothing to flush */
        }
      }
    }
    // A run produced no clean shape. Double-fire debris (started in cooldown) is
    // dropped silently so no partial reaches the field; a real machine burst that
    // didn't match is sent on as a rescan; slow/human input is flushed so it's kept.
    function finishNoShape(fastBurst: boolean) {
      const inCooldown = runInCooldown
      if (inCooldown) {
        reset()
        cooldownUntil = performance.now() + SCAN_COOLDOWN_MS
        return
      }
      if (fastBurst) {
        const garbled = raw
        reset()
        cooldownUntil = performance.now() + SCAN_COOLDOWN_MS
        onScanRef.current(garbled)
      } else {
        flushToField()
        reset()
      }
    }
    function commitCode(code: string) {
      // A repeat of the just-committed code arriving in the cooldown window is a
      // double-fire — drop it. A different code is a genuine second scan — route it.
      if (runInCooldown && code === lastCode) {
        reset()
        cooldownUntil = performance.now() + SCAN_COOLDOWN_MS
        return
      }
      lastCode = code
      reset()
      pendingEnterSwallow = true
      cooldownUntil = performance.now() + SCAN_COOLDOWN_MS
      onScanRef.current(code)
    }
    function onTimeout() {
      if (phase === 'pending') {
        // Only the first key, no fast follow — a person. Let it land, pass through.
        if (runInCooldown) {
          reset()
        } else {
          flushToField()
          reset()
          phase = 'passthrough'
        }
        return
      }
      if (phase === 'burst' || phase === 'backtag') finishNoShape(true)
    }

    // Feed one character to the EID + back-tag-body candidates (the bare stream).
    // Each candidate takes the character only if it can validly extend; a character
    // that fits neither is kept only in `raw`. Commits and returns true the instant
    // a candidate completes its shape.
    function feedCandidates(c: string): boolean {
      if (/\d/.test(c) && eidCanExtend(eid + c)) {
        eid += c
        if (eid.length === 15 && isEid(eid)) {
          commitCode(eid)
          return true
        }
      }
      if (backTagBodyCanExtend(bt + c)) {
        bt += c
        if (bt.length === 8 && isBackTagBody(bt)) {
          commitCode(bt)
          return true
        }
      }
      return false
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const now = performance.now()

      if (e.key === 'Enter') {
        if (phase === 'backtag') {
          e.preventDefault()
          e.stopPropagation()
          if (isBackTagBody(bt)) commitCode(bt)
          else finishNoShape(true)
          return
        }
        if (phase === 'burst' || phase === 'pending') {
          e.preventDefault()
          e.stopPropagation()
          const span = lastTime - startTime
          const avgGap = raw.length > 1 ? span / (raw.length - 1) : Infinity
          finishNoShape(raw.length >= 1 && avgGap <= AVG_GAP_MAX)
          return
        }
        // Idle / passthrough: the wand's trailing Enter (and any echo Enter) lands
        // in the cooldown window — swallow it so it can't submit a form or advance.
        if (now < cooldownUntil) {
          e.preventDefault()
          e.stopPropagation()
          pendingEnterSwallow = false
          return
        }
        // A person's Enter, well clear of any scan — leave it alone.
        pendingEnterSwallow = false
        if (phase === 'passthrough') phase = 'idle'
        return
      }

      if (e.key.length !== 1) return // ignore Shift, Tab, arrows, Backspace, etc.
      const c = e.key
      const gap = lastTime ? now - lastTime : Infinity

      // A real idle gap ends a stale passthrough so a fresh burst can be caught.
      if (gap > END_MS && phase === 'passthrough') phase = 'idle'

      // BACK-TAG BRACKET: the scanner's "$" prefix opens a bracketed capture,
      // whatever had focus. Self-identifying — "$" never collides with a code.
      if (c === BACK_TAG_PREFIX && (phase === 'idle' || phase === 'passthrough')) {
        e.preventDefault()
        e.stopPropagation()
        runInCooldown = now < cooldownUntil
        phase = 'backtag'
        bt = ''
        eid = ''
        raw = c
        field = activeEl()
        startTime = now
        lastTime = now
        arm(SAFETY_FLUSH_MS)
        return
      }

      if (phase === 'backtag') {
        e.preventDefault()
        e.stopPropagation()
        lastTime = now
        raw += c
        // The body is exactly 8 chars; a 9th before the CR, or a char that breaks
        // the pattern, means a malformed/interleaved capture — rescan, never route.
        if (bt.length >= 8 || !backTagBodyCanExtend(bt + c)) {
          finishNoShape(true)
          return
        }
        bt += c
        arm(SAFETY_FLUSH_MS)
        return
      }

      if (phase === 'passthrough') {
        // A person typing on a hardware keyboard — let it land untouched.
        lastTime = now
        return
      }

      if (phase === 'idle') {
        // First key of a possible burst. Hold it — nothing lands yet — and decide
        // on the next key: fast follow means a wand, slow/none means a person.
        e.preventDefault()
        e.stopPropagation()
        runInCooldown = now < cooldownUntil
        phase = 'pending'
        raw = c
        eid = ''
        bt = ''
        field = activeEl()
        startTime = now
        lastTime = now
        feedCandidates(c)
        arm(DECIDE_MS)
        return
      }

      if (phase === 'pending') {
        lastTime = now
        if (gap <= AVG_GAP_MAX) {
          // Machine speed confirmed — a burst. Keep intercepting.
          e.preventDefault()
          e.stopPropagation()
          phase = 'burst'
          raw += c
          if (feedCandidates(c)) return
          arm(SAFETY_FLUSH_MS)
        } else if (runInCooldown) {
          // Slow straggler in the cooldown window — drop it (no field spill).
          e.preventDefault()
          e.stopPropagation()
          reset()
        } else {
          // Slow — a person. Flush the held first key and pass the rest through.
          flushToField()
          reset()
          phase = 'passthrough'
          lastTime = now
          // Do not preventDefault — let this key land.
        }
        return
      }

      if (phase === 'burst') {
        e.preventDefault()
        e.stopPropagation()
        lastTime = now
        raw += c
        if (feedCandidates(c)) return
        if (raw.length > MAX_RUN) {
          finishNoShape(true)
          return
        }
        arm(SAFETY_FLUSH_MS)
        return
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      disarm()
    }
  }, [active])
}
