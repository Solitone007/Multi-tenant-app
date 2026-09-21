'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function createWorkspace(formData: FormData) {
  console.log("==========================================")
  console.log("=== CREATE WORKSPACE ACTION TRIGGERED ===")
  console.log("==========================================")

  const supabase = await createClient()

  // 1. Verify User Authentication Session
  console.log("--> Step 1: Checking authentication session...")
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("❌ Auth Failure:", authError?.message || "No user session found")
    return { error: "You must be signed in to create a workspace." }
  }
  console.log("✅ Authenticated User ID:", user.id)

  // 2. Extract and Sanitize Input Data
  console.log("--> Step 2: Extracting form data...")
  const rawName = formData.get('name') as string
  const rawSlug = formData.get('slug') as string

  if (!rawName) {
    console.error("❌ Validation Error: Workspace name is missing.")
    return { error: "Workspace name is required." }
  }

  // Format base slug: lowercase, replace spaces/special chars with hyphens
  const baseSlug = (rawSlug || rawName)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // Append a unique suffix to guarantee slug uniqueness
  const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`

  console.log("✅ Form Payload:", { name: rawName, baseSlug, finalSlug: uniqueSlug })

  // 3. Insert Tenant into Supabase
  console.log("--> Step 3: Inserting record into 'tenants' table...")
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name: rawName, slug: uniqueSlug })
    .select()
    .single()

  if (tenantError) {
    console.error("❌ Database Insert Error (Tenants):", tenantError.message)
    console.error("   Full Error Object:", JSON.stringify(tenantError, null, 2))
    
    if (tenantError.code === '23505') {
      return { error: "A workspace with a similar URL identifier already exists. Please choose another name." }
    }
    return { error: tenantError.message }
  }

  console.log("✅ Tenant Created Successfully:", tenant)

  // 4. Create Owner Membership Record
  console.log("--> Step 4: Inserting record into 'memberships' table...")
  const { error: memberError } = await supabase
    .from('memberships')
    .insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    console.error("❌ Database Insert Error (Memberships):", memberError.message)
    console.error("   Full Error Object:", JSON.stringify(memberError, null, 2))
    return { error: memberError.message }
  }

  console.log("✅ Owner Membership Assigned Successfully")
  console.log("--> Step 5: Redirecting to workspace dashboard...")

  // 5. Redirect on success
  redirect(`/org/${tenant.slug}/dashboard`)
}