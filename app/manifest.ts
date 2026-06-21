import type { MetadataRoute } from 'next'

// Web app manifest — lets the site install to the home screen and run
// full-screen (no browser bar). ChuteSide palette: navy theme, cream backdrop.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sale Barn Vet',
    short_name: 'Sale Barn Vet',
    description: 'Regulatory + health work for a beef-cattle vet at a sale barn.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F5F5F0',
    theme_color: '#0E2646',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  }
}
