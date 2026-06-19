import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Only use this in server-side API routes — never expose to the browser
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
