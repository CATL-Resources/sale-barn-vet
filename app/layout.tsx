import type { ReactNode } from 'react'

export const metadata = {
  title: 'Sale Barn Vet',
  description: 'Regulatory + health work for a beef-cattle vet at a sale barn.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  )
}
