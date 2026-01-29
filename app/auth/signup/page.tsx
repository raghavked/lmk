'use client';

export const dynamic = 'force-dynamic';

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

    // Validation
    if (!fullName.trim()) {
      setError('Full name is required');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting to sign up with:', { email, fullName });

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      console.log('Sign up response:', { data, signUpError });

      if (signUpError) {
        console.error('Sign up error:', signUpError);
        setError(signUpError.message || 'Failed to create account');
        setLoading(false);
        return;
      }

      if (data?.user) {
        setSuccess(true);
        // Clear form
        setFullName('');
        setEmail('');
        setPassword('');
        setAgreeToTerms(false);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/auth/verify-email?email=' + encodeURIComponent(email));
        }, 2000);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#230f10] px-4">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-coral/10 rounded-full">
              <svg className="w-8 h-8 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-50 mb-2">Account Created!</h2>
          <p className="text-gray-400 mb-4">Check your email to verify your account.</p>
          <p className="text-sm text-gray-500">Redirecting you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col md:flex-row bg-[#230f10]">
      {/* Left Panel: Branding & Visuals */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between p-12 bg-[#181011] overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-coral/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-coral/5 rounded-full blur-[100px]"></div>
        <div className="relative z-10 flex items-center gap-3">
          <Logo className="text-[#8b3a3a]" size={40} />
          <h2 className="text-white text-2xl font-bold tracking-tight">LMK</h2>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-bold leading-tight mb-6 text-white">Discover the future of tech.</h1>
          <p className="text-gray-400 text-xl leading-relaxed">
            Join a community of tech-savvy enthusiasts and get personalized recommendations that match your lifestyle.
          </p>
          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#181011] bg-coral/30"></div>
              <div className="w-10 h-10 rounded-full border-2 border-[#181011] bg-coral/20"></div>
              <div className="w-10 h-10 rounded-full border-2 border-[#181011] bg-coral/10"></div>
            </div>
            <p className="text-sm text-gray-400">Join <span className="text-white font-semibold">10k+</span> members today</p>
          </div>
        </div>
        <div className="relative z-10 text-gray-600 text-sm">
          © 2024 LMK Recommendations. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Sign Up Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-16 bg-[#230f10] overflow-y-auto">
        {/* Mobile Logo */}
        <div className="md:hidden flex items-center gap-2 mb-8">
          <Logo className="text-[#8b3a3a]" size={32} />
          <h2 className="text-gray-50 text-xl font-bold tracking-tight">LMK</h2>
        </div>

        <div className="w-full max-w-[420px] flex flex-col">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-gray-50 mb-2">Create an account</h2>
            <p className="text-gray-400 text-base">Start your personalized tech journey today.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="flex flex-col gap-5">
            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-50 text-sm font-medium ml-1">Full Name</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  className="w-full h-14 pl-12 pr-4 bg-gray-800 border border-gray-700 rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-coral/50 focus:border-coral/50 transition-all outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-50 text-sm font-medium ml-1">Email</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full h-14 pl-12 pr-4 bg-gray-800 border border-gray-700 rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-coral/50 focus:border-coral/50 transition-all outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-50 text-sm font-medium ml-1">Password</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a strong password"
                  className="w-full h-14 pl-12 pr-12 bg-gray-800 border border-gray-700 rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-coral/50 focus:border-coral/50 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400 transition-colors"
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
                  className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-coral focus:ring-coral focus:ring-offset-[#230f10]"
                />
              </div>
              <label className="text-sm text-gray-400 leading-tight cursor-pointer" htmlFor="terms">
                I agree to the <Link className="text-coral hover:underline font-medium" href="#">Terms of Service</Link> and <Link className="text-coral hover:underline font-medium" href="#">Privacy Policy</Link>.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 mt-4 bg-coral text-[#0D1117] font-bold text-lg rounded-full hover:bg-coral/90 active:scale-[0.98] transition-all shadow-lg shadow-coral/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
            <p className="text-gray-400 text-base">
              Already have an account?{' '}
              <Link className="text-coral font-bold hover:underline ml-1" href="/auth/login">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
