import { useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  })

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({ ...prev, session, user: session?.user ?? null }))
      if (session?.user) fetchProfile(session.user.id)
      else setState(prev => ({ ...prev, loading: false }))
    })

    // Escucha cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({ ...prev, session, user: session?.user ?? null }))
      if (session?.user) fetchProfile(session.user.id)
      else setState(prev => ({ ...prev, profile: null, loading: false }))
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setState(prev => ({ ...prev, profile: data, loading: false }))
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    ...state,
    signOut,
    isAdmin: state.profile?.is_admin ?? false,
    isActive: state.profile?.is_active ?? false,
  }
}
