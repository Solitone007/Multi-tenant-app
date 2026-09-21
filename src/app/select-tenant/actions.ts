'use server'

import { createClient } from "@/utils/supabase/server"

export type CreateWorkspaceResult = {
  error?: string
  redirectTo?: string
  success?: boolean
}

/**
 * Helper to generate URL-safe slugs (e.g., "Acme Corp" -> "acme-corp")
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove non-word characters
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start
    .replace(/-+$/, '')          // Trim - from end
}

export async function createWorkspace(
  formData: FormData
): Promise<CreateWorkspaceResult> {
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

  // 2. Extract and Validate Input Data
  console.log("--> Step 2: Extracting form data...")
  const rawName = formData.get('name')?.toString().trim() || ""
  const rawSlug = formData.get('slug')?.toString().trim() || ""

  if (!rawName) {
    console.error("❌ Validation Error: Workspace name is missing.")
    return { error: "Workspace name is required." }
  }

  if (rawName.length < 2 || rawName.length > 50) {
    return { error: "Workspace name must be between 2 and 50 characters." }
  }

  // Generate clean slug or fallback to name-slug
  let targetSlug = rawSlug ? slugify(rawSlug) : slugify(rawName)

  if (!targetSlug) {
    console.error("❌ Validation Error: Slug resolution produced an empty string.")
    return { error: "Please enter a valid workspace URL identifier." }
  }

  // 3. Check for existing slug collisions and append short unique suffix if taken
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', targetSlug)
    .maybeSingle()

  if (existingTenant) {
    targetSlug = `${targetSlug}-${Math.random().toString(36).substring(2, 6)}`
  }

  console.log("✅ Form Payload:", { name: rawName, finalSlug: targetSlug })

  // 4. Insert Tenant into Supabase
  console.log("--> Step 3: Inserting record into 'tenants' table...")
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name: rawName, slug: targetSlug })
    .select('id, name, slug')
    .single()

  if (tenantError) {
    console.error("❌ Database Insert Error (Tenants):", tenantError.message)
    console.error("   Full Error Object:", JSON.stringify(tenantError, null, 2))
    
    if (tenantError.code === '23505') {
      return { error: "A workspace with this URL identifier already exists. Please choose a different URL." }
    }
    return { error: `Failed to create workspace: ${tenantError.message}` }
  }

  console.log("✅ Tenant Created Successfully:", tenant)

  // 5. Create Owner Membership Record
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

    // Rollback tenant record to prevent orphan workspace creation
    console.log("⚠️ Rolling back created tenant record...")
    await supabase.from('tenants').delete().eq('id', tenant.id)

    return { error: "Failed to establish workspace ownership permissions. Please try again." }
  }

  console.log("✅ Owner Membership Assigned Successfully")
  console.log("--> Step 5: Returning redirection target route...")

  // 6. Return target route for client component routing
  return { 
    success: true,
    redirectTo: `/org/${tenant.slug}/dashboard?created=true` 
  }
}