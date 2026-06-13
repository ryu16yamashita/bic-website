'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function AdminVotes() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [voteCounts, setVoteCounts] = useState({})
  const [absenceReasons, setAbsenceReasons] = useState({})
  const [loading, setLoading] = useState(true)
  const [locking, setLocking] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [cancelling, setCancelling] = useState(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof?.role !== 'manager') { router.push('/dashboard'); return }
      setProfile(prof)

      const { data: evs } = await supabase
        .from('events')
        .select('*, date_options(*)')
        .in('status', ['voting', 'locked'])
        .order('created_at', { ascending: false })

      if (!evs) { setLoading(false); return }
      setEvents(evs)

      const allIds = evs.flatMap(e => e.date_options?.map(d => d.id) || [])
      if (allIds.length > 0) {
        const { data: votes } = await supabase.from('votes').select('date_option_id, vote, reason, profiles(full_name)').in('date_option_id', allIds)
        const counts = {}
        const reasons = {}
        for (const v of (votes || [])) {
          if (!counts[v.date_option_id]) counts[v.date_option_id] = { can_go: 0, cant_go: 0 }
          counts[v.date_option_id][v.vote]++
          if (v.vote === 'cant_go' && v.reason) {
            if (!reasons[v.date_option_id]) reasons[v.date_option_id] = []
            reasons[v.date_option_id].push({ name: v.profiles?.full_name, reason: v.reason })
          }
        }
        setVoteCounts(counts)
        setAbsenceReasons(reasons)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function lockDate(event, opt) {
    setLocking(opt.id)
    const supabase = createClient()
    await supabase.from('date_options').update({ is_locked: true }).eq('id', opt.id)
    await supabase.from('events').update({ status: 'locked' }).eq('id', event.id)
    setLocking(null)
    setEvents(prev => prev.map(e => e.id === event.id
      ? { ...e, status: 'locked', date_options: e.date_options.map(d => ({ ...d, is_locked: d.id === opt.id })) }
      : e))
  }

  async function confirmSession(event) {
    setConfirming(event.id)
    const supabase = createClient()
    await supabase.from('events').update({ status: 'confirmed' }).eq('id', event.id)
    setEvents(prev => prev.filter(e => e.id !== event.id))
    setConfirming(null)
  }

  async function cancelSession(event) {
    setCancelling(event.id)
    const supabase = createClient()
    await supabase.from('events').update({ status: 'cancelled' }).eq('id', event.id)
    setEvents(prev => prev.filter(e => e.id !== event.id))
    setCancelling(null)
  }

  if (loading) return <Loader />

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <Nav role="manager" userName={profile?.full_name} />
      <div className="max-w-sm mx-auto px-4 py-6">
        <div className="page-header mb-5"><h1>Live votes</h1><p>Review votes, lock a date, then confirm or cancel the session</p></div>

        {events.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-sm text-gray-600">No active events</p>
          </div>
        )}

        {events.map(event => {
          const opts = event.date_options || []
          const locked = opts.find(o => o.is_locked)
          const isLocked = event.status === 'locked'

          return (
            <div key={event.id} className="mb-8 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-gray-900">{event.title}</p>
                <span className={isLocked ? 'badge-teal' : 'badge-amber'}>{isLocked ? 'Locked' : 'Voting'}</span>
              </div>

              {opts.sort((a,b) => (voteCounts[b.id]?.can_go||0)-(voteCounts[a.id]?.can_go||0)).map(opt => {
                const c = voteCounts[opt.id] || { can_go: 0, cant_go: 0 }
                const total = c.can_go + c.cant_go
                const pct = total > 0 ? Math.round((c.can_go/total)*100) : 0
                const dateStr = new Date(opt.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
                const optReasons = absenceReasons[opt.id] || []

                return (
                  <div key={opt.id} className={`card ${opt.is_locked ? 'border-green-200 bg-green-50' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{dateStr}</p>
                        <p className="text-xs text-gray-500">{opt.start_time} – {opt.end_time}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-700">{c.can_go} can go</p>
                        <p className="text-xs text-red-500">{c.cant_go} can't go</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{width:`${pct}%`}} />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                    </div>

                    {optReasons.length > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
                        <p className="text-xs font-medium text-red-700 mb-2">Absence reasons:</p>
                        {optReasons.map((r,i) => (
                          <p key={i} className="text-xs text-red-600 mb-1"><span className="font-medium">{r.name}:</span> {r.reason}</p>
                        ))}
                      </div>
                    )}

                    {!isLocked && !opt.is_locked && (
                      <button onClick={() => lockDate(event, opt)} disabled={locking === opt.id}
                        className="w-full py-2 rounded-xl text-xs font-medium border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all">
                        {locking === opt.id ? 'Locking…' : '🔒 Lock this date'}
                      </button>
                    )}
                    {opt.is_locked && <p className="text-xs text-center text-green-600 font-medium">✓ Date locked</p>}
                  </div>
                )
              })}

              {isLocked && (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => confirmSession(event)} disabled={confirming === event.id}
                    className="py-3 rounded-xl text-sm font-medium bg-green-500 text-white border-0 hover:bg-green-600 transition-all active:scale-95">
                    {confirming === event.id ? '…' : '✅ Confirm session'}
                  </button>
                  <button onClick={() => cancelSession(event)} disabled={cancelling === event.id}
                    className="py-3 rounded-xl text-sm font-medium bg-red-500 text-white border-0 hover:bg-red-600 transition-all active:scale-95">
                    {cancelling === event.id ? '…' : '❌ Cancel session'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Loader() {
  return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-gray-400">Loading…</p></div>
}
