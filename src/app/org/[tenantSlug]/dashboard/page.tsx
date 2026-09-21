import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import InviteMemberForm from "./InviteMemberForm";

interface DashboardProps {
  params: Promise<{tenantSlug: string}>
  searchParams: Promise<{created?: string}>
}

export default async function Dashboard({params, searchParams}: DashboardProps) {
  const {tenantSlug} = await params 
  const {created} = await searchParams 
  const supabase = await createClient() 

  const {data: {user}} = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/org/${tenantSlug}/dashboard`)
  }

  const {data: tenant} = await supabase.from('tenants') 
  .select('id, name, slug')
  .eq('slug', tenantSlug)
  .maybeSingle()

  if (!tenant) {
    notFound()
  }

  const {data: membership} = await supabase.from('memberships')
  .select('role')
  .eq('user_id', user.id)
  .eq('tenant_id', tenant.id) 
  .maybeSingle()

  if (!membership) {
    redirect('/unauthorised')
  }

  return (
    <div className="flex min-h-screen justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="rounded-2xl p-6 border border-gray-200 shadow-sm bg-blue-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl text-gray-800 font-medium">{tenant.name}</h2>
            <p className="text-sm text-gray-500 capitalize">Role: {membership.role}</p>
          </div>
          
          <div className="text-sm text-gray-500">WorkspaceID: {tenant.id}</div>
          
        </div>

        {created === 'true' && (
          <div className="p-3 rounded-2xl  bg-emerald-50/50 border border-emerald-200 text-emerald-700 font-medium flex items-start">
            <span className="h-6 w-6 rounded-full flex items-center justify-center bg-emerald-50/50 shrink-0 text-emerald-700 border border-emerald-200 font-semibold">
              ✔
            </span>
            <p className="text-emerald-800 font-semibold">Success!</p>
            <p className="text-xs text-yellow-600 mt-0.5">Welcome, You can invite any member in the a membership group</p>
          </div>  
        )}

        <div className="rounded-2xl bg-white shadow-sm p-6 border border-gray-100">
          <InviteMemberForm tenantId={tenant.id}/>
        </div>
      </div>
    </div>
  )

  
}