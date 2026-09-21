import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InviteButton from "./InviteButton";

interface AcceptInviteProps {
  searchParams: Promise<{ token?: string }>;
}

interface TenantRelation {
  name: string;
  slug: string;
}

export default async function AcceptInvitePage({ searchParams }: AcceptInviteProps) {
  // 1. Resolve Next.js 15+ async searchParams
  const resolvedParams = await searchParams;
  const token = resolvedParams?.token;

  if (!token) {
    redirect('/login?error=' + encodeURIComponent('Invalid or missing invitation token.'));
  }

  const supabase = await createClient();

  // 2. Query invitation details with tenant relationship
  const { data: invite } = await supabase
    .from('invitations')
    .select('id, tenant_id, email, role, accepted_at, expires_at, tenants(name, slug)')
    .eq('token', token)
    .maybeSingle();

  // 3. Validation Checks
  if (!invite) {
    redirect('/login?error=' + encodeURIComponent('Invitation link not found or invalid.'));
  }

  if (invite.accepted_at) {
    redirect('/login?error=' + encodeURIComponent('This invitation link has already been used.'));
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    redirect('/login?error=' + encodeURIComponent('This invitation link has expired. Please ask the workspace owner for a new invite.'));
  }

  // Extract tenant relationship details safely with explicit typing
  const rawTenant = invite.tenants as unknown as TenantRelation | TenantRelation[] | null;
  const tenant = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant;

  // 4. Check Current User Authentication Session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const nextPath = encodeURIComponent(`/accept-invite?token=${token}`);
    redirect(
      `/login?inviteToken=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}&next=${nextPath}`
    );
  }

  // 5. Verify Email Match
  const loggedInEmail = user.email?.toLowerCase().trim();
  const invitedEmail = invite.email?.toLowerCase().trim();
  const isEmailMismatch = loggedInEmail !== invitedEmail;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        
        {/* Workspace Brand Badge & Heading */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold text-lg border border-blue-100">
          {tenant?.name ? tenant.name.charAt(0).toUpperCase() : 'W'}
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Join {tenant?.name || 'Workspace'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            You have been invited to join as an <span className="font-semibold text-slate-700 capitalize">{invite.role || 'member'}</span>.
          </p>
        </div>

        {/* Account Match Alert Box */}
        {isEmailMismatch ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-left text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Account Mismatch</p>
            <p>
              This invitation was sent to <span className="font-semibold">{invite.email}</span>, but you are currently signed in as <span className="font-semibold">{user.email}</span>.
            </p>
            <p className="text-[11px] text-amber-700 pt-1">
              Please sign out and log in with the invited email address to proceed.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
            Signed in as <span className="font-semibold text-slate-800">{user.email}</span>
          </div>
        )}

        {/* Action Button Container */}
        <InviteButton token={token} disabled={isEmailMismatch} />

      </div>
    </div>
  );
}