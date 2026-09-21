import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { signup, login } from "../action/auth";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";

interface InviteAuthSite {
  searchParams: Promise<{
    success?: string;
    error?: string;
    inviteToken?: string;
    email?: string;
    mode?: string;
    next?: string;
  }>;
}

export default async function LoginPage({ searchParams }: InviteAuthSite) {
  // 1. Resolve Next.js 15+ searchParams Promise
  const resolvedParams = await searchParams;
  const {
    success,
    error,
    inviteToken,
    mode = 'login',
    email: initialEmail,
    next,
  } = resolvedParams;

  const supabase = await createClient();

  // 2. Redirect authenticated users to target path or workspace selection
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect(next || '/select-tenant');
  }

  const isInviteToken = Boolean(inviteToken);
  const isSignUp = mode === 'signup';

  // Helper function to maintain state across tab switching (sign in vs create account)
  const getTabUrl = (targetMode: 'login' | 'signup') => {
    const params = new URLSearchParams();
    params.set('mode', targetMode);
    if (next) params.set('next', next);
    if (inviteToken) params.set('inviteToken', inviteToken);
    if (initialEmail) params.set('email', initialEmail);
    return `/login?${params.toString()}`;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-md space-y-6 bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-lg">
        
        {/* Tab Selection Navigation */}
        <div className="flex border-b border-gray-100 pb-1">
          <Link 
            href={getTabUrl('login')}
            className={`flex-1 text-center text-sm font-semibold pb-2 border-b-2 transition-colors ${
              !isSignUp
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign In
          </Link>  
          <Link 
            href={getTabUrl('signup')}
            className={`flex-1 text-center text-sm font-semibold pb-2 border-b-2 transition-colors ${
              isSignUp
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Create Account
          </Link>  
        </div>

        {/* Dynamic Page Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignUp 
              ? 'Enter your details below to set up your account'
              : 'Sign in to access your workspace and team'}
          </p>
        </div>

        {/* Invitation Notice Box */}
        {isInviteToken && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3.5 text-sm text-blue-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-blue-800">
              <span>✉️</span> Workspace Invitation Received
            </p>
            <p className="text-[11px] text-blue-700">
              {initialEmail 
                ? `Sign in or register with ${initialEmail} to join the workspace.`
                : 'Sign in or register to accept your workspace invitation.'}
            </p>
          </div>
        )}

        {/* Error Alert Box */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 font-medium">
            {error}
          </div>
        )} 

        {/* Success Alert Box */}
        {success === 'invite-accepted' && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 font-medium">
            Invitation accepted successfully.
          </div>
        )}      
        
        {/* Main Authentication Form */}
        <form action={isSignUp ? signup : login} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address
            </label>
            <input 
              type="email"
              id="email"
              name="email"
              required
              defaultValue={initialEmail || ''}
              placeholder="name@company.com"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <input 
              type="password"
              id="password"
              name="password"
              required
              placeholder="password"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="pt-2">
            <SubmitButton className="w-full cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              {isSignUp ? 'Create Account & Continue' : 'Sign In & Continue'}
            </SubmitButton>
          </div>
        </form>

      </div>
    </div>
  );
}