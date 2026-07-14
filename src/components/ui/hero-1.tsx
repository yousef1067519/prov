"use client"

import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

// hero-1 (from prompt) — same structure, recolored to Prov dark/gold because
// the app runs always-dark (no Tailwind `dark:` class is toggled).
interface HeroProps {
  eyebrow?: string
  eyebrowHref?: string
  title: ReactNode
  subtitle: string
  ctaLabel?: string
  ctaHref?: string
}

export function Hero({
  eyebrow = "Innovate Without Limits",
  eyebrowHref = "#",
  title,
  subtitle,
  ctaLabel = "Explore Now",
  ctaHref = "#",
}: HeroProps) {
  return (
    <section
      id="hero"
      className="relative mx-auto w-full pt-40 px-6 text-center md:px-8
      min-h-[calc(100vh-40px)] overflow-hidden
      bg-[linear-gradient(to_bottom,#0a0a0a,#0a0a0a_55%,#161310_92%)]
      rounded-b-xl"
    >
      {/* Grid BG */}
      <div
        className="absolute -z-10 inset-0 opacity-80 h-[600px] w-full
        bg-[linear-gradient(to_right,#1c1c1c_1px,transparent_1px),linear-gradient(to_bottom,#1c1c1c_1px,transparent_1px)]
        bg-[size:6rem_5rem]
        [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"
      />

      {/* Radial Accent — gold instead of the template's white/black */}
      <div
        className="absolute left-1/2 top-[calc(100%-90px)] lg:top-[calc(100%-150px)]
        h-[500px] w-[700px] md:h-[500px] md:w-[1100px] lg:h-[750px] lg:w-[140%]
        -translate-x-1/2 rounded-[100%]
        bg-[radial-gradient(closest-side,#0a0a0a_78%,#CA8A04)]
        animate-fade-up"
      />

      {/* Eyebrow */}
      {eyebrow && (
        <a href={eyebrowHref} className="group">
          <span
            className="text-sm text-[#FFD700] font-geist mx-auto px-5 py-2
            bg-gradient-to-tr from-[#FFD700]/10 via-[#CA8A04]/5 to-transparent
            border-[2px] border-[#FFD700]/20
            rounded-3xl w-fit tracking-tight uppercase flex items-center justify-center"
          >
            {eyebrow}
            <ChevronRight className="inline w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </a>
      )}

      {/* Title — Geist font (from prompt), Prov coloring (white + gold accent) */}
      <h1
        className="animate-fade-in font-geist -translate-y-4 text-balance
        py-6 text-4xl font-semibold leading-[1.05] tracking-tighter
        text-white opacity-0 sm:text-5xl md:text-6xl lg:text-7xl"
      >
        {title}
      </h1>

      {/* Subtitle */}
      <p
        className="animate-fade-in mb-12 -translate-y-4 text-balance
        text-lg tracking-tight text-gray-400
        opacity-0 md:text-xl mx-auto max-w-2xl"
      >
        {subtitle}
      </p>

      {/* CTA */}
      {ctaLabel && (
        <div className="flex justify-center">
          <Button
            asChild
            className="mt-[-20px] w-fit md:w-52 z-20 font-geist tracking-tighter text-center text-lg
            bg-[#FFD700] text-[#0a0a0a] hover:bg-[#FFC700] h-12"
          >
            <a href={ctaHref}>{ctaLabel}</a>
          </Button>
        </div>
      )}

      {/* Bottom Fade */}
      <div
        className="animate-fade-up relative mt-32 opacity-0 [perspective:2000px]
        after:absolute after:inset-0 after:z-50
        after:[background:linear-gradient(to_top,#0a0a0a_10%,transparent)]"
      />
    </section>
  )
}

export default Hero
