'use client'

import { Suspense, lazy } from 'react'
const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
}

// Lazy-loaded Spline 3D scene. Client-only + Suspense so the heavy WebGL runtime
// never blocks first paint — the hero text renders instantly, the robot streams in.
export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FFD700]/30 border-t-[#FFD700]" />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  )
}
