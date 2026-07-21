import AgencyIntro from '@/components/AgencyIntro'
import LandingPage from '@/components/landing/LandingPage'

// Homepage = the shared landing page with generic copy. First-time visitors get
// the AgencyIntro overlay asking what kind of agency they run; picking one sends
// them to /for/<slug>, which renders the SAME page with that vertical's copy.
export default function HomePage() {
  return (
    <>
      <AgencyIntro />
      <LandingPage />
    </>
  )
}
