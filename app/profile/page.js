'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ totalSessions: 0, attended: 0, absences: 0, warnings: 0, votes: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: att } = await supabase.from('attendance').select('*').eq('user_id', user.id)
      const { data: rsvps } = await supabase.from('rsvps').select('*').eq('user_id', user.id)
      const { data: votes } = await supabase.from('votes').select('*').eq('user_id', user.id)
      const absences = att?.filter(a => a.status === 'absent').length || 0
      const warnings = att?.filter(a => a.warned).length || 0
      setStats({ totalSessions: rsvps?.length||0, attended: att?.filter(a=>a.status==='present').length||0, absences, warnings, votes: votes?.length||0 })
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cobalt)'}}><p className="text-yellow-300 text-sm animate-pulse">Loading…</p></div>

  const initials = profile?.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase()||'?'
  const attendRate = stats.totalSessions > 0 ? Math.round((stats.attended/stats.totalSessions)*100) : 100

  return (
    <div className="min-h-screen bg-[#F0F2F8]">
      <Nav role="player" userName={profile?.full_name} />
      <div className="titans-banner px-4 pt-6 pb-10 text-center">
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl font-bold shadow-lg mb-3" style={{background:'var(--gold)',color:'var(--cobalt-dark)'}}>{initials}</div>
        <h2 className="text-white font-bold text-lg">{profile?.full_name}</h2>
        <p className="text-blue-200 text-xs mt-0.5">{profile?.email}</p>
        <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full font-semibold" style={{background:'rgba(255,255,255,0.15)',color:'var(--gold)'}}>🏀 Player — BIC Basketball</span>
      </div>
      <div className="max-w-sm mx-auto px-4 -mt-6 pb-8 space-y-4 fade-in">
        <div className="card">
          <p className="section-label">Your stats</p>
          <div className="grid grid-cols-3 gap-3">
            {[{label:'Sessions',value:stats.totalSessions,icon:'📅'},{label:'Attended',value:stats.attended,icon:'✅'},{label:'Absences',value:stats.absences,icon:'❌',warn:stats.absences>2}].map(s=>(
              <div key={s.label} className={`rounded-xl p-3 text-center ${s.warn?'bg-red-50 border border-red-100':'bg-gray-50'}`}>
                <p className="text-lg mb-0.5">{s.icon}</p>
                <p className={`text-xl font-bold ${s.warn?'text-red-600':'text-gray-900'}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <p className="section-label">Attendance rate</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold" style={{color:attendRate>=80?'var(--cobalt)':'#DC2626'}}>{attendRate}%</span>
            <span className={`badge-${attendRate>=80?'teal':'red'}`}>{attendRate>=80?'Good standing':'Needs improvement'}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{width:`${attendRate}%`,background:attendRate>=80?'var(--cobalt)':'#DC2626'}} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{stats.attended} of {stats.totalSessions} sessions attended</p>
        </div>
        <div className="card">
          <p className="section-label">Warnings & votes</p>
          <div className="flex gap-3">
            <div className={`flex-1 rounded-xl p-3 text-center ${stats.warnings>0?'bg-amber-50 border border-amber-100':'bg-gray-50'}`}>
              <p className="text-lg">⚠️</p>
              <p className={`text-xl font-bold ${stats.warnings>0?'text-amber-600':'text-gray-900'}`}>{stats.warnings}</p>
              <p className="text-xs text-gray-500">Warnings</p>
            </div>
            <div className="flex-1 rounded-xl p-3 text-center bg-gray-50">
              <p className="text-lg">🗳️</p>
              <p className="text-xl font-bold text-gray-900">{stats.votes}</p>
              <p className="text-xs text-gray-500">Votes cast</p>
            </div>
          </div>
          {stats.warnings>0&&<p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-lg p-2">⚠️ You have {stats.warnings} warning{stats.warnings>1?'s':''}. Please contact the manager if you have questions.</p>}
        </div>
        <div className="card">
          <p className="section-label">Account info</p>
          <div className="space-y-2">
            {[{label:'Name',value:profile?.full_name},{label:'Email',value:profile?.email},{label:'Role',value:'Player'},{label:'Club',value:"BIC — St. Mary's Basketball"},{label:'Member since',value:new Date(profile?.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'})}].map(r=>(
              <div key={r.label} className="flex justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-400 font-medium">{r.label}</span>
                <span className="text-xs text-gray-700 text-right">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
