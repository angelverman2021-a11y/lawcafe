'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'

export default function HomePage() {
  const { user, loading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-4 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Law Café ⚖️</h1>
        <p className="text-muted-foreground max-w-md text-lg">
          Legal help for everyone. Connect with lawyers, get AI-powered guidance, and join a legal community.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/register"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border px-5 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
        >
          Log in
        </Link>
      </div>
    </main>
  )
}
