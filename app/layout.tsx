import type { ReactNode } from 'react'
// Inter, self-hosted (weights used across the screens). See handoff/assets/fonts/FONTS.md.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import './globals.css'

export const metadata = {
  title: 'Sale Barn Vet',
  description: 'Regulatory + health work for a beef-cattle vet at a sale barn.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
