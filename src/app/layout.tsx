import type { Metadata } from 'next'
import { Inter, Space_Grotesk, Geist, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import MetaPixel from '@/components/MetaPixel'

// Body: Inter. Display: Space Grotesk. Hero: Geist. Mono: JetBrains Mono
// (terminal/pipeline labels on the marketing site).
const inter = Inter({ subsets: ['latin'], variable: '--font-sans-loaded', display: 'swap' })
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display-loaded',
  display: 'swap',
})
const geist = Geist({ subsets: ['latin'], variable: '--font-geist-loaded', display: 'swap' })
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono-loaded',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Prov — The fastest path from brief to booked creator.',
  description: 'Enterprise platform for influencer marketing agencies: curated discovery, team-standardized outreach, contracts, compliance, and deal intelligence your agency owns forever.',
  keywords: 'influencer marketing agency platform, creator sponsorship pipeline, agency deal intelligence, FTC compliance tracking, influencer contracts',
  openGraph: {
    title: 'Prov — The fastest path from brief to booked creator.',
    description: 'The sponsorship pipeline, run end to end — and every completed deal becomes intelligence your agency owns.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${geist.variable} ${jetbrains.variable}`}>
      <body style={{ background: '#0a0a0a', color: '#f5f5f5' }}>
        <MetaPixel />
        {children}
      </body>
    </html>
  )
}
