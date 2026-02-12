'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          fullName: fullName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        let errorMessage = result.error || 'Failed to create account';
        if (response.status === 409) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (response.status === 429) {
          errorMessage = 'Too many signup attempts. Please wait a minute and try again.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setFullName('');
      setEmail('');
      setPassword('');
      setAgreeToTerms(false);
    } catch (err: any) {
      setError('Unable to connect. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPassword(prev => !prev);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D1117] px-4">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-[#feafb0]/10 rounded-full">
              <svg className="w-8 h-8 text-[#feafb0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-50 mb-2">Account Created!</h2>
          <p className="text-gray-400 mb-4">Check your email for a verification link to activate your account.</p>
          <Link href="/auth/login" className="text-[#feafb0] font-bold hover:underline text-base">Go to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col md:flex-row bg-[#161B22]">
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between p-12 bg-[#0D1117] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#feafb0]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-[#feafb0]/5 rounded-full blur-[100px]"></div>
        <div className="relative z-10 flex items-center gap-3">
          <Logo className="text-[#feafb0]" size={40} />
          <h2 className="text-white text-2xl font-bold tracking-tight">LMK</h2>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-bold leading-tight mb-6 text-white">Discover the future of tech.</h1>
          <p className="text-gray-400 text-xl leading-relaxed">
            Join a community of tech-savvy enthusiasts and get personalized recommendations that match your lifestyle.
          </p>
        </div>
        <div className="relative z-10 text-gray-600 text-sm">
          © 2024 LMK Recommendations. All rights reserved.
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-16 bg-[#161B22] overflow-y-auto">
        <div className="md:hidden flex items-center gap-2 mb-8">
          <Logo className="text-[#feafb0]" size={32} />
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
                  className="w-full h-14 pl-12 pr-4 bg-[#21262D] border border-[#30363D] rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-[#feafb0]/50 focus:border-[#feafb0]/50 transition-all outline-none"
                />
              </div>
            </div>

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
                  className="w-full h-14 pl-12 pr-4 bg-[#21262D] border border-[#30363D] rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-[#feafb0]/50 focus:border-[#feafb0]/50 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-gray-50 text-sm font-medium ml-1">Password</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={isHydrated && showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a strong password"
                  className="w-full h-14 pl-12 pr-12 bg-[#21262D] border border-[#30363D] rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-[#feafb0]/50 focus:border-[#feafb0]/50 transition-all outline-none"
                />
                {isHydrated && (
                  <button
                    type="button"
                    onClick={handleTogglePassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400 transition-colors z-10 p-1 cursor-pointer"
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
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 px-1 mt-2">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-[#30363D] bg-[#21262D] text-[#feafb0] focus:ring-[#feafb0] focus:ring-offset-[#161B22]"
                />
              </div>
              <label htmlFor="terms" className="text-sm text-gray-400 cursor-pointer">
                I agree to the{' '}
                <Link href="#" className="text-[#feafb0] hover:underline font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-[#feafb0] hover:underline font-medium">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !isHydrated}
              className="w-full h-14 mt-6 bg-[#feafb0] text-[#0D1117] font-bold text-lg rounded-full hover:bg-[#feafb0]/90 active:scale-[0.98] transition-all shadow-lg shadow-[#feafb0]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-base">
              Already have an account?{' '}
              <Link className="text-[#feafb0] font-bold hover:underline ml-1" href="/auth/login">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
