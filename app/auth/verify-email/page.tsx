'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleResendEmail = async () => {
    setResendLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email || '',
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
      }
    } catch (err) {
      setError('Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleChangeEmail = () => {
    router.push('/auth/signup');
  };

  return (
    <>
      <header className="w-full border-b border-gray-200 dark:border-[#2a2a2a] px-6 lg:px-40 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="text-[#8b3a3a]" size={32} />
          <h2 className="text-gray-900 dark:text-white text-xl font-bold leading-tight tracking-tight">LMK</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-600 dark:text-gray-400 text-sm font-medium hover:text-[#fea4a7] transition-colors">Help</button>
          <Link href="/auth/login" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-[#fea4a7] text-black text-sm font-bold transition-transform hover:scale-105">
            Log In
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 bg-white dark:bg-[#121212] min-h-screen">
        <div className="max-w-[500px] w-full bg-white dark:bg-[#1c1c1c] border border-gray-100 dark:border-[#2a2a2a] rounded-xl shadow-2xl p-8 lg:p-12">
          <div className="flex justify-center mb-8">
            <div className="relative flex items-center justify-center w-24 h-24 bg-[#fea4a7]/10 rounded-full">
              <svg className="w-12 h-12 text-[#fea4a7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#fea4a7] rounded-full border-4 border-white dark:border-[#1c1c1c]"></div>
            </div>
          </div>

          <div className="text-center space-y-4 mb-10">
            <h1 className="text-gray-900 dark:text-white text-3xl font-bold tracking-tight">Verify your email</h1>
            <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed">
              We've sent a verification link to your email address. Please check your inbox and click the link to activate your account.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm">
              Verification email sent! Check your inbox.
            </div>
          )}

          <div className="space-y-6">
            <button className="w-full h-14 bg-[#fea4a7] text-black font-bold text-lg rounded-full hover:shadow-lg hover:shadow-[#fea4a7]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Email App
            </button>

            <div className="text-center">
              <button
                onClick={handleResendEmail}
                disabled={resendLoading}
                className="text-[#fea4a7] font-semibold hover:underline decoration-2 underline-offset-8 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 mt-12 pt-8 border-t border-gray-100 dark:border-[#2a2a2a]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Entered the wrong address?{' '}
              <button
                onClick={handleChangeEmail}
                className="text-[#fea4a7] font-semibold hover:underline decoration-2 underline-offset-4 ml-1"
              >
                Change Email
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Background Decorations */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#fea4a7]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[0%] right-[0%] w-[30%] h-[30%] bg-[#fea4a7]/5 rounded-full blur-3xl"></div>
      </div>
    </>
  );
}
