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
  const [showPassword, setShowPassword] = useState(false);
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a strong password"
                  className="w-full h-14 pl-12 pr-12 bg-[#281b1b] dark:bg-[#281b1b] border border-[#3a2727] rounded-full text-white placeholder:text-[#56393a] focus:ring-2 focus:ring-[#fea4a7] focus:border-transparent transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#bc9a9b] hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m4.753-4.753L3.596 3.596m16.807 16.807L3.596 3.596m0 0A10.05 10.05 0 1120.404 20.404m0 0L3.596 3.596" />
                    </svg>
                  )}
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
