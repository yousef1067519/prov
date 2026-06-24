'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function Nav() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null))
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => { subscription.unsubscribe(); window.removeEventListener('scroll', onScroll) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(10,10,10,0.95)' : 'transparent',
        borderBottom: scrolled ? '1px solid #1f1f1f' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="Prov" width={100} height={40} style={{ objectFit: 'contain' }} priority />
        </Link>

        {/* Desktop nav — bracketed style */}
        <div className="hidden md:flex items-center gap-7">
          {[['How it works', '#how-it-works'], ['Pricing', '#pricing'], ['FAQ', '#faq']].map(([l, h]) => (
            <a key={l} href={h} className="text-sm transition-colors" style={{ color: '#888', fontFamily: 'var(--font-display)', letterSpacing: '0.04em', fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#FFD700')}
              onMouseLeave={e => (e.currentTarget.style.color = '#888')}>
              <span style={{ color: '#FFD700', opacity: 0.5 }}>[ </span>{l}<span style={{ color: '#FFD700', opacity: 0.5 }}> ]</span>
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="btn-outline-gold text-sm py-2 px-4">Dashboard</Link>
              <button onClick={signOut} className="text-sm" style={{ color: '#888' }}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm transition-colors" style={{ color: '#888' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.color = '#888')}>
                Sign in
              </Link>
              <Link href="/trial" className="btn-gold text-sm py-2.5 px-5">Start Free Trial</Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2" style={{ color: '#888' }} onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: '#111', borderTop: '1px solid #1f1f1f' }} className="md:hidden px-6 py-4 flex flex-col gap-4">
          {[['Features', '#features'], ['Pricing', '#pricing'], ['FAQ', '#faq']].map(([l, h]) => (
            <a key={l} href={h} className="text-sm" style={{ color: '#888' }} onClick={() => setOpen(false)}>{l}</a>
          ))}
          <Link href="/trial" className="btn-gold text-sm w-full text-center py-3" onClick={() => setOpen(false)}>
            Start Free Trial
          </Link>
        </div>
      )}
    </nav>
  )
}
