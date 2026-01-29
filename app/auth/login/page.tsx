'use client';

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

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push('/discover');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch (err) {
      setError('Failed to sign in with Google');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch (err) {
      setError('Failed to sign in with Apple');
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Section: Visual Impact */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 bg-zinc-900 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuBVkcWgswKaSl-l6B2yZcVxVulRtQ6k1UKhzsAZo408-wb-CyCr1NC7GNqGURLRDihUUOEdHMbWFdkMk6a7Tht1qwnxEzrL0_usUdAT5Oeo68Bem8hpeSfYG1bGFoj36-kIiotQJsBlgSf8oTOpc74LgigAC50ZLvG9bOSS9yyod8qVnm1Dp-TZoCrxiLRlXxKnmG6H0wx7nhEDgQj4e5FIlIzjMuwEiv9fKuzpb-BQdpOuBqIYO3F2XZb1QOCQX-YqRCUA3ckNSJE")`,
          }}
        />
        {/* Dark Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-900/20 to-zinc-900"></div>
        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full">
          <div className="flex items-center gap-3">
            <Logo className="text-[#8b3a3a]" size={32} />
            <span className="text-2xl font-bold tracking-tight text-white">LMK</span>
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">Discover what's happening around you.</h2>
            <p className="text-lg text-slate-300 font-medium">Join a community of tech-savvy explorers getting personalized lifestyle recommendations.</p>
          </div>
        </div>
      </div>

      {/* Right Section: Sign In Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-white dark:bg-[#121212]">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Logo className="text-[#8b3a3a]" size={24} />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">LMK</span>
          </div>

          <div className="text-center lg:text-left mb-10">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">Welcome back</h1>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-400">Sign in to LMK for your personalized recommendations.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mt-10">
            <form onSubmit={handleSignIn} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-200 ml-1" htmlFor="email">
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="block w-full rounded-xl border-0 py-4 px-5 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-800 bg-white dark:bg-zinc-900/50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#fea4a7] sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between ml-1">
                  <label className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-200" htmlFor="password">
                    Password
                  </label>
                </div>
                <div className="mt-2 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-xl border-0 py-4 px-5 pr-12 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-800 bg-white dark:bg-zinc-900/50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#fea4a7] sm:text-sm sm:leading-6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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

              <div className="flex items-center justify-end">
                <Link className="text-sm font-semibold text-[#fea4a7] hover:text-[#fea4a7]/80 underline underline-offset-4 decoration-[#fea4a7]/30" href="/auth/forgot-password">
                  Forgot password?
                </Link>
              </div>

              {/* Login Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-full bg-[#fea4a7] px-3 py-4 text-sm font-bold leading-6 text-black shadow-sm hover:bg-[#fea4a7]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fea4a7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            </form>


          </div>

          <p className="mt-10 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link className="font-bold leading-6 text-[#fea4a7] hover:text-[#fea4a7]/80 transition-colors" href="/auth/signup">
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Simple Footer Info */}
        <div className="mt-auto pt-10 text-center lg:text-left">
          <p className="text-xs text-slate-500">
            © 2024 LMK Technologies Inc. All rights reserved.
            <span className="mx-1">·</span>
            <Link className="hover:underline" href="#">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
