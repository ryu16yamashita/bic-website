'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function AdminRoster() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof?.role !== 'manager') { router.push('/dashboard'); return }
      setProfile(prof)
      const { data: evs } = await supabase.from('events').select('*, date_options(*), rsvps(*, profiles(full_name, email))').in('status',['locked','confirmed']).order('created_at',{ascending:false})
      setEvents(evs||[])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cobalt)'}}><p className="text-yellow-300 animate-pulse text-sm">Loading…</p></div>

  return (
    <div className="min-h-screen bg-[#F0F2F8]">
      <Nav role="manager" userName={profile?.full_name} />
      <div className="max-w-sm mx-auto px-4 py-6">
        <div className="page-header mb-5"><h1>Roster</h1><p>Who's confirmed for locked sessions</p></div>
        {events.length === 0 && <div className="card text-center py-10"><p className="text-2xl mb-2">📋</p><p className="text-sm text-gray-500">No locked sessions yet</p><Link href="/admin/votes" className="btn-gold mt-4 inline-block text-center text-sm px-6">Go to votes →</Link></div>}
        {events.map(event => {
          const locked = event.date_options?.find(d=>d.is_locked)
          const confirmed = (event.rsvps||[]).filter(r=>r.status==='confirmed')
          const waitlist = (event.rsvps||[]).filter(r=>r.status==='waitlist')
          const pct = Math.min(100,Math.round((confirmed.length/event.player_cap)*100))
          const isFull = confirmed.length >= event.player_cap
          return (
            <div key={event.id} className="mb-6 space-y-3 fade-in">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-gray-900">{event.title}</p>
                <span className="badge-teal">Locked ✓</span>
              </div>
              {locked && <p className="text-xs text-gray-400">{new Date(locked.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} · {locked.start_time} · {event.location}</p>}
              <div className="card">
                <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{confirmed.length}/{event.player_cap} confirmed</span><span className={isFull?'text-amber-600 font-semibold':''}>{isFull?'Full!':event.player_cap-confirmed.length+' spots left'}</span></div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3"><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:isFull?'var(--gold)':'var(--cobalt)'}} /></div>
                <p className="section-label">Confirmed ({confirmed.length})</p>
                <div className="divide-y divide-gray-50">
                  {confirmed.map(r=>(
                    <div key={r.id} className="flex items-center gap-3 py-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{background:'var(--cobalt-light)',color:'var(--cobalt)'}}>{r.profiles?.full_name?.charAt(0)||'?'}</div>
                      <div className="flex-1"><p className="text-sm text-gray-800">{r.profiles?.full_name}</p><p className="text-xs text-gray-400">{r.profiles?.email}</p></div>
                      <span className="badge-teal">In</span>
                    </div>
                  ))}
                  {confirmed.length===0&&<p className="text-xs text-gray-400 py-3 text-center">No RSVPs yet</p>}
                </div>
                {waitlist.length>0&&(
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="section-label">Waitlist ({waitlist.length})</p>
                    {waitlist.map((r,i)=>(
                      <div key={r.id} className="flex items-center gap-3 py-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{background:'var(--gold-light)',color:'var(--cobalt-dark)'}}>{r.profiles?.full_name?.charAt(0)||'?'}</div>
                        <div className="flex-1"><p className="text-sm text-gray-800">{r.profiles?.full_name}</p><p className="text-xs text-gray-400">#{i+1} on waitlist</p></div>
                        <span className="badge-amber">Waiting</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
