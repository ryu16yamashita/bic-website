'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof?.role === 'manager') { router.push('/admin/create'); return }
      setProfile(prof)
      const { data: evs } = await supabase.from('events').select('*, date_options(*)').order('created_at', { ascending: false })
      const { data: ann } = await supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3)
      setEvents(evs || [])
      setAnnouncements(ann || [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <Loader />

  const activeVotes = events.filter(e => e.status === 'voting')
  const lockedGames = events.filter(e => e.status === 'locked' || e.status === 'confirmed')

  return (
    <div className="min-h-screen bg-[#F0F2F8]">
      <Nav role="player" userName={profile?.full_name} />

      {/* Hero section with gym background */}
      <div className="relative h-52 overflow-hidden">
        <img src="/gym.jpg" alt="SMIS Gym" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <img src="/titans-logo.jpg" alt="Titans" className="w-16 h-16 rounded-full object-cover border-3 shadow-xl" style={{border:'3px solid var(--gold)'}} />
          <div className="text-center">
            <h1 className="text-white font-bold text-3xl tracking-wider drop-shadow-lg" style={{textShadow:'0 2px 12px rgba(0,0,0,0.7)'}}>BIC</h1>
            <p className="text-yellow-300 text-xs font-semibold tracking-widest uppercase">St. Mary's Titans Basketball</p>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 py-5 space-y-5 fade-in">

        {/* Announcements strip */}
        {announcements.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="section-label" style={{marginBottom:0}}>📣 Latest announcements</p>
              <Link href="/announcements" className="text-xs font-medium" style={{color:'var(--cobalt)'}}>See all →</Link>
            </div>
            <div className="space-y-2">
              {announcements.map(a => (
                <div key={a.id} className={`card py-3 fade-in ${a.pinned ? 'border-l-4' : ''}`} style={a.pinned ? {borderLeftColor:'var(--gold)'} : {}}>
                  <div className="flex items-center gap-2">
                    {a.pinned && <span className="text-sm">📌</span>}
                    <p className="font-semibold text-sm text-gray-900">{a.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Vote needed */}
        {activeVotes.length > 0 && (
          <section>
            <p className="section-label">🗳️ Vote needed</p>
            <div className="space-y-2">
              {activeVotes.map(ev => (
                <div key={ev.id} className="card border-l-4 fade-in" style={{borderLeftColor:'var(--gold)'}}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{ev.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ev.date_options?.length} date options open</p>
                    </div>
                    <span className="badge-gold">Action needed</span>
                  </div>
                  <Link href={`/vote/${ev.id}`} className="btn-primary mt-3 block text-center text-sm">
                    Go vote →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming games */}
        {lockedGames.length > 0 && (
          <section>
            <p className="section-label">📅 Upcoming sessions</p>
            <div className="space-y-2">
              {lockedGames.map(ev => {
                const locked = ev.date_options?.find(d => d.is_locked)
                return (
                  <div key={ev.id} className="card fade-in">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{ev.title}</p>
                        {locked && <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(locked.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} · {locked.start_time}
                        </p>}
                      </div>
                      <span className="badge-teal">Confirmed ✓</span>
                    </div>
                    <Link href={`/rsvp/${ev.id}`} className="btn-gold mt-3 block text-center text-sm">
                      RSVP now →
                    </Link>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {events.length === 0 && (
          <div className="card text-center py-10 fade-in">
            <p className="text-3xl mb-2">🏀</p>
            <p className="text-sm font-medium text-gray-700">No sessions yet</p>
            <p className="text-xs text-gray-400 mt-1">Your manager will post dates soon</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Loader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{background:'var(--cobalt)'}}>
      <img src="/titans-logo.jpg" alt="" className="w-14 h-14 rounded-full border-2 border-yellow-400 animate-pulse" />
      <p className="text-yellow-300 text-sm font-medium">Loading BIC…</p>
    </div>
  )
}
