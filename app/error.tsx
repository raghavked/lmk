'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-[32px] p-8 max-w-md w-full text-center border border-red-100">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-black mb-2">Something went wrong</h1>
        <p className="text-black/60 font-bold mb-8">{error.message || 'An unexpected error occurred'}</p>
        <button
          onClick={() => reset()}
          className="w-full py-4 bg-black text-white rounded-2xl font-black hover:bg-gray-900 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
