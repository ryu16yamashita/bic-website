'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function RsvpPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id

  const [user, setUser] = useState(null)
  const [event, setEvent] = useState(null)
  const [lockedDate, setLockedDate] = useState(null)
  const [rsvps, setRsvps] = useState([])
  const [myRsvp, setMyRsvp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [justReachedCap, setJustReachedCap] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: ev } = await supabase
        .from('events')
        .select(`*, date_options(*)`)
        .eq('id', eventId)
        .single()

      if (!ev || ev.status !== 'locked') { router.push('/dashboard'); return }

      const locked = ev.date_options?.find(d => d.is_locked)
      setEvent(ev)
      setLockedDate(locked)

      // Load RSVPs with player names
      const { data: rsvpData } = await supabase
        .from('rsvps')
        .select(`*, profiles(full_name)`)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      setRsvps(rsvpData || [])
      setMyRsvp(rsvpData?.find(r => r.user_id === user.id) || null)
      setLoading(false)
    }
    load()
  }, [eventId, router])

  async function handleRsvp() {
    setSaving(true)
    const supabase = createClient()

    if (myRsvp) {
      // Cancel RSVP
      await supabase.from('rsvps').delete().eq('id', myRsvp.id)
      setRsvps(prev => prev.filter(r => r.id !== myRsvp.id))
      setMyRsvp(null)
    } else {
      const confirmedCount = rsvps.filter(r => r.status === 'confirmed').length
      const status = confirmedCount >= event.player_cap ? 'waitlist' : 'confirmed'

      const { data: newRsvp } = await supabase
        .from('rsvps')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status,
        })
        .select(`*, profiles(full_name)`)
        .single()

      if (newRsvp) {
        const updated = [...rsvps, newRsvp]
        setRsvps(updated)
        setMyRsvp(newRsvp)

        // Check if cap just reached
        const newConfirmed = updated.filter(r => r.status === 'confirmed').length
        if (newConfirmed === event.player_cap) {
          setJustReachedCap(true)
        }
      }
    }

    setSaving(false)
  }

  if (loading) return <LoadingScreen />

  const confirmed = rsvps.filter(r => r.status === 'confirmed')
  const waitlist = rsvps.filter(r => r.status === 'waitlist')
  const capPct = Math.min(100, Math.round((confirmed.length / event.player_cap) * 100))
  const spotsLeft = event.player_cap - confirmed.length
  const isFull = spotsLeft <= 0
  const isConfirmed = myRsvp?.status === 'confirmed'
  const isWaitlisted = myRsvp?.status === 'waitlist'

  const dateStr = lockedDate
    ? new Date(lockedDate.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Back</Link>
        <span className="font-semibold text-gray-900 text-sm">{event?.title}</span>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">

        {/* Cap reached notification */}
        {(justReachedCap || (isFull && isConfirmed)) && (
          <div className="bg-court-50 border border-court-200 rounded-2xl px-4 py-3">
            <p className="text-sm font-medium text-court-800">🏀 Game is on! Cap reached</p>
            <p className="text-xs text-court-600 mt-0.5">
              All {event.player_cap} players confirmed. Everyone has been notified.
            </p>
          </div>
        )}

        {isWaitlisted && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
            <p className="text-sm font-medium text-amber-800">You're on the waitlist</p>
            <p className="text-xs text-amber-700 mt-0.5">We'll notify you if a spot opens up.</p>
          </div>
        )}

        {/* Game card */}
        <div className="card">
          <p className="text-lg font-semibold text-gray-900">{dateStr}</p>
          <p className="text-sm text-gray-500 mt-1">
            🕐 {lockedDate?.start_time} – {lockedDate?.end_time}
            &nbsp;·&nbsp;
            📍 {event?.location}
          </p>

          <hr className="border-gray-100 my-3" />

          {/* Cap bar */}
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>{confirmed.length} of {event.player_cap} spots filled</span>
            <span>{isFull ? 'Full' : `${spotsLeft} open`}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-amber-400' : 'bg-court-400'}`}
              style={{ width: `${capPct}%` }}
            />
          </div>

          <button
            onClick={handleRsvp}
            disabled={saving}
            className={`w-full py-3 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
              isConfirmed
                ? 'bg-court-400 text-white border-court-400'
                : isWaitlisted
                  ? 'bg-amber-400 text-white border-amber-400'
                  : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {saving ? '…' : isConfirmed ? "✅ You're in — tap to cancel" : isWaitlisted ? '⏳ On waitlist — tap to leave' : isFull ? '⏳ Join waitlist' : "🏀 I'm in"}
          </button>
        </div>

        {/* Confirmed roster */}
        <div className="card">
          <p className="section-label">Confirmed ({confirmed.length})</p>
          {confirmed.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No one yet — be first!</p>
          )}
          <div className="divide-y divide-gray-50">
            {confirmed.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 py-2">
                <div className="w-7 h-7 rounded-full bg-court-50 flex items-center justify-center text-xs font-medium text-court-800">
                  {r.profiles?.full_name?.charAt(0) || '?'}
                </div>
                <span className="text-sm text-gray-800 flex-1">{r.profiles?.full_name || 'Player'}</span>
                {r.user_id === user?.id && <span className="text-xs text-court-600 font-medium">You</span>}
                <span className="badge-teal">In</span>
              </div>
            ))}
          </div>
        </div>

        {/* Waitlist */}
        {waitlist.length > 0 && (
          <div className="card">
            <p className="section-label">Waitlist ({waitlist.length})</p>
            <div className="divide-y divide-gray-50">
              {waitlist.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-xs font-medium text-amber-800">
                    {r.profiles?.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm text-gray-800 flex-1">{r.profiles?.full_name || 'Player'}</span>
                  <span className="text-xs text-amber-600">#{i + 1}</span>
                  {r.user_id === user?.id && <span className="text-xs text-amber-600 font-medium">You</span>}
                  <span className="badge-amber">Waiting</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  )
}
