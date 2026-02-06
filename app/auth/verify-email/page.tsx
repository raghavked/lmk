'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';

function VerifyContent() {
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  
  const email = searchParams.get('email') || '';
  const shouldRetry = searchParams.get('retry') === 'true';

  useEffect(() => {
    if (!email) {
      router.push('/auth/signup');
    }
  }, [email, router]);

  useEffect(() => {
    if (shouldRetry && email) {
      const autoResend = async () => {
        setResending(true);
        try {
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
          });
          if (error) {
            setError('The verification email could not be sent. Please tap "Resend" to try again, or check your spam folder.');
          } else {
            setSuccess('Verification email sent! Check your inbox.');
          }
        } catch (err: any) {
          setError('Could not send verification email. Please tap "Resend" to try again.');
        } finally {
          setResending(false);
        }
      };
      autoResend();
    }
  }, [shouldRetry, email, supabase]);

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) {
        const fallbackResponse = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const fallbackData = await fallbackResponse.json();
        if (fallbackResponse.ok) {
          setSuccess(fallbackData.message || 'Verification email sent! Check your inbox.');
        } else {
          setError(fallbackData.error || 'Could not send verification email. Please try again later.');
        }
      } else {
        setSuccess('Verification email resent! Check your inbox.');
      }
    } catch (err: any) {
      setError('Could not send verification email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4 py-12">
      <div className="max-w-md w-full bg-[#161B22] rounded-3xl shadow-2xl p-10 border border-[#30363D]">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo className="text-[#feafb0]" size={48} />
          </div>
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 bg-[#feafb0]/10 rounded-full">
              <Mail className="w-8 h-8 text-[#feafb0]" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-50 mb-3 tracking-tight">Check Your Email</h1>
          <p className="text-gray-400 font-medium leading-relaxed">
            We sent a verification link to<br/>
            <span className="text-gray-50 font-bold">{email}</span>
          </p>
          <p className="text-gray-500 text-sm mt-4 leading-relaxed">
            Click the link in your email to verify your account. Once verified, you'll be signed in automatically.
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-800 rounded-xl text-green-400 text-sm text-center">
            {success}
          </div>
        )}

        <div className="mt-10 text-center border-t border-[#30363D] pt-8">
          <p className="text-gray-500 text-sm mb-4">Didn't receive the email? Check your spam folder or</p>
          <button 
            onClick={handleResend}
            disabled={resending}
            className="text-coral font-bold hover:underline transition-colors disabled:opacity-50 flex items-center justify-center mx-auto"
          >
            {resending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Resending...
              </>
            ) : (
              'Resend verification email'
            )}
          </button>
          <div className="mt-6">
            <Link href="/auth/signup" className="inline-flex items-center gap-2 text-sm text-gray-400 font-bold hover:text-gray-50 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0D1117] text-white">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
