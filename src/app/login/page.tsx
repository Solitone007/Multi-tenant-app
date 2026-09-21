import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { signup, login } from "../action/auth";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";


interface InviteAuthSite {
  searchParams: {
    success?: string 
    error?: string 
    inviteToken?: string 
    email?: string 
    mode?: string
    next?: string 
  }
}

export default async function LoginPage({searchParams}: InviteAuthSite) {
  const {success, error, inviteToken, mode= 'login', email: initialEmail, next} = await searchParams 
  const supabase = await createClient()

  const {data: {user}} = await supabase.auth.getUser()

  if (user) {
    redirect(next || '/select-tenant')
  }

  const isInviteToken = Boolean(inviteToken)
  const isSignUp = mode === 'signup'

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 mx-auto">
        <div className="w-full max-w-md space-y-6 bg-white p-8 sm:p-10 rounded-2xl border border-gray-100 shadow-xl">
          
          {!isInviteToken && (
            <div className="flex border-b border-gray-100 ">
                <Link 
                  href={`/login?mode=login${next ?  `&next=${encodeURIComponent(next)}` : ''}`}
                  className={`flex-1 text-center text-sm font-medium ${!isSignUp
                  ? 'border-b-2 border-blue-600 text-blue-600 pb-2'
                  : 'text-gray-400 hover:text-gray-600'}`}  >
                  Sign in
                </Link>  
                <Link 
                   href={`/login?mode=signup${next ?  `&next=${encodeURIComponent(next)}` : ''}`}
                  className={`flex-1 text-center text-sm font-medium ${isSignUp
                  ? 'border-b-2 border-blue-600 text-blue-600 pb-2'
                  : 'text-gray-400 hover:text-gray-600'}`}  >
                  Create an Account
                </Link>  
            </div>
          )}

          <div>
            <h2 className="text-2xl text-emerald-800 font-bold">
              {isSignUp 
              ? 'Create an Account'
              : 'Welcome'}
            </h2>
            <p className="mt-1 text-sm text-emerald-400">
              {isSignUp 
              ? 'Enter your credentials below to create your new account '
              : 'Sign in to manage your workspace and projects'}
            </p>
          </div>

          {error && (
            <div className="rounded-xl text-red-700 bg-red-80 border border-red-200 py-3 px-2 text-sm">
              {error}
            </div>
           )} 

          {success === 'invite-accepted' && (
            <div className="text-emerald-500 text-sm font-medium">
              Congratulation! You have accepted an invite
            </div>
           )}      
          
          <form action={isSignUp ? signup : login} className="space-y-6">
            {next && <input type="hidden" name="next" value={next}/>}
            {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken}/>}

           <div>
             <label htmlFor="email" className="block text-sm text-gray-800 font-medium mb-2">Email Address</label>
            <input 
              type="email"
              id="email"
              name="email"
              required
              defaultValue={initialEmail || ''}
              placeholder="sample@gmail.com"
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-200 rounded-xl px-3.5 py-2 text-gray-700 border w-full"/>
           </div>
            <div>
             <label htmlFor="password" className="block text-sm text-gray-800 font-medium mb-2">Password</label>
            <input 
              type="password"
              id="password"
              name="password"
              required
              placeholder="password"
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-200 rounded-xl px-3.5 py-2 text-gray-700 border w-full "/>
           </div>

           <div className="mt-3">
            <SubmitButton className="w-full">
              {isSignUp ? 'Create an Account' : 'Sign in'}
            </SubmitButton>
           </div>
              
          </form>
          
        </div>
      </div>
    </div>
  )


}