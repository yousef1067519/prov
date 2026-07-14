import type { MetadataRoute } from 'next'

// Web app manifest — Next.js auto-injects <link rel="manifest"> and serves at /manifest.webmanifest.
// Powers "Add to Home Screen" on mobile with the brand icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Prov',
    short_name: 'Prov',
    description: 'The complete IMA automation platform for agency founders.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
