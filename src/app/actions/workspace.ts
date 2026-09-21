'use server'

import { createClient } from "@/utils/supabase/server"

export async function createWorkspace(formData: FormData) {
  const supabase = await createClient()

  // 1. Get current logged-in user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("SERVER ACTION ERROR: User is not authenticated!", authError)
    return { error: "You must be signed in to create a workspace." }
  }

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string

  // 2. Insert into tenants
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name, slug })
    .select()
    .single()

  if (tenantError) {
    console.error("DATABASE INSERT FAILED:", tenantError.message)
    return { error: tenantError.message }
  }

  console.log("SUCCESSFULLY CREATED TENANT:", tenant)
  return { success: true, tenant }
}