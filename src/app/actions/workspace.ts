'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export async function createWorkspace(formData: FormData) {
  const name = formData.get('name')?.toString().trim()
  const slug = formData.get('slug')?.toString().trim()

  if (!name || !slug) {
    return { error: 'Workspace name and slug are required.' }
  }

  // 1. Verify the current user session using standard cookies client
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in to create a workspace.' }
  }

  // 2. Instantiate Admin Client with Service Role Key (Bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  const tenantId = crypto.randomUUID()

  // 3. Create Tenant (bypasses RLS)
  const { error: tenantError } = await supabaseAdmin
    .from('tenants')
    .insert({
      id: tenantId,
      name,
      slug,
    })

  if (tenantError) {
    return { error: `Failed to create workspace: ${tenantError.message}` }
  }

  // 4. Create Owner Membership
  const { error: memberError } = await supabaseAdmin
    .from('memberships')
    .insert({
      tenant_id: tenantId,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    return { error: `Failed to assign workspace ownership: ${memberError.message}` }
  }

  // 5. Redirect to Dashboard
  redirect(`/org/${slug}/dashboard?created=true`)
}