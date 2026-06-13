'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

const AUTO = [
  { icon: '📨', label: 'When voting opens', desc: 'Sent when you publish an event' },
  { icon: '🔒', label: 'When a date is locked', desc: 'Sent when you lock a winning date' },
  { icon: '🏀', label: 'When cap is reached', desc: 'Sent to everyone on the roster' },
  { icon: '⏳', label: 'Waitlist spot opens', desc: 'Sent to next person on waitlist' },
  { icon: '⚠️', label: 'Absence warning', desc: 'Sent when manager marks absent' },
]

export default function AdminNotify() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [recipient, setRecipient] = useState('all')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [playerCount, setPlayerCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof?.role !== 'manager') { router.push('/dashboard'); return }
      setProfile(prof)
      const { count } = await supabase.from('profiles').select('id',{count:'exact'}).eq('role','player')
      setPlayerCount(count||0)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSend(e) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('notifications').insert({ recipient_group: recipient, message: message.trim(), sent_by_manager: true })
    setSent(true); setMessage('')
    setSending(false)
    setTimeout(() => setSent(false), 3000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cobalt)'}}><p className="text-yellow-300 animate-pulse text-sm">Loading…</p></div>

  return (
    <div className="min-h-screen bg-[#F0F2F8]">
      <Nav role="manager" userName={profile?.full_name} />
      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">
        <div className="page-header"><h1>Notify players</h1><p>Send a message to the group</p></div>
        {sent && <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-800 fade-in">✅ Sent to {playerCount} players</div>}
        <form onSubmit={handleSend} className="card space-y-3">
          <div><label className="label">Send to</label>
            <select className="input-field" value={recipient} onChange={e=>setRecipient(e.target.value)}>
              <option value="all">All players ({playerCount})</option>
              <option value="confirmed">Confirmed only</option>
              <option value="waitlist">Waitlist only</option>
            </select>
          </div>
          <div><label className="label">Message</label>
            <textarea className="input-field resize-none" rows={4} placeholder="Game is on! See you at 6:30pm in the main gym 🏀" value={message} onChange={e=>setMessage(e.target.value)} required />
          </div>
          <button type="submit" className="btn-gold" disabled={sending||!message.trim()}>{sending?'Sending…':'📨 Send notification'}</button>
        </form>
        <div className="card">
          <p className="section-label">Auto-notifications</p>
          <p className="text-xs text-gray-400 mb-3">These fire automatically — no action needed.</p>
          <div className="space-y-3">
            {AUTO.map((n,i)=>(
              <div key={i} className="flex items-start gap-3">
                <span className="text-base mt-0.5">{n.icon}</span>
                <div className="flex-1"><p className="text-sm font-medium text-gray-800">{n.label}</p><p className="text-xs text-gray-400">{n.desc}</p></div>
                <span className="badge-teal shrink-0">On</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
