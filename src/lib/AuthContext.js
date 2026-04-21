// src/lib/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session,  setSession]  = useState(undefined) // undefined = loading
  const [member,   setMember]   = useState(null)
  const [family,   setFamily]   = useState(null)

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load member + family when session changes
  useEffect(() => {
    if (!session?.user) { setMember(null); setFamily(null); return }
    loadMemberAndFamily(session.user.id)
  }, [session])

  async function loadMemberAndFamily(userId) {
    const { data } = await supabase
      .from('family_members')
      .select('*, families(*)')
      .eq('user_id', userId)
      .single()
    if (data) {
      setMember(data)
      setFamily(data.families)
    }
  }

  const value = { session, member, family, loading: session === undefined, reload: () => loadMemberAndFamily(session?.user?.id) }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
