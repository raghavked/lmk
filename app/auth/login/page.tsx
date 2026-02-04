'use client';

import { useState, useEffect } from 'react';
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
  const [isHydrated, setIsHydrated] = useState(false);

  // Ensure component is hydrated before rendering interactive elements
  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        let errorMessage = signInError.message || 'Failed to sign in';
        if (signInError.message?.includes('Invalid login')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (signInError.message?.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Ensure profile exists (fallback for users who signed up before)
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();
          
          if (!existingProfile) {
            await fetch('/api/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: data.user.id,
                full_name: data.user.user_metadata?.full_name || '',
              }),
            });
          }
        } catch (profileError) {
          console.error('Profile check/create error:', profileError);
        }
        
        // Clear form
        setEmail('');
        setPassword('');
        
        // Use hard redirect to ensure session is recognized
        setTimeout(() => {
          window.location.href = '/discover';
        }, 500);
      }
    } catch (err: any) {
      setError('Unable to connect. Please check your internet connection.');
      setLoading(false);
    }
  };

  const handleTogglePassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggle password visibility:', !showPassword);
    setShowPassword(prev => !prev);
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Section: Visual Impact */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 bg-[#0D1117] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#feafb0]/5 via-transparent to-transparent"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#feafb0]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#feafb0]/5 rounded-full blur-[120px]"></div>
        
        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full">
          <div className="flex items-center gap-3">
            <Logo className="text-[#feafb0]" size={32} />
            <span className="text-2xl font-bold tracking-tight text-white">LMK</span>
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">Discover what's happening around you.</h2>
            <p className="text-lg text-gray-400 font-medium">Join a community of tech-savvy explorers getting personalized lifestyle recommendations.</p>
          </div>
        </div>
      </div>

      {/* Right Section: Sign In Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-[#161B22]">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Logo className="text-[#feafb0]" size={24} />
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
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="name@example.com"
                  className="w-full h-14 pl-12 pr-4 bg-[#21262D] border border-[#30363D] rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-[#feafb0]/50 focus:border-[#feafb0]/50 transition-all outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-50 text-sm font-medium ml-1">Password</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={isHydrated && showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full h-14 pl-12 pr-14 bg-[#21262D] border border-[#30363D] rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-[#feafb0]/50 focus:border-[#feafb0]/50 transition-all outline-none"
                />
                {isHydrated && (
                  <button
                    type="button"
                    onClick={handleTogglePassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors z-20 p-2 cursor-pointer rounded-full hover:bg-gray-700/50"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link href="#" className="text-sm text-[#feafb0] hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isHydrated}
              className="w-full h-14 mt-6 bg-[#feafb0] text-[#0D1117] font-bold text-lg rounded-full hover:bg-[#feafb0]/90 active:scale-[0.98] transition-all shadow-lg shadow-[#feafb0]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
              <Link className="text-[#feafb0] font-bold hover:underline ml-1" href="/auth/signup">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
