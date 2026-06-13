'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const MANAGER_TABS = [
  { label: 'Create',        href: '/admin/create' },
  { label: 'Votes',         href: '/admin/votes' },
  { label: 'Roster',        href: '/admin/roster' },
  { label: 'Attendance',    href: '/admin/attendance' },
  { label: 'Announce',      href: '/admin/announcements' },
  { label: 'Notify',        href: '/admin/notify' },
]

const PLAYER_TABS = [
  { label: 'Home',          href: '/dashboard' },
  { label: 'Vote',          href: '/vote' },
  { label: 'Calendar',      href: '/calendar' },
  { label: 'Announcements', href: '/announcements' },
  { label: 'Profile',       href: '/profile' },
]

export default function Nav({ role, userName }) {
  const pathname = usePathname()
  const router = useRouter()
  const tabs = role === 'manager' ? MANAGER_TABS : PLAYER_TABS

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="sticky top-0 z-20 shadow-md">
      {/* Top bar — always cobalt/gold */}
      <div className="titans-banner px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/titans-logo.jpg" alt="Titans" className="w-8 h-8 rounded-full object-cover border-2 border-yellow-400" />
          <div>
            <span className="font-bold text-white text-sm tracking-wide">BIC</span>
            <span className="text-yellow-300 text-xs ml-1.5 font-medium">Basketball</span>
          </div>
          {role === 'manager' && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold ml-1" style={{background:'var(--gold)', color:'var(--cobalt-dark)'}}>Manager</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-blue-200 hidden sm:block truncate max-w-[120px]">{userName}</span>
          <button onClick={signOut} className="text-xs text-yellow-300 hover:text-white transition-colors font-medium">
            Sign out
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b-2 px-2 flex gap-0 overflow-x-auto scrollbar-hide" style={{borderColor:'var(--cobalt-light)'}}>
        {tabs.map(t => {
          const active = pathname === t.href || pathname.startsWith(t.href + '/')
          return (
            <Link key={t.href} href={t.href}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                active
                  ? 'border-yellow-400 text-cobalt'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
              }`}
              style={active ? {color: 'var(--cobalt)', borderColor: 'var(--gold)'} : {}}
            >{t.label}</Link>
          )
        })}
      </div>
    </div>
  )
}
