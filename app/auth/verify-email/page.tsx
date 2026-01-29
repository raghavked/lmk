'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const email = searchParams.get('email') || '';
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendEmail = async () => {
    setResendLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    setVerifying(true);
    setError(null);

    try {
      const { data, error: getSessionError } = await supabase.auth.getSession();

      if (getSessionError || !data.session) {
        setError('Session not found. Please try signing up again.');
        return;
      }

      // Check if email is verified
      const { data: user, error: getUserError } = await supabase.auth.getUser();

      if (getUserError || !user.user) {
        setError('User not found. Please try signing up again.');
        return;
      }

      if (user.user.email_confirmed_at) {
        setVerified(true);
        setTimeout(() => {
          router.push('/discover');
        }, 2000);
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background-light dark:bg-background-dark px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-12 justify-center">
          <div className="size-8 text-coral">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fillRule="evenodd" />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">LMK</span>
        </div>

        {verified ? (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-coral mx-auto mb-6" />
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Email verified!</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Your email has been verified successfully. Redirecting you to discover personalized recommendations...
            </p>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 text-coral animate-spin" />
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Mail className="w-16 h-16 text-coral mx-auto mb-6" />
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Verify your email</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              We've sent a verification link to:
            </p>
            <p className="text-slate-900 dark:text-white font-semibold mb-8">
              {email}
            </p>

            <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-2xl p-6 mb-8 border border-slate-200 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Click the link in your email to verify your account and unlock personalized recommendations.
              </p>
              <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2 text-left">
                <li>1. Check your inbox (and spam folder)</li>
                <li>2. Click the verification link</li>
                <li>3. Return here to confirm</li>
              </ol>
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/30 border border-red-900/50 p-4 mb-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300 text-left">{error}</p>
              </div>
            )}

            {resendSuccess && (
              <div className="rounded-lg bg-green-950/30 border border-green-900/50 p-4 mb-6">
                <p className="text-sm text-green-300">Verification email sent! Check your inbox.</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleVerifyEmail}
                disabled={verifying}
                className="flex w-full items-center justify-center rounded-full bg-coral px-3 py-4 text-sm font-bold leading-6 text-background-primary shadow-sm hover:bg-coral/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Checking...
                  </>
                ) : (
                  "I've verified my email"
                )}
              </button>

              <button
                onClick={handleResendEmail}
                disabled={resendLoading}
                className="flex w-full items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-900 px-3 py-4 text-sm font-bold leading-6 text-slate-900 dark:text-white shadow-sm hover:bg-slate-300 dark:hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  'Resend verification email'
                )}
              </button>
            </div>

            <p className="mt-8 text-sm text-slate-500">
              Wrong email?{' '}
              <a href="/auth/signup" className="text-coral hover:text-coral/80 font-semibold transition-colors">
                Sign up again
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
