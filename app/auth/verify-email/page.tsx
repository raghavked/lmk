'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';

function VerifyContent() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  
  const email = searchParams.get('email') || '';

  useEffect(() => {
    if (!email) {
      router.push('/auth/signup');
    }
  }, [email, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Account verified successfully!');
        // Use window.location.href for hard redirect to ensure middleware and session are fresh
        setTimeout(() => {
          window.location.href = '/discover?verified=true';
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

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
        setError(error.message);
      } else {
        setSuccess('Verification code resent to your email.');
      }
    } catch (err: any) {
      setError(err.message);
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
          <h1 className="text-3xl font-extrabold text-gray-50 mb-2 tracking-tight">Verify Email</h1>
          <p className="text-gray-400 font-medium">
            Enter the 6-digit code sent to <br/>
            <span className="text-gray-50 font-bold">{email}</span>
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

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-gray-50 text-sm font-medium ml-1">Verification Code</label>
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              className="w-full h-14 text-center text-2xl tracking-[0.5em] font-bold bg-[#21262D] border border-[#30363D] rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-[#feafb0]/50 focus:border-[#feafb0]/50 transition-all outline-none"
              maxLength={6}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full h-14 bg-coral text-[#0D1117] font-bold text-lg rounded-full hover:bg-coral/90 active:scale-[0.98] transition-all shadow-lg shadow-coral/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Verify Account'
            )}
          </button>
        </form>
        
        <div className="mt-10 text-center border-t border-[#30363D] pt-8">
          <button 
            onClick={handleResend}
            disabled={resending}
            className="text-coral font-bold hover:underline transition-colors disabled:opacity-50"
          >
            {resending ? 'Resending...' : "Didn't receive a code? Resend"}
          </button>
          <div className="mt-4">
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
