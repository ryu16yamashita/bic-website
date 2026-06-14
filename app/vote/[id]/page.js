'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function VoteIndex() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      const { data: evs } = await supabase
        .from('events')
        .select('*, date_options(*)')
        .eq('status', 'voting')
        .order('created_at', { ascending: false })

      const active = evs || []

      // If exactly one event, go straight to it
      if (active.length === 1) {
        router.push(`/vote/${active[0].id}`)
        return
      }

      setEvents(active)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cobalt)'}}>
      <p className="text-yellow-300 text-sm animate-pulse">Loading votes…</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F0F2F8]">
      <Nav role={profile?.role} userName={profile?.full_name} />
      <div className="max-w-sm mx-auto px-4 py-6">
        <div className="page-header mb-5">
          <h1>Vote on dates</h1>
          <p>Active voting sessions</p>
        </div>

        {events.length === 0 && (
          <div className="card text-center py-12 fade-in">
            <p className="text-4xl mb-3">🗳️</p>
            <p className="text-sm font-semibold text-gray-700">No active votes right now</p>
            <p className="text-xs text-gray-400 mt-1">The manager hasn't opened voting yet — check back soon</p>
          </div>
        )}

        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.id} className="card fade-in border-l-4" style={{borderLeftColor:'var(--gold)'}}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{ev.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ev.date_options?.length || 0} date option{ev.date_options?.length !== 1 ? 's' : ''} · voting open
                  </p>
                </div>
                <span className="badge-gold">Open</span>
              </div>
              <button
                onClick={() => router.push(`/vote/${ev.id}`)}
                className="btn-primary text-sm"
              >
                Vote now →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
