'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/discover');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="text-6xl mb-4">✨</div>
        <h1 className="text-3xl font-black text-black mb-2">LMK</h1>
        <p className="text-black/60 font-bold">Loading personalized recommendations...</p>
      </div>
    </div>
  );
}
