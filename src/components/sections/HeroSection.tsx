'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { SplineScene } from '@/components/ui/spline'
import { Spotlight } from '@/components/ui/spotlight'
import { Button } from '@/components/ui/button'
import ProvIntroOverlay from '@/components/prov-intro-overlay'

// Hero redesign: clean dark stage + interactive 3D robot on the right, headline
// on the left. Replaced the old grid/radial-clutter background with a single
// cursor-following gold spotlight to match the robot's aesthetic. Headlines kept.
export default function HeroSection() {
  return (
    <div style={{ position: 'relative' }}>
      <section
        id="hero"
        className="relative w-full overflow-hidden rounded-b-xl bg-[#0a0a0a]
        min-h-[calc(100vh-40px)]
        bg-[radial-gradient(120%_120%_at_80%_0%,#161310_0%,#0a0a0a_45%)]"
      >
        <Spotlight className="-top-20 left-0 md:left-1/3" size={420} />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-40px)] max-w-7xl flex-col items-center gap-4 px-6 py-24 md:flex-row md:gap-8 md:px-10 md:py-0">
          {/* Left — headline */}
          <div className="flex-1 text-center md:text-left">
            <Link href="/how-it-works" className="group inline-flex">
              <span className="mx-auto flex w-fit items-center justify-center rounded-3xl border-2 border-[#FFD700]/20 bg-gradient-to-tr from-[#FFD700]/10 via-[#CA8A04]/5 to-transparent px-5 py-2 text-sm font-medium uppercase tracking-tight text-[#FFD700]">
                The only end-to-end agency automation tool
                <ChevronRight className="ml-2 inline h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>

            <h1 className="mt-6 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-4xl font-semibold leading-[1.05] tracking-tighter text-transparent sm:text-5xl md:text-6xl">
              Agency Founder, Stop Working Like a{' '}
              <span className="bg-gradient-to-b from-[#FFD700] to-[#CA8A04] bg-clip-text text-transparent">
                Data Clerk.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-balance text-lg tracking-tight text-neutral-400 md:mx-0 md:text-xl">
              Prov automates discovery, sponsor matching, outreach, and deal-closing AI.
              You stay the founder, not the data clerk.
            </p>

            <div className="mt-8 flex justify-center md:justify-start">
              <Button
                asChild
                className="h-12 w-fit bg-[#FFD700] text-lg font-medium tracking-tighter text-[#0a0a0a] hover:bg-[#FFC700] md:w-52"
              >
                <a href="/demo">Request a demo</a>
              </Button>
            </div>
          </div>

          {/* Right — interactive robot */}
          <div className="relative h-[340px] w-full flex-1 md:h-[560px]">
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="h-full w-full"
            />
          </div>
        </div>
      </section>

      {/* Intro animation plays on top, then fades to reveal the hero */}
      <ProvIntroOverlay />

      {/* Log in — stays above everything, always clickable */}
      <Link
        href="/login"
        style={{ position: 'absolute', top: 20, right: 20, zIndex: 70, fontSize: 13, fontWeight: 600, color: '#cfcfcf', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 16px', textDecoration: 'none', backdropFilter: 'blur(8px)' }}
      >
        Log in
      </Link>
    </div>
  )
}
