'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { setAccessToken, api } from '@/lib/api'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    const error = params.get('error')

    if (error || !token) {
      router.replace('/login?error=oauth_failed')
      return
    }

    setAccessToken(token)
    api.get('/auth/me')
      .then(({ data }) => {
        useAuthStore.setState({ user: data.user, loading: false })
        router.replace('/dashboard')
      })
      .catch(() => router.replace('/login?error=oauth_failed'))
  }, [params, router])

  return <p className="text-sm text-muted-foreground animate-pulse">Signing you in…</p>
}

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <CallbackHandler />
      </Suspense>
    </main>
  )
}
