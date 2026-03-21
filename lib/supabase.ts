import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const CHUNK_SIZE = 3000

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

const setCookieRaw = (name: string, value: string, maxAge: number = 31536000) => {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; domain=.deepvortexai.com; path=/; max-age=${maxAge}; secure; samesite=lax`
}

const removeCookieRaw = (name: string) => {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; domain=.deepvortexai.com; path=/; max-age=0; secure; samesite=lax`
}

const getChunkedCookie = (key: string): string | null => {
  const singleValue = getCookie(key)
  if (singleValue) return singleValue
  let result = ''
  let index = 0
  while (true) {
    const chunk = getCookie(`${key}.${index}`)
    if (!chunk) break
    result += chunk
    index++
  }
  return result || null
}

const setChunkedCookie = (key: string, value: string): void => {
  let i = 0
  while (getCookie(`${key}.${i}`)) { removeCookieRaw(`${key}.${i}`); i++ }
  removeCookieRaw(key)
  if (value.length <= CHUNK_SIZE) {
    setCookieRaw(key, value)
    return
  }
  const chunks = Math.ceil(value.length / CHUNK_SIZE)
  for (let i = 0; i < chunks; i++) {
    setCookieRaw(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
  }
}

const removeChunkedCookie = (key: string): void => {
  removeCookieRaw(key)
  let i = 0
  while (getCookie(`${key}.${i}`)) { removeCookieRaw(`${key}.${i}`); i++ }
}

// Chunked cookie storage with sessionStorage backup for PKCE code verifier.
const customCookieStorage = {
  getItem: (key: string): string | null => {
    if (key.includes('code-verifier')) {
      try {
        const ss = sessionStorage.getItem(key)
        if (ss) return ss
      } catch {}
    }
    return getChunkedCookie(key)
  },
  setItem: (key: string, value: string): void => {
    if (key.includes('code-verifier')) {
      try { sessionStorage.setItem(key, value) } catch {}
    }
    setChunkedCookie(key, value)
  },
  removeItem: (key: string): void => {
    if (key.includes('code-verifier')) {
      try { sessionStorage.removeItem(key) } catch {}
    }
    removeChunkedCookie(key)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storageKey: 'deepvortex-auth',
    storage: customCookieStorage,
  },
})

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  credits: number
  created_at: string
  updated_at: string
}
