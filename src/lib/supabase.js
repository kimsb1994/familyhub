// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hofegfkdxrwqsdwdvmyy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZmVnZmtkeHJ3cXNkd2R2bXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzA0NTMsImV4cCI6MjA5MjM0NjQ1M30.WVYPD6pXmiWL1Nz_msHILvF6IXWwzsR2UWl_R-ZSxgw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'familyhub-auth',
  },
})

// ─── AUTH HELPERS ────────────────────────────────────────────────────────────

export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name } }
  })
  return { data, error }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  return await supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}
