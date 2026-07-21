import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { VERTICALS, verticalBySlug } from '@/lib/verticals'
import LandingPage from '@/components/landing/LandingPage'

// ICP expansion: each vertical gets the FULL homepage (robot hero, pipeline
// graph, features, pricing, FAQ) with the copy swapped to that agency type —
// same design, their language. Driven by the shared verticals config.

export function generateStaticParams() {
  return Object.values(VERTICALS).map(v => ({ vertical: v.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ vertical: string }> }): Promise<Metadata> {
  const { vertical } = await params
  const v = verticalBySlug(vertical)
  if (!v) return { title: 'Prov' }
  return { title: `${v.headline} — Prov`, description: v.subheadline }
}

export default async function VerticalLanding({ params }: { params: Promise<{ vertical: string }> }) {
  const { vertical } = await params
  const v = verticalBySlug(vertical)
  if (!v) notFound()
  return <LandingPage vertical={v} />
}
