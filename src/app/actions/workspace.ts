'use server'

import { createClient } from "@/utils/supabase/server"

export type CreateWorkspaceState = {
  error?: string
  success?: boolean
  tenant?: {
    id: string
    name: string
    slug: string
  }
} | null

/**
 * Helper to slugify workspace names (e.g., "Acme Corp" -> "acme-corp")
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '')          // Trim - from end of text
}

export async function createWorkspace(
  _prevState: CreateWorkspaceState,
  formData: FormData
): Promise<CreateWorkspaceState> {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("SERVER ACTION ERROR: User is not authenticated!", authError)
    return { error: "You must be signed in to create a workspace." }
  }

  // 2. Validate input fields
  const rawName = formData.get('name')?.toString().trim() || ""
  const rawSlug = formData.get('slug')?.toString().trim() || ""

  if (!rawName) {
    return { error: "Workspace name is required." }
  }

  if (rawName.length < 2) {
    return { error: "Workspace name must be at least 2 characters long." }
  }

  // Fallback to slugifying the workspace name if slug input is empty
  let slug = rawSlug ? slugify(rawSlug) : slugify(rawName)

  if (!slug) {
    return { error: "Please enter a valid workspace URL slug." }
  }

  // Prevent reserved route slugs from conflicting with Next.js app routes
  const reservedSlugs = ['api', 'admin', 'login', 'signup', 'auth', 'accept-invite', 'select-tenant', 'dashboard', 'settings']
  if (reservedSlugs.includes(slug)) {
    slug = `${slug}-workspace`
  }

  // 3. Insert new tenant record
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name: rawName, slug })
    .select('id, name, slug')
    .single()

  if (tenantError) {
    // Check for PostgreSQL Unique Constraint Violation (Code 23505)
    if (tenantError.code === '23505') {
      return { error: `The URL slug "${slug}" is already taken. Please enter a custom slug.` }
    }

    console.error("DATABASE TENANT INSERT FAILED:", tenantError.message)
    return { error: `Failed to create workspace: ${tenantError.message}` }
  }

  // 4. Create initial membership record linking the creator as 'owner'
  const { error: membershipError } = await supabase
    .from('memberships')
    .insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: 'owner',
    })

  if (membershipError) {
    console.error("MEMBERSHIP INSERT FAILED:", membershipError.message)
    
    // Rollback created tenant to avoid orphan workspaces without an owner
    await supabase.from('tenants').delete().eq('id', tenant.id)

    return { error: "Failed to set up workspace owner permissions. Please try again." }
  }

  return { 
    success: true, 
    tenant 
  }
}