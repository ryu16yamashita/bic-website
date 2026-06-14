'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function VotePage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id
  const [profile, setProfile] = useState(null)
  const [event, setEvent] = useState(null)
  const [dateOptions, setDateOptions] = useState([])
  const [myVotes, setMyVotes] = useState({})
  const [voteCounts, setVoteCounts] = useState({})
  const [reasons, setReasons] = useState({})
  const [showReason, setShowReason] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: ev } = await supabase.from('events').select('*, date_options(*)').eq('id', eventId).single()
      if (!ev) { router.push('/vote'); return }
      setEvent(ev)
      setDateOptions(ev.date_options || [])
      const { data: allVotes } = await supabase.from('votes').select('*').in('date_option_id', (ev.date_options||[]).map(d=>d.id))
      const mine = {}, counts = {}
      for (const opt of (ev.date_options||[])) {
        const optVotes = allVotes?.filter(v=>v.date_option_id===opt.id)||[]
        counts[opt.id] = { can_go: optVotes.filter(v=>v.vote==='can_go').length, cant_go: optVotes.filter(v=>v.vote==='cant_go').length }
        const myVote = optVotes.find(v=>v.user_id===user.id)
        if (myVote) { mine[opt.id] = myVote.vote; if (myVote.reason) setReasons(p=>({...p,[opt.id]:myVote.reason})) }
      }
      setMyVotes(mine)
      setVoteCounts(counts)
      setLoading(false)
    }
    load()
  }, [eventId, router])

  async function castVote(dateOptionId, voteValue) {
    const supabase = createClient()
    const existing = myVotes[dateOptionId]
    if (existing === voteValue && voteValue === 'can_go') {
      await supabase.from('votes').delete().eq('date_option_id', dateOptionId).eq('user_id', profile.id)
      setMyVotes(p=>{const n={...p};delete n[dateOptionId];return n})
      setVoteCounts(p=>({...p,[dateOptionId]:{...p[dateOptionId],can_go:Math.max(0,(p[dateOptionId]?.can_go||0)-1)}}))
      return
    }
    if (voteValue === 'cant_go') { setShowReason(p=>({...p,[dateOptionId]:true})); return }
    setSaving(dateOptionId)
    await supabase.from('votes').upsert({ date_option_id: dateOptionId, user_id: profile.id, vote: voteValue, reason: null },{ onConflict: 'date_option_id,user_id' })
    setVoteCounts(p=>{const old=p[dateOptionId]||{can_go:0,cant_go:0};const u={...old};if(existing)u[existing]=Math.max(0,u[existing]-1);u[voteValue]=(u[voteValue]||0)+1;return{...p,[dateOptionId]:u}})
    setMyVotes(p=>({...p,[dateOptionId]:voteValue}))
    setSaving(null)
  }

  async function submitReason(dateOptionId) {
    const reason = reasons[dateOptionId]?.trim()
    if (!reason) return
    setSaving(dateOptionId)
    const supabase = createClient()
    const existing = myVotes[dateOptionId]
    await supabase.from('votes').upsert({ date_option_id: dateOptionId, user_id: profile.id, vote: 'cant_go', reason },{ onConflict: 'date_option_id,user_id' })
    setVoteCounts(p=>{const old=p[dateOptionId]||{can_go:0,cant_go:0};const u={...old};if(existing)u[existing]=Math.max(0,u[existing]-1);u.cant_go=(u.cant_go||0)+1;return{...p,[dateOptionId]:u}})
    setMyVotes(p=>({...p,[dateOptionId]:'cant_go'}))
    setShowReason(p=>({...p,[dateOptionId]:false}))
    setSaving(null)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cobalt)'}}>
      <p className="text-yellow-300 text-sm animate-pulse">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F0F2F8]">
      <Nav role={profile?.role} userName={profile?.full_name} />
      <div className="max-w-sm mx-auto px-4 py-6">
        <div className="page-header mb-5"><h1>{event?.title}</h1><p>Vote on which dates work for you</p></div>
        <div className="space-y-3">
          {dateOptions.map(opt => {
            const c = voteCounts[opt.id]||{can_go:0,cant_go:0}
            const total = c.can_go+c.cant_go
            const pct = total>0?Math.round((c.can_go/total)*100):0
            const myVote = myVotes[opt.id]
            const dateStr = new Date(opt.date).toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})
            return (
              <div key={opt.id} className={`card ${opt.is_locked?'border-green-200 bg-green-50':''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div><p className="font-semibold text-sm text-gray-900">{dateStr}</p><p className="text-xs text-gray-500">{opt.start_time} – {opt.end_time} · {event.location}</p></div>
                  {opt.is_locked?<span className="badge-teal">Locked ✓</span>:<span className="badge-gold">Open</span>}
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1"><span>✅ {c.can_go} can go</span><span>❌ {c.cant_go} cannot go</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:'var(--cobalt)'}} /></div>
                </div>
                {!opt.is_locked && event?.status==='voting' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={()=>castVote(opt.id,'can_go')} disabled={saving===opt.id}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${myVote==='can_go'?'text-white border-0':'bg-white text-gray-700 border-gray-200 hover:bg-green-50'}`}
                      style={myVote==='can_go'?{background:'var(--cobalt)'}:{}}>
                      ✅ I can go
                    </button>
                    <button onClick={()=>castVote(opt.id,'cant_go')} disabled={saving===opt.id}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${myVote==='cant_go'?'bg-red-500 text-white border-red-500':'bg-white text-gray-700 border-gray-200 hover:bg-red-50'}`}>
                      ❌ Cannot go
                    </button>
                  </div>
                )}
                {showReason[opt.id] && (
                  <div className="mt-3 space-y-2 fade-in">
                    <label className="label text-red-600">Why can you not make it? (required)</label>
                    <textarea className="input-field resize-none text-sm" rows={3} placeholder="Please explain your reason…"
                      value={reasons[opt.id]||''} onChange={e=>setReasons(p=>({...p,[opt.id]:e.target.value}))} />
                    <button onClick={()=>submitReason(opt.id)} disabled={!reasons[opt.id]?.trim()||saving===opt.id} className="btn-primary text-sm">
                      {saving===opt.id?'Submitting…':'Submit reason'}
                    </button>
                  </div>
                )}
                {myVote==='cant_go'&&reasons[opt.id]&&!showReason[opt.id]&&(
                  <p className="text-xs text-gray-400 mt-2 italic">Your reason: "{reasons[opt.id]}"</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
