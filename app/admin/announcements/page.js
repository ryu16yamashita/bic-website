'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function AdminAnnouncements() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof?.role !== 'manager') { router.push('/dashboard'); return }
      setProfile(prof)
      const { data } = await supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false })
      setAnnouncements(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function handlePost(e) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: newA } = await supabase.from('announcements')
      .insert({ title: title.trim(), body: body.trim(), pinned })
      .select().single()
    if (newA) setAnnouncements(prev => [newA, ...prev.filter(a => !newA.pinned || !a.pinned || a.id === newA.id)])
    setTitle(''); setBody(''); setPinned(false)
    setSaving(false)
  }

  async function handleDelete(id) {
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  if (loading) return <Loader />

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <Nav role="manager" userName={profile?.full_name} />
      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">
        <div className="page-header"><h1>Announcements</h1><p>Post updates visible to all members</p></div>

        <form onSubmit={handlePost} className="card space-y-3">
          <p className="section-label">New announcement</p>
          <div>
            <label className="label">Title</label>
            <input type="text" className="input-field" placeholder="Important update" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input-field resize-none" rows={4} placeholder="Write your announcement here…" value={body} onChange={e => setBody(e.target.value)} required />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700">📌 Pin to top</span>
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Posting…' : '📣 Post announcement'}
          </button>
        </form>

        <div className="space-y-3">
          <p className="section-label">Posted ({announcements.length})</p>
          {announcements.length === 0 && (
            <div className="card text-center py-8 text-sm text-gray-400">No announcements yet</div>
          )}
          {announcements.map(a => (
            <div key={a.id} className={`card ${a.pinned ? 'border-amber-200 bg-amber-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {a.pinned && <span className="text-xs">📌</span>}
                    <p className="font-medium text-sm text-gray-900">{a.title}</p>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{a.body}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(a.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id}
                  className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 p-1">
                  {deleting === a.id ? '…' : '✕'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Loader() {
  return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-gray-400">Loading…</p></div>
}
