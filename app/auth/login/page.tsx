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
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-xl border-0 py-4 px-5 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-800 bg-white dark:bg-zinc-900/50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#fea4a7] sm:text-sm sm:leading-6"
                  />
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

            {/* Divider */}
            <div className="relative mt-10">
              <div aria-hidden="true" className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-sm font-medium leading-6">
                <span className="bg-white dark:bg-[#121212] px-4 text-slate-500">Or continue with</span>
              </div>
            </div>

            {/* Social Logins */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-white dark:bg-zinc-900 px-3 py-3 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-800 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className="text-sm font-bold">Google</span>
              </button>
              <button
                type="button"
                onClick={handleAppleSignIn}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-white dark:bg-zinc-900 px-3 py-3 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-800 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className="text-sm font-bold">Apple</span>
              </button>
            </div>
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
