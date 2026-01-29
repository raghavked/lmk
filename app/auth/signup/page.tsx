'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Loader2, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
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
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/verify-email?email=' + encodeURIComponent(email));
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-coral mx-auto mb-6" />
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Account created!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Check your email to verify your account and get started with personalized recommendations.
          </p>
          <div className="animate-spin inline-block">
            <Loader2 className="w-5 h-5 text-coral" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background-light dark:bg-background-dark">
      {/* Left Panel: Branding & Visuals */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between p-12 bg-[#181011] overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-coral/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-coral/5 rounded-full blur-[100px]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center size-10 bg-coral rounded-xl">
            <span className="text-background-dark font-bold text-lg">✨</span>
          </div>
          <h2 className="text-white text-2xl font-bold tracking-tight">LMK</h2>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-bold leading-tight mb-6 text-white">Discover the future of recommendations.</h1>
          <p className="text-coral/80 text-xl leading-relaxed">
            Join a community of tech-savvy enthusiasts and get personalized recommendations that match your lifestyle.
          </p>

          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-3">
              <img
                className="w-10 h-10 rounded-full border-2 border-[#181011] object-cover"
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop"
                alt="User"
              />
              <img
                className="w-10 h-10 rounded-full border-2 border-[#181011] object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop"
                alt="User"
              />
              <img
                className="w-10 h-10 rounded-full border-2 border-[#181011] object-cover"
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop"
                alt="User"
              />
            </div>
            <div>
              <p className="text-white font-bold">50K+ users</p>
              <p className="text-coral/60 text-sm">already discovering</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Sign Up Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 md:px-16 lg:px-24 bg-background-light dark:bg-background-dark">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="size-6 text-coral">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fillRule="evenodd" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">LMK</span>
          </div>

          <div className="text-center md:text-left mb-10">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Get started today
            </h1>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
              Create your account and start getting personalized recommendations.
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-200 ml-1">
                Full name
              </label>
              <div className="mt-2 relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="block w-full rounded-xl border-0 py-4 pl-12 pr-5 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-800 bg-white dark:bg-zinc-900/50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-coral sm:text-sm sm:leading-6 transition-all"
                />
              </div>
            </div>

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
              <label htmlFor="password" className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-200 ml-1">
                Password
              </label>
              <div className="mt-2 relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border-0 py-4 pl-12 pr-5 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-800 bg-white dark:bg-zinc-900/50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-coral sm:text-sm sm:leading-6 transition-all"
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-200 ml-1">
                Confirm password
              </label>
              <div className="mt-2 relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-full bg-coral px-3 py-4 text-sm font-bold leading-6 text-background-primary shadow-sm hover:bg-coral/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <p className="text-center text-xs text-slate-500 mt-6">
              By signing up, you agree to our{' '}
              <a href="#" className="text-coral hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-coral hover:underline">
                Privacy Policy
              </a>
            </p>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <a href="/auth/login" className="font-bold leading-6 text-coral hover:text-coral/80 transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
