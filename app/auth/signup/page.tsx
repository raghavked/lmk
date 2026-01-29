'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/auth/verify-email');
        }, 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch (err) {
      setError('Failed to sign up with Google');
    }
  };

  const handleGitHubSignUp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch (err) {
      setError('Failed to sign up with GitHub');
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#230f10] px-4">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-[#fea4a7]/10 rounded-full">
              <svg className="w-8 h-8 text-[#fea4a7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Created!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Check your email to verify your account.</p>
          <p className="text-sm text-slate-500">Redirecting you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col md:flex-row bg-white dark:bg-[#230f10]">
      {/* Left Panel: Branding & Visuals */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between p-12 bg-[#181011] overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#fea4a7]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-[#fea4a7]/5 rounded-full blur-[100px]"></div>
        <div className="relative z-10 flex items-center gap-3">
          <Logo className="text-[#8b3a3a]" size={40} />
          <h2 className="text-white text-2xl font-bold tracking-tight">LMK</h2>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-bold leading-tight mb-6 text-white">Discover the future of tech.</h1>
          <p className="text-[#bc9a9b] text-xl leading-relaxed">
            Join a community of tech-savvy enthusiasts and get personalized recommendations that match your lifestyle.
          </p>
          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-3">
              <img className="w-10 h-10 rounded-full border-2 border-[#181011] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPhzX_lVEMrAbv_qKlzNhgGVnazudBq6ASpuEexIjOFQlNl6zgUiQ7DocjDBOwuRsKEH0qGsKI7H3KVLtGTrfGKcOjhRvckc2TANOsbxItMR7VwhKP3WDEauVCSvxteDiBIpENXfy5Jh5JIDOkTWyou3HfeVp-i_BcOGPhAR34GEYwf32sOnCEG5coQ0gXmk9QvhMNLWwBFYKHFc0JxMXIzSJcPawfP6uRc1yAzA_VfdRmalAOr1zW4Fu3YSZeKbvKisehzoEu-x0" alt="User 1" />
              <img className="w-10 h-10 rounded-full border-2 border-[#181011] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTp7rcpMBQYFJm_kkVUY1LfA98SXldBT3VzFZjnNhoniVgyJbxaN1y33cMxoc_hKJAc19N31dwu1oKIeO5VxJBaPNte-jCH04P9XnSnRB6v2nThY52Hl14WCTGza8V6LiIMBQQem2MwuhDtwWQs52m1bxM5pKLGwUvHjxN1wJ27rKPR1xhcb96GKjslO7UsluIvpDjVAwYvZpZ2jUmId3da2UmEOdY-8eF-Cl_WmgJOT8qos8zTMzBEUqpdHgAMfTBFnhtJ5Fl3TM" alt="User 2" />
              <img className="w-10 h-10 rounded-full border-2 border-[#181011] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpz5ZxhXnW2ikRGnER_CYVcPohdzdJb7ATP4ugg8No1dxS61YJXyfNLGU0lonFJDnPmQEwIY61AXsFJgXkU8EpNg6RjvpDNqyaw3CNKFe-koCvTmBSOsz3GmveXID6BDPpscW2WE0fC95iCnvXabkN0P7YWJxwvZ2wbGbUZY9gpqa85Wg2Om2E1xHsNhHjiJPp9XIMRTxTtvSPPJ5DZEwhnht3EJc5QvCja7ce17sx64-jLEO5ASSI_13w0Mo-ZD2AH0kRlOgeABI" alt="User 3" />
            </div>
            <p className="text-sm text-[#bc9a9b]">Join <span className="text-white font-semibold">10k+</span> members today</p>
          </div>
        </div>
        <div className="relative z-10 text-[#56393a] text-sm">
          © 2024 LMK Recommendations. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Sign Up Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-16 bg-white dark:bg-[#230f10] overflow-y-auto">
        {/* Mobile Logo */}
        <div className="md:hidden flex items-center gap-2 mb-8">
          <Logo className="text-[#8b3a3a]" size={32} />
          <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">LMK</h2>
        </div>

        <div className="w-full max-w-[420px] flex flex-col">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create an account</h2>
            <p className="text-[#bc9a9b] text-base">Start your personalized tech journey today.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="flex flex-col gap-5">
            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-900 dark:text-white text-sm font-medium ml-1">Full Name</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#bc9a9b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  className="w-full h-14 pl-12 pr-4 bg-[#281b1b] dark:bg-[#281b1b] border border-[#3a2727] rounded-full text-white placeholder:text-[#56393a] focus:ring-2 focus:ring-[#fea4a7] focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-900 dark:text-white text-sm font-medium ml-1">Email</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#bc9a9b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full h-14 pl-12 pr-4 bg-[#281b1b] dark:bg-[#281b1b] border border-[#3a2727] rounded-full text-white placeholder:text-[#56393a] focus:ring-2 focus:ring-[#fea4a7] focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-900 dark:text-white text-sm font-medium ml-1">Password</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#bc9a9b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a strong password"
                  className="w-full h-14 pl-12 pr-12 bg-[#281b1b] dark:bg-[#281b1b] border border-[#3a2727] rounded-full text-white placeholder:text-[#56393a] focus:ring-2 focus:ring-[#fea4a7] focus:border-transparent transition-all outline-none"
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#bc9a9b] hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 px-1 mt-2">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-[#3a2727] bg-[#281b1b] text-[#fea4a7] focus:ring-[#fea4a7] focus:ring-offset-[#230f10]"
                />
              </div>
              <label className="text-sm text-[#bc9a9b] leading-tight cursor-pointer" htmlFor="terms">
                I agree to the <Link className="text-[#fea4a7] hover:underline font-medium" href="#">Terms of Service</Link> and <Link className="text-[#fea4a7] hover:underline font-medium" href="#">Privacy Policy</Link>.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 mt-4 bg-[#fea4a7] text-[#230f10] font-bold text-lg rounded-full hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[#fea4a7]/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Social Sign Up */}
          <div className="mt-8">
            <div className="relative flex items-center justify-center mb-8">
              <div className="w-full h-px bg-[#3a2727]"></div>
              <span className="absolute bg-white dark:bg-[#230f10] px-4 text-xs text-[#56393a] uppercase tracking-widest">Or sign up with</span>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="flex-1 h-12 flex items-center justify-center gap-2 border border-[#3a2727] rounded-full hover:bg-[#281b1b] transition-colors text-white"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"></path>
                </svg>
                <span className="text-sm font-medium">Google</span>
              </button>
              <button
                type="button"
                onClick={handleGitHubSignUp}
                className="flex-1 h-12 flex items-center justify-center gap-2 border border-[#3a2727] rounded-full hover:bg-[#281b1b] transition-colors text-white"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"></path>
                </svg>
                <span className="text-sm font-medium">GitHub</span>
              </button>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-[#bc9a9b] text-base">
              Already have an account?{' '}
              <Link className="text-[#fea4a7] font-bold hover:underline ml-1" href="/auth/login">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
