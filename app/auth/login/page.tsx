'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push('/discover');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-background-light dark:bg-background-dark">
      {/* Left Section: Visual Impact */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 bg-zinc-900 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1517457373614-b7152f800fd1?w=1200&h=1200&fit=crop")',
          }}
        />
        {/* Dark Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background-dark/20 to-background-dark" />
        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full">
          <div className="flex items-center gap-3">
            <div className="size-8 text-coral">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fillRule="evenodd" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">LMK</span>
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Discover what's happening around you.
            </h2>
            <p className="text-lg text-slate-300 font-medium">
              Join a community of tech-savvy explorers getting personalized lifestyle recommendations.
            </p>
          </div>
        </div>
      </div>

      {/* Right Section: Sign In Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-background-light dark:bg-background-dark">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="size-6 text-coral">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fillRule="evenodd" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">LMK</span>
          </div>

          <div className="text-center lg:text-left mb-10">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Welcome back
            </h1>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
              Sign in to LMK for your personalized recommendations.
            </p>
          </div>

          <div className="mt-10">
            <form onSubmit={handleSignIn} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-200 ml-1">
                  Email address
                </label>
                <div className="mt-2 relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="block w-full rounded-xl border-0 py-4 pl-12 pr-5 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-800 bg-white dark:bg-zinc-900/50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-coral sm:text-sm sm:leading-6 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between ml-1">
                  <label htmlFor="password" className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-200">
                    Password
                  </label>
                </div>
                <div className="mt-2 relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-xl border-0 py-4 pl-12 pr-5 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-800 bg-white dark:bg-zinc-900/50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-coral sm:text-sm sm:leading-6 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-950/30 border border-red-900/50 p-4">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end">
                <a href="#" className="text-sm font-semibold text-coral hover:text-coral/80 underline underline-offset-4">
                  Forgot password?
                </a>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-full bg-coral px-3 py-4 text-sm font-bold leading-6 text-background-primary shadow-sm hover:bg-coral/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            </form>

            {/* Divider */}
            <div className="relative mt-10">
              <div aria-hidden="true" className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-sm font-medium leading-6">
                <span className="bg-background-light dark:bg-background-dark px-4 text-slate-500">Or continue with</span>
              </div>
            </div>

            {/* Social Logins */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <button className="flex w-full items-center justify-center gap-3 rounded-full bg-white dark:bg-zinc-900 px-3 py-3 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-800 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors font-bold">
                Google
              </button>
              <button className="flex w-full items-center justify-center gap-3 rounded-full bg-white dark:bg-zinc-900 px-3 py-3 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-800 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors font-bold">
                Apple
              </button>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <a href="/auth/signup" className="font-bold leading-6 text-coral hover:text-coral/80 transition-colors">
              Sign up for free
            </a>
          </p>
        </div>

        {/* Simple Footer Info */}
        <div className="mt-auto pt-10 text-center lg:text-left">
          <p className="text-xs text-slate-500">
            © 2024 LMK Technologies Inc. All rights reserved.
            <span className="mx-1">·</span>
            <a href="#" className="hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
