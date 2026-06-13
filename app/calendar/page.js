'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function CalendarPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [today] = useState(new Date())
  const [viewMonth, setViewMonth] = useState(new Date())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: evs } = await supabase.from('events').select('*, date_options(*)').in('status', ['confirmed', 'locked'])
      setEvents(evs || [])
      setLoading(false)
    }
    load()
  }, [router])

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const eventDates = {}
  for (const ev of events) {
    const locked = ev.date_options?.find(d => d.is_locked)
    if (locked) {
      const d = new Date(locked.date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        eventDates[d.getDate()] = { event: ev, opt: locked }
      }
    }
  }
  const monthName = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-gray-400">Loading…</p></div>

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <Nav role={profile?.role} userName={profile?.full_name} />
      <div className="max-w-sm mx-auto px-4 py-6">
        <div className="page-header mb-5"><h1>Calendar</h1><p>Confirmed and upcoming sessions</p></div>
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewMonth(new Date(year, month-1, 1))} className="text-gray-400 hover:text-gray-700 px-2 py-1 text-lg">‹</button>
            <p className="font-medium text-sm text-gray-900">{monthName}</p>
            <button onClick={() => setViewMonth(new Date(year, month+1, 1))} className="text-gray-400 hover:text-gray-700 px-2 py-1 text-lg">›</button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({length: firstDay}).map((_,i) => <div key={'e'+i} />)}
            {Array.from({length: daysInMonth}).map((_,i) => {
              const day = i + 1
              const isToday = day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear()
              const hasEvent = eventDates[day]
              return (
                <div key={day} className="flex flex-col items-center py-1">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm ${isToday?'bg-amber-400 text-white font-medium':hasEvent?'bg-green-500 text-white font-medium':'text-gray-700'}`}>{day}</div>
                  {hasEvent && !isToday && <div className="w-1 h-1 rounded-full bg-green-400 mt-0.5" />}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-xs text-gray-500">Today</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-xs text-gray-500">Session</span></div>
          </div>
        </div>
        <p className="section-label">Upcoming sessions</p>
        {Object.keys(eventDates).length === 0 && <div className="card text-center py-8 text-sm text-gray-400">No sessions this month</div>}
        {Object.entries(eventDates).map(([day, {event, opt}]) => (
          <div key={event.id} className="card mb-3 border-l-4 border-l-green-400" style={{borderRadius:'var(--border-radius-lg)'}}>
            <p className="font-medium text-sm text-gray-900">{event.title}</p>
            <p className="text-xs text-gray-500 mt-1">{new Date(opt.date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
            <p className="text-xs text-gray-500">🕐 {opt.start_time} – {opt.end_time} · 📍 {event.location}</p>
            <span className="badge-teal mt-2 inline-block">Confirmed ✓</span>
          </div>
        ))}
      </div>
    </div>
  )
}
