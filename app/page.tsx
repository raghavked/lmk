'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/discover');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-primary">
      <div className="text-center">
        <div className="text-6xl mb-4">✨</div>
        <h1 className="text-3xl font-black text-gray-50 mb-2">LMK</h1>
        <p className="text-gray-400 font-bold">Loading personalized recommendations...</p>
      </div>
    </div>
  );
}
