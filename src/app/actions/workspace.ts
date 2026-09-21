'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function createWorkspace(formData: FormData) {
  const name = formData.get('name')?.toString().trim()
  const slug = formData.get('slug')?.toString().trim()

  if (!name || !slug) {
    return { error: 'Workspace name and slug are required.' }
  }

  const supabase = await createClient()

  // 1. Verify user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'You must be signed in to create a workspace.' }
  }

  // 2. Insert tenant WITHOUT .select()
  // Generate a random UUID for tenant_id upfront so we can reference it without reading back
  const tenantId = crypto.randomUUID()

  const { error: tenantError } = await supabase
    .from('tenants')
    .insert({
      id: tenantId,
      name,
      slug
    })

  if (tenantError) {
    return { error: `Failed to create workspace: ${tenantError.message}` }
  }

  // 3. Immediately insert Owner membership using the known tenantId
  const { error: memberError } = await supabase
    .from('memberships')
    .insert({
      tenant_id: tenantId,
      user_id: user.id,
      role: 'owner'
    })

  if (memberError) {
    return { error: `Failed to assign ownership: ${memberError.message}` }
  }

  // 4. Redirect to the newly created organization dashboard
  redirect(`/org/${slug}/dashboard?created=true`)
}