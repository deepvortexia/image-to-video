'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const getReturnOrigin = (): string => {
  const match = document.cookie.match(/(^| )deepvortex-return-origin=([^;]+)/)
  const origin = match ? decodeURIComponent(match[2]) : null
  document.cookie = 'deepvortex-return-origin=; domain=.deepvortexai.com; path=/; max-age=0'
  return origin || window.location.origin
}

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    const handleCallback = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const errorParam = url.searchParams.get('error')
      const errorDescription = url.searchParams.get('error_description')

      if (errorParam) {
        setError(errorDescription || errorParam)
        return
      }

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          if (exchangeError.message.includes('code verifier')) {
            const { data: sessionData } = await supabase.auth.getSession()
            if (sessionData?.session) {
              window.location.href = getReturnOrigin()
              return
            }
            setError('Session expired. Please try signing in again.')
            setDebugInfo('The PKCE code verifier was not found. This usually means the cookie was lost between starting sign-in and completing it.')
            return
          }
          setError(exchangeError.message)
          return
        }

        console.log('[AuthCallback] Session established:', data.session ? 'success' : 'no session')
        window.location.href = getReturnOrigin()
        return
      }

      // Implicit flow fallback
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        await supabase.auth.getSession()
        window.location.href = getReturnOrigin()
        return
      }

      // Fallback: wait for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          window.location.href = getReturnOrigin()
        }
      })

      setTimeout(() => {
        subscription.unsubscribe()
        window.location.href = getReturnOrigin()
      }, 5000)
    }

    handleCallback()
  }, [])

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0a0a0a', color: '#ff4444',
        fontFamily: 'Orbitron, sans-serif', flexDirection: 'column', gap: '1rem',
        padding: '2rem', textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem' }}>⚠️</div>
        <p style={{ maxWidth: '400px' }}>Sign in failed: {error}</p>
        {debugInfo && <p style={{ fontSize: '0.8rem', color: '#888', maxWidth: '400px' }}>{debugInfo}</p>}
        <a href="/" style={{ color: '#D4AF37', textDecoration: 'underline', marginTop: '1rem' }}>
          Return to Home
        </a>
        <button
          onClick={() => window.location.href = getReturnOrigin()}
          style={{
            marginTop: '0.5rem', padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #D4AF37, #B8960C)',
            border: 'none', borderRadius: '8px', color: '#0a0a0a',
            fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0a0a0a', color: '#D4AF37',
      fontFamily: 'Orbitron, sans-serif', flexDirection: 'column', gap: '1rem'
    }}>
      <div style={{ fontSize: '2rem' }}>⚡</div>
      <p>Completing sign in...</p>
    </div>
  )
}
