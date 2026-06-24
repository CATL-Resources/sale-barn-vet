'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type KeyboardMode = 'app' | 'native' | 'unknown'

const STORAGE_KEY = 'sbv.capture.keyboardMode'
// How far the visual viewport must shrink (px) for us to call it "the native
// keyboard came up".
const NATIVE_SHRINK_PX = 120
// How long we wait for the native keyboard before deciding it isn't coming.
const DETECT_MS = 250

type ActiveField = { key: string; getValue: () => string; setValue: (v: string) => void }
type FieldProps = { inputMode: 'none' | undefined; onFocus: () => void }

/**
 * Drives the in-app on-screen keyboard for the capture screen.
 *
 * Why this exists: a paired EID wand is a Bluetooth keyboard (HID), and iOS then
 * hides its own on-screen keyboard — so without an app keyboard the crew can't
 * type in the alley. This hook decides, per device, whether the native keyboard
 * actually shows; if it doesn't, it brings up our own and remembers the choice.
 *
 * It never synthesises keydown events (those would confuse the wand scan
 * router). Key taps write straight through each field's own React state setter,
 * so it works for any field the config renders — current or future.
 */
export function useOnScreenKeyboard() {
  const [mode, setModeState] = useState<KeyboardMode>('unknown')
  const [open, setOpen] = useState(false)
  const [focusedKey, setFocusedKey] = useState<string | null>(null)

  // The field the keyboard is currently typing into, kept fresh on every render
  // so a key tap edits the live value, not the one captured when it was focused.
  const active = useRef<ActiveField | null>(null)
  // Cancels an in-flight native-keyboard detection.
  const cancelDetect = useRef<(() => void) | null>(null)

  // Refs the render-time binder reads without re-creating the binder each render.
  const modeRef = useRef(mode)
  modeRef.current = mode
  const focusedKeyRef = useRef(focusedKey)
  focusedKeyRef.current = focusedKey

  // Restore the remembered mode once on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === 'app' || saved === 'native') setModeState(saved)
    } catch {
      /* storage blocked — stay 'unknown' */
    }
  }, [])

  // Cancel any pending detection on unmount.
  useEffect(() => () => cancelDetect.current?.(), [])

  const setMode = useCallback((m: KeyboardMode) => {
    setModeState(m)
    try {
      if (m !== 'unknown') window.localStorage.setItem(STORAGE_KEY, m)
    } catch {
      /* ignore */
    }
  }, [])

  // What to do when a capture field gains focus.
  const onFieldFocus = useCallback(() => {
    cancelDetect.current?.()
    if (modeRef.current === 'app') {
      setOpen(true)
      return
    }
    // 'unknown' or 'native': watch the viewport. If it shrinks quickly the
    // native keyboard is up — keep ours down. If nothing shrinks within the
    // window, the native keyboard is suppressed (wand paired) — bring ours up.
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return // can't tell — leave the native keyboard to do its thing
    const startH = vv.height
    let settled = false
    const finish = (native: boolean) => {
      if (settled) return
      settled = true
      cleanup()
      setMode(native ? 'native' : 'app')
      setOpen(!native)
    }
    const onResize = () => {
      if (vv.height < startH - NATIVE_SHRINK_PX) finish(true)
    }
    const timer = window.setTimeout(() => finish(false), DETECT_MS)
    const cleanup = () => {
      vv.removeEventListener('resize', onResize)
      window.clearTimeout(timer)
      cancelDetect.current = null
    }
    vv.addEventListener('resize', onResize)
    cancelDetect.current = cleanup
  }, [setMode])

  /**
   * Bind a field to the keyboard. Call during render for each editable input,
   * spreading the result onto it. Returns onFocus + inputMode only — the input
   * keeps its own value/onChange, so the keyboard reuses the existing update
   * path (patchDraft / the field's setter). Generic: any field that calls this
   * works, no hardcoded list.
   */
  const bind = (key: string, value: string, setValue: (v: string) => void): FieldProps => {
    if (focusedKeyRef.current === key) {
      active.current = { key, getValue: () => value, setValue }
    }
    return {
      inputMode: modeRef.current === 'app' ? 'none' : undefined,
      onFocus: () => {
        active.current = { key, getValue: () => value, setValue }
        setFocusedKey(key)
        onFieldFocus()
      },
    }
  }

  const insert = useCallback((text: string) => {
    const f = active.current
    if (f) f.setValue(f.getValue() + text)
  }, [])

  const backspace = useCallback(() => {
    const f = active.current
    if (f) f.setValue(f.getValue().slice(0, -1))
  }, [])

  const dismiss = useCallback(() => {
    setOpen(false)
    if (typeof document !== 'undefined') (document.activeElement as HTMLElement | null)?.blur?.()
  }, [])

  // The always-visible toggle. Up forces our keyboard (remembers 'app'); down
  // forces it away (remembers 'native').
  const toggle = useCallback(() => {
    setOpen((wasOpen) => {
      if (wasOpen) {
        setMode('native')
        if (typeof document !== 'undefined') (document.activeElement as HTMLElement | null)?.blur?.()
        return false
      }
      setMode('app')
      return true
    })
  }, [setMode])

  return { mode, open, focusedKey, bind, insert, backspace, dismiss, toggle }
}

export type OnScreenKeyboardApi = ReturnType<typeof useOnScreenKeyboard>
