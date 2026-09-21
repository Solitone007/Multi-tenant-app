'use server'

import { createClient } from '@supabase/supabase-js'

export async function createWorkspace(formData: FormData) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  // DEBUG LOG - Check Netlify Function Logs if this prints undefined!
  if (!serviceKey) {
    console.error("CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is missing in Netlify environment variables!")
    return { error: "Server Configuration Error: Service Role Key missing." }
  }

  // Explicitly instantiate admin client with service_role secret key
  const supabaseAdmin = createClient(supabaseUrl!, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const name = formData.get('name')?.toString().trim()
  const slug = formData.get('slug')?.toString().trim()

  const tenantId = crypto.randomUUID()

  // Execute insert using Service Role (bypasses ALL RLS)
  const { error: tenantError } = await supabaseAdmin
    .from('tenants')
    .insert({
      id: tenantId,
      name,
      slug,
    })

  if (tenantError) {
    console.error("Tenant Insert Error:", tenantError)
    return { error: `Failed to create workspace: ${tenantError.message}` }
  }

  return { success: true, slug }
}