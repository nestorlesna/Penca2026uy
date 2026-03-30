import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
}

// Tipado manual via interfaces en src/types — sin genérico hasta tener `supabase gen types`
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
