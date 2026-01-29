'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';

export default function SignInPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting to sign in with:', email);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      console.log('Sign in response:', { data, signInError });

      if (signInError) {
        console.error('Sign in error:', signInError);
        setError(signInError.message || 'Failed to sign in');
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Clear form
        setEmail('');
        setPassword('');
        
        // Wait for session to be fully established in cookies
        // Then perform a hard redirect to ensure session is recognized
        setTimeout(() => {
          window.location.href = '/discover';
        }, 1000);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Section: Visual Impact */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 bg-[#181011] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#fea4a7]/5 via-transparent to-transparent"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#fea4a7]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#fea4a7]/5 rounded-full blur-[120px]"></div>
        
        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full">
          <div className="flex items-center gap-3">
            <Logo className="text-[#8b3a3a]" size={32} />
            <span className="text-2xl font-bold tracking-tight text-white">LMK</span>
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">Discover what's happening around you.</h2>
            <p className="text-lg text-gray-400 font-medium">Join a community of tech-savvy explorers getting personalized lifestyle recommendations.</p>
          </div>
        </div>
      </div>

      {/* Right Section: Sign In Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-[#230f10]">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Logo className="text-[#8b3a3a]" size={24} />
            <span className="text-xl font-bold tracking-tight text-gray-50">LMK</span>
          </div>

          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-50 mb-2">Welcome back</h1>
            <p className="text-gray-400">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-5">
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
                  className="w-full h-14 pl-12 pr-4 bg-gray-800 border border-gray-700 rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-[#fea4a7]/50 focus:border-[#fea4a7]/50 transition-all outline-none"
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
                  placeholder="Enter your password"
                  className="w-full h-14 pl-12 pr-12 bg-gray-800 border border-gray-700 rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-[#fea4a7]/50 focus:border-[#fea4a7]/50 transition-all outline-none"
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400 transition-colors z-10"
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

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link href="#" className="text-sm text-[#fea4a7] hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 mt-6 bg-[#fea4a7] text-[#230f10] font-bold text-lg rounded-full hover:bg-[#fea4a7]/90 active:scale-[0.98] transition-all shadow-lg shadow-[#fea4a7]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-base">
              Don't have an account?{' '}
              <Link className="text-coral font-bold hover:underline ml-1" href="/auth/signup">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
