import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Dispatch = {
  id: number
  date: string
  car: string
  dept: string
  user: string
  passengers: string
  description: string
  depart: string
  arrive: string
  dest: string
  fuel: number
  km: string
  locked: boolean
  created_at: string
}
