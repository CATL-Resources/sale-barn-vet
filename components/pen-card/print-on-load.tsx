'use client'

import { useEffect } from 'react'

// Opens the browser print dialog once the label has rendered. A short delay
// lets the web font settle so the label measures right before printing.
export function PrintOnLoad() {
  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 350)
    return () => window.clearTimeout(t)
  }, [])
  return null
}
