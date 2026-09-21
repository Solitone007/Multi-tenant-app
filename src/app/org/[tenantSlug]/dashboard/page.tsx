import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import InviteMemberForm from "./InviteMemberForm";

interface DashboardProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ created?: string }>;
}

export default async function Dashboard({ params, searchParams }: DashboardProps) {
  // 1. Resolve Next.js 15+ dynamic route & query parameters
  const { tenantSlug } = await params;
  const { created } = await searchParams;

  const supabase = await createClient();

  // 2. Authenticate user session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/org/${tenantSlug}/dashboard`);
  }

  // 3. Fetch workspace details by slug
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', tenantSlug)
    .maybeSingle();

  if (!tenant) {
    notFound();
  }

  // 4. Verify user membership and role in tenant
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (!membership) {
    redirect('/unauthorised');
  }

  const canInvite = ['owner', 'admin'].includes(membership.role);

  // 5. Fetch team members list for workspace context
  const { data: members } = await supabase
    .from('memberships')
    .select('id, role, created_at, user_id')
    .eq('tenant_id', tenant.id);

  return (
    <div className="flex min-h-screen justify-center bg-slate-50 p-6 sm:p-10">
      <div className="w-full max-w-lg space-y-6">
        
        {/* Workspace Card Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{tenant.name}</h1>
            <p className="text-xs text-slate-500 capitalize mt-1">
              Role: <span className="font-semibold text-slate-700">{membership.role}</span>
            </p>
          </div>
          
          <div className="text-right">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium font-medium text-blue-600">
              {tenant.slug}
            </span>
          </div>
        </div>

        {/* Workspace Creation Success Banner */}
        {created === 'true' && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-sm font-bold text-emerald-800">
              ✓
            </span>
            <div>
              <p className="font-semibold text-sm text-emerald-900">Workspace Created!</p>
              <p className="mt-0.5 text-xs text-emerald-700">
                Welcome to your new workspace. You can now invite team members to join.
              </p>
            </div>
          </div>  
        )}

        {/* Member Invitation Section or Standard Member Banner */}
        {canInvite ? (
          <InviteMemberForm tenantId={tenant.id} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
            <h2 className="text-sm font-bold text-slate-900">Team Members</h2>
            <p className="text-xs text-slate-500">
              You are currently logged in as a <strong>{membership.role}</strong>. Only workspace owners and admins can invite new members.
            </p>
            <div className="pt-2">
              <span className="inline-block rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 font-medium">
                Total Members: {members?.length || 1}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}