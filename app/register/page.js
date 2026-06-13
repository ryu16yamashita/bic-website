'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (!email.endsWith('.edu') && !email.includes('smis.ac.jp')) { setError('Please use your school email address.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (data.user) await supabase.from('profiles').insert({ id: data.user.id, full_name: name, email, role: 'player' })
    setSuccess(true)
    setLoading(false)
  }

  if (success) return (
    <div className="min-h-screen flex flex-col" style={{background:'var(--cobalt)'}}>
      <div className="relative h-40 flex-shrink-0 overflow-hidden">
        <img src="/gym.jpg" alt="Gym" className="w-full h-full object-cover opacity-40" />
      </div>
      <div className="flex-1 bg-[#F0F2F8] rounded-t-3xl -mt-6 px-5 pt-8 text-center">
        <p className="text-4xl mb-3">📧</p>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-sm text-gray-500 mb-6">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
        <Link href="/login" className="btn-primary inline-block">Back to sign in</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{background:'var(--cobalt)'}}>
      <div className="relative h-40 overflow-hidden flex-shrink-0">
        <img src="/gym.jpg" alt="Gym" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <img src="/titans-logo.jpg" alt="Titans" className="w-12 h-12 rounded-full object-cover" style={{border:'3px solid var(--gold)'}} />
          <h1 className="text-white font-bold text-xl mt-1">BIC</h1>
        </div>
      </div>
      <div className="flex-1 bg-[#F0F2F8] rounded-t-3xl -mt-6 px-5 pt-7 pb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Join the squad</h2>
        <p className="text-sm text-gray-500 mb-5">School email required to sign up</p>
        <form onSubmit={handleRegister} className="space-y-4">
          <div><label className="label">Your name</label><input type="text" className="input-field" placeholder="Jordan Kim" value={name} onChange={e=>setName(e.target.value)} required /></div>
          <div><label className="label">School email</label><input type="email" className="input-field" placeholder="you@smis.ac.jp" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
          <div><label className="label">Password</label><input type="password" className="input-field" placeholder="Min. 6 characters" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 fade-in">{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>{loading?'Creating account…':'Create account →'}</button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-5">Already have an account? <Link href="/login" className="font-semibold" style={{color:'var(--cobalt)'}}>Sign in</Link></p>
      </div>
    </div>
  )
}
