'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

const emptyDate = () => ({ date: '', start_time: '', end_time: '' })

export default function AdminCreate() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [playerCap, setPlayerCap] = useState(15)
  const [dateOptions, setDateOptions] = useState([emptyDate(), emptyDate()])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof?.role !== 'manager') { router.push('/dashboard'); return }
      setProfile(prof)
      setLoading(false)
    }
    check()
  }, [router])

  function addDate() { if (dateOptions.length < 4) setDateOptions(p => [...p, emptyDate()]) }
  function removeDate(i) { if (dateOptions.length > 1) setDateOptions(p => p.filter((_,idx) => idx !== i)) }
  function updateDate(i, field, value) { setDateOptions(p => p.map((d,idx) => idx===i?{...d,[field]:value}:d)) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const filled = dateOptions.filter(d => d.date && d.start_time && d.end_time)
    if (filled.length === 0) { setError('Add at least one complete date option.'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: event, error: evErr } = await supabase.from('events').insert({ title, location, player_cap: playerCap, created_by: user.id, status: 'voting' }).select().single()
    if (evErr) { setError(evErr.message); setSaving(false); return }
    await supabase.from('date_options').insert(filled.map(d => ({ event_id: event.id, date: d.date, start_time: d.start_time, end_time: d.end_time, is_locked: false })))
    setSuccess(true)
    setSaving(false)
    setTitle(''); setLocation(''); setPlayerCap(15); setDateOptions([emptyDate(), emptyDate()])
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) return <Loader />

  return (
    <div className="min-h-screen bg-[#F0F2F8]">
      <Nav role="manager" userName={profile?.full_name} />
      <div className="max-w-sm mx-auto px-4 py-6">
        <div className="page-header mb-5"><h1>New session</h1><p>Set details and propose date options</p></div>
        {success && <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4 text-sm text-green-800 fade-in">✅ Event published! Players can now vote.</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card space-y-3">
            <p className="section-label">Event info</p>
            <div><label className="label">Title</label><input type="text" className="input-field" placeholder="Saturday runs" value={title} onChange={e=>setTitle(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Location</label><input type="text" className="input-field" placeholder="Main gym" value={location} onChange={e=>setLocation(e.target.value)} required /></div>
              <div><label className="label">Player cap</label><input type="number" className="input-field" min="1" max="50" value={playerCap} onChange={e=>setPlayerCap(Number(e.target.value))} required /></div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="section-label" style={{marginBottom:0}}>Date options ({dateOptions.length}/4)</p>
              {dateOptions.length < 4 && <button type="button" onClick={addDate} className="text-xs font-semibold" style={{color:'var(--cobalt)'}}>+ Add date</button>}
            </div>
            <div className="space-y-4">
              {dateOptions.map((d,i) => (
                <div key={i} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">Option {i+1}</span>
                    {dateOptions.length > 1 && <button type="button" onClick={()=>removeDate(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>}
                  </div>
                  <div className="space-y-2">
                    <div><label className="label">Date</label><input type="date" className="input-field" value={d.date} onChange={e=>updateDate(i,'date',e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="label">Start</label><input type="time" className="input-field" value={d.start_time} onChange={e=>updateDate(i,'start_time',e.target.value)} /></div>
                      <div><label className="label">End</label><input type="time" className="input-field" value={d.end_time} onChange={e=>updateDate(i,'end_time',e.target.value)} /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 fade-in">{error}</div>}
          <button type="submit" className="btn-gold" disabled={saving}>{saving?'Publishing…':'🏀 Publish & open voting'}</button>
        </form>
      </div>
    </div>
  )
}

function Loader() { return <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cobalt)'}}><p className="text-yellow-300 text-sm animate-pulse">Loading…</p></div> }
