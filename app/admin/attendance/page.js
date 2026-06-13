'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function AdminAttendance() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [warning, setWarning] = useState(null)

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
        .select(`*, date_options(*), rsvps(*, profiles(full_name, email)), attendance(*, profiles(full_name))`)
        .in('status', ['confirmed'])
        .order('created_at', { ascending: false })

      setEvents(evs || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function toggleAttendance(eventId, userId, currentStatus) {
    setToggling(userId)
    const supabase = createClient()
    const newStatus = currentStatus === 'present' ? 'absent' : 'present'

    const existing = events.find(e => e.id === eventId)?.attendance?.find(a => a.user_id === userId)

    if (existing) {
      await supabase.from('attendance').update({ status: newStatus }).eq('id', existing.id)
    } else {
      await supabase.from('attendance').insert({ event_id: eventId, user_id: userId, status: newStatus })
    }

    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e
      const existing = e.attendance?.find(a => a.user_id === userId)
      let attendance
      if (existing) {
        attendance = e.attendance.map(a => a.user_id === userId ? { ...a, status: newStatus } : a)
      } else {
        attendance = [...(e.attendance || []), { user_id: userId, status: newStatus, profiles: e.rsvps?.find(r => r.user_id === userId)?.profiles }]
      }
      return { ...e, attendance }
    }))
    setToggling(null)
  }

  async function sendWarning(eventId, userId, userName) {
    setWarning(userId)
    const supabase = createClient()
    await supabase.from('notifications').insert({
      recipient_group: 'individual',
      user_id: userId,
      message: `⚠️ Warning: You were marked absent for the BIC basketball session. Please make sure to notify us in advance if you cannot attend.`,
      sent_by_manager: true,
    })
    setTimeout(() => setWarning(null), 2000)
  }

  async function validateReason(eventId, optionId, userId, isValid) {
    const supabase = createClient()
    await supabase.from('votes')
      .update({ reason_valid: isValid })
      .eq('date_option_id', optionId)
      .eq('user_id', userId)

    if (!isValid) {
      await supabase.from('attendance').upsert({
        event_id: eventId,
        user_id: userId,
        status: 'absent',
      }, { onConflict: 'event_id,user_id' })

      setEvents(prev => prev.map(e => {
        if (e.id !== eventId) return e
        const existing = e.attendance?.find(a => a.user_id === userId)
        const attendance = existing
          ? e.attendance.map(a => a.user_id === userId ? { ...a, status: 'absent' } : a)
          : [...(e.attendance || []), { user_id: userId, status: 'absent' }]
        return { ...e, attendance }
      }))
    }
  }

  if (loading) return <Loader />

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <Nav role="manager" userName={profile?.full_name} />
      <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
        <div className="page-header"><h1>Attendance</h1><p>Mark who showed up. Issue warnings for no-shows.</p></div>

        {events.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-gray-500">No confirmed sessions yet</p>
          </div>
        )}

        {events.map(event => {
          const locked = event.date_options?.find(d => d.is_locked)
          const rsvps = event.rsvps || []
          const confirmed = rsvps.filter(r => r.status === 'confirmed')
          const getStatus = (userId) => event.attendance?.find(a => a.user_id === userId)?.status || 'present'

          return (
            <div key={event.id}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm text-gray-900">{event.title}</p>
                <span className="badge-teal text-xs">Confirmed</span>
              </div>
              {locked && (
                <p className="text-xs text-gray-400 mb-3">
                  {new Date(locked.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} · {locked.start_time}
                </p>
              )}

              <div className="card">
                <p className="section-label">RSVPs — tap to mark absent</p>
                <div className="divide-y divide-gray-50">
                  {confirmed.map(r => {
                    const status = getStatus(r.user_id)
                    const isAbsent = status === 'absent'
                    return (
                      <div key={r.id} className="py-2.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${isAbsent ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {r.profiles?.full_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">{r.profiles?.full_name}</p>
                            <p className="text-xs text-gray-400">{r.profiles?.email}</p>
                          </div>
                          <button
                            onClick={() => toggleAttendance(event.id, r.user_id, status)}
                            disabled={toggling === r.user_id}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${isAbsent ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-700'}`}
                          >
                            {toggling === r.user_id ? '…' : isAbsent ? 'Absent' : 'Present'}
                          </button>
                        </div>
                        {isAbsent && (
                          <div className="mt-2 ml-10">
                            <button
                              onClick={() => sendWarning(event.id, r.user_id, r.profiles?.full_name)}
                              disabled={warning === r.user_id}
                              className="text-xs text-amber-600 border border-amber-200 bg-amber-50 px-3 py-1 rounded-lg hover:bg-amber-100 transition-all"
                            >
                              {warning === r.user_id ? '⚠️ Warning sent!' : '⚠️ Send warning'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {confirmed.length === 0 && (
                    <p className="text-xs text-gray-400 py-4 text-center">No RSVPs for this session</p>
                  )}
                </div>
              </div>
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
