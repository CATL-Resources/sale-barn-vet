'use client'

// The app's own on-screen QWERTY keyboard for the chute capture screen. It docks
// at the bottom and types into whichever capture field has focus. It exists
// because a paired EID wand is a Bluetooth keyboard, and iOS then hides its own
// soft keyboard — leaving no way to type. Key taps go through the field's React
// setter (handed in by the binder), never through synthesised keydown events, so
// the wand scan router is untouched.

import { useState, type CSSProperties, type ReactNode } from 'react'
import { colors, radius } from '@/components/ui/tokens'
import { BackspaceIcon, ChevronUp } from './icons'

type Props = {
  onInsert: (text: string) => void
  onBackspace: () => void
  onDone: () => void
}

type ShiftState = 'off' | 'once' | 'lock'

// The number row sits at the top of the keyboard and is ALWAYS shown — letters
// and numbers live on one screen, so a tag number can be typed without flipping
// to a separate number layer. The crew sees numbers first, every time.
const NUMBER_ROW: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

// Letters layer (below the number row). The tag separators "/" and "-" also sit
// on the bottom row so a mixed tag (e.g. 46MA-12/3) needs no layer flip at all.
const LETTER_ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
  ['layer', '/', '-', 'space', 'done'],
]
// Punctuation layer (below the number row). Digits aren't repeated here — they're
// always available on the number row above.
const SYMBOL_ROWS: string[][] = [
  ['/', '-', ':', ';', '(', ')', '&', '@'],
  ['.', ',', '?', '!', "'", '"', '#', 'backspace'],
  ['layer', '*', '+', 'space', 'done'],
]

const LIGHT = 'rgba(255,255,255,0.18)' // reuse white at low alpha for the dark keys

export function OnScreenKeyboard({ onInsert, onBackspace, onDone }: Props) {
  const [symbols, setSymbols] = useState(false)
  const [shift, setShift] = useState<ShiftState>('off')

  const rows = symbols ? SYMBOL_ROWS : LETTER_ROWS
  const upper = shift !== 'off'

  function tapChar(ch: string) {
    onInsert(upper ? ch.toUpperCase() : ch)
    if (shift === 'once') setShift('off')
  }

  // off -> once (next letter caps) -> lock (caps stays) -> off
  function tapShift() {
    setShift((s) => (s === 'off' ? 'once' : s === 'once' ? 'lock' : 'off'))
  }

  function onTap(token: string) {
    // Digits insert as-is and never disturb the Shift state (they're the same
    // upper or lower, and shouldn't eat a one-shot Shift meant for a letter).
    if (/^[0-9]$/.test(token)) return onInsert(token)
    switch (token) {
      case 'shift':
        return tapShift()
      case 'backspace':
        return onBackspace()
      case 'space':
        return onInsert(' ')
      case 'done':
        return onDone()
      case 'layer':
        return setSymbols((s) => !s)
      default:
        return tapChar(token)
    }
  }

  function weight(token: string): number {
    if (token === 'space') return 5
    if (token === 'shift' || token === 'backspace' || token === 'layer' || token === 'done') return 1.6
    return 1
  }

  function label(token: string): ReactNode {
    switch (token) {
      case 'shift':
        return <ChevronUp size={20} color={shift !== 'off' ? colors.navy : colors.white} sw={2.6} />
      case 'backspace':
        return <BackspaceIcon size={22} color={colors.white} sw={2} />
      case 'space':
        return <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>space</span>
      case 'done':
        return 'Done'
      case 'layer':
        return symbols ? 'ABC' : '#+='
      default:
        return upper ? token.toUpperCase() : token
    }
  }

  function keyStyle(token: string): CSSProperties {
    const base: CSSProperties = {
      flex: weight(token),
      minWidth: 0,
      height: 50,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.field,
      border: 'none',
      fontFamily: 'inherit',
      fontSize: 18,
      fontWeight: 700,
      cursor: 'pointer',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      touchAction: 'manipulation',
      padding: 0,
    }
    if (token === 'done') return { ...base, background: colors.gold, color: colors.navy, fontWeight: 800, fontSize: 16 }
    if (token === 'shift') return { ...base, background: shift !== 'off' ? colors.teal : LIGHT, color: colors.white }
    if (token === 'backspace' || token === 'space' || token === 'layer')
      return { ...base, background: LIGHT, color: colors.white, fontSize: 15 }
    return { ...base, background: colors.white, color: colors.navy }
  }

  return (
    <div
      role="group"
      aria-label="On-screen keyboard"
      style={{
        flexShrink: 0,
        background: colors.navy,
        padding: '7px 5px calc(7px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        boxShadow: '0 -8px 20px rgba(8,18,40,0.28)',
      }}
    >
      {[NUMBER_ROW, ...rows].map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          {row.map((token) => (
            <button
              key={token}
              type="button"
              aria-label={token}
              // Act on pointer-down and prevent the default focus change: this
              // keeps the focused input focused (so its value update lands there
              // and the caret stays), and registers the tap reliably on touch
              // without relying on a click that focus-stealing could suppress.
              onPointerDown={(e) => {
                e.preventDefault()
                onTap(token)
              }}
              style={keyStyle(token)}
            >
              {label(token)}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
