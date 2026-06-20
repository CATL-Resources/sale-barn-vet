import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
// Inter, self-hosted (weights used across the screens). See handoff/assets/fonts/FONTS.md.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sale Barn Vet',
  description: 'Regulatory + health work for a beef-cattle vet at a sale barn.',
  applicationName: 'Sale Barn Vet',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
  // Run chromeless from the iOS home screen: capable + a translucent status bar
  // (white text) that sits over the navy header. The apple-touch-icon comes
  // from app/apple-icon.tsx.
  appleWebApp: {
    capable: true,
    title: 'Sale Barn Vet',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#0E2646',
  width: 'device-width',
  initialScale: 1,
  // Draw under the notch / status bar so the app runs truly edge-to-edge.
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
