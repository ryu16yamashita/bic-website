'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function AnnouncementsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data } = await supabase.from('announcements').select('*').order('pinned',{ascending:false}).order('created_at',{ascending:false})
      setAnnouncements(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-gray-400">Loading…</p></div>

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <Nav role={profile?.role} userName={profile?.full_name} />
      <div className="max-w-sm mx-auto px-4 py-6">
        <div className="page-header mb-5"><h1>Announcements</h1><p>Updates from the manager</p></div>
        {announcements.length === 0 && <div className="card text-center py-10 text-sm text-gray-400">No announcements yet</div>}
        {announcements.map(a => (
          <div key={a.id} className={`card mb-3 ${a.pinned?'border-amber-200 bg-amber-50':''}`}>
            <div className="flex items-center gap-2 mb-1">
              {a.pinned && <span>📌</span>}
              <p className="font-medium text-sm text-gray-900">{a.title}</p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{a.body}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(a.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
