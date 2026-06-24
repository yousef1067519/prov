import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

// Body: Inter (clean, readable). Display: Space Grotesk — premium modern-agency
// pairing per UI/UX Pro Max "Premium Sans" recommendation for SaaS/agencies.
const inter = Inter({ subsets: ['latin'], variable: '--font-sans-loaded', display: 'swap' })
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display-loaded',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Prov — Stop Cold-Emailing. Start Closing Deals.',
  description: 'The complete IMA automation platform for agency founders. Find creators, match sponsors, generate emails, and close deals with AI — all in minutes.',
  keywords: 'influencer marketing agency, IMA automation, creator outreach, sponsor matching, AI email assistant, influencer database',
  openGraph: {
    title: 'Prov — Stop Cold-Emailing. Start Closing Deals.',
    description: 'Automate your entire influencer marketing workflow. 30-day free trial, then $299/month.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body style={{ background: '#0a0a0a', color: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  )
}
