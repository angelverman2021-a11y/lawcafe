'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export default function DashboardPage() {
  const { user, loading, logout } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border p-6">
        <h1 className="text-xl font-bold">Welcome, {user.name} ⚖️</h1>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="capitalize">{user.role.toLowerCase()}</dd>
          </div>
        </dl>
        <button
          onClick={handleLogout}
          className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Log out
        </button>
      </div>
    </main>
  )
}
