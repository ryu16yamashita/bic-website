'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!email.endsWith('.edu') && !email.includes('smis.ac.jp')) {
      setError('Please use your school email address.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    router.push(profile?.role === 'manager' ? '/admin/create' : '/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background:'var(--cobalt)'}}>
      {/* Hero */}
      <div className="relative h-56 flex-shrink-0 overflow-hidden">
        <img src="/gym.jpg" alt="SMIS Gym" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <img src="/titans-logo.jpg" alt="Titans" className="w-20 h-20 rounded-full object-cover shadow-2xl" style={{border:'4px solid var(--gold)'}} />
          <h1 className="text-white font-bold text-4xl tracking-widest drop-shadow-xl">BIC</h1>
          <p className="text-yellow-300 text-xs font-semibold tracking-widest uppercase">St. Mary's Basketball Club</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 bg-[#F0F2F8] rounded-t-3xl -mt-6 px-5 pt-7 pb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome back</h2>
        <p className="text-sm text-gray-500 mb-5">Sign in with your school email</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">School email</label>
            <input type="email" className="input-field" placeholder="you@smis.ac.jp"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input-field" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 fade-in">{error}</div>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          No account?{' '}
          <Link href="/register" className="font-semibold" style={{color:'var(--cobalt)'}}>Request access</Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">🔒 Verified school emails only</p>
      </div>
    </div>
  )
}
