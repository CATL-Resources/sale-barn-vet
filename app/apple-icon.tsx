import { ImageResponse } from 'next/og'

// iOS home-screen icon (apple-touch-icon). A solid navy square — iOS rounds the
// corners itself, so no transparency or radius here. Generated as a PNG.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0E2646',
          color: '#F3D12A',
          fontSize: 86,
          fontWeight: 800,
          letterSpacing: -4,
        }}
      >
        SBV
      </div>
    ),
    { ...size },
  )
}
