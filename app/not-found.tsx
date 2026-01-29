import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="text-center space-y-6">
        <div className="text-7xl font-black text-black">404</div>
        <div>
          <h1 className="text-2xl font-black text-black mb-2">Page not found</h1>
          <p className="text-black/60 font-bold">The page you're looking for doesn't exist.</p>
        </div>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-6 py-4 bg-black text-white rounded-2xl font-black hover:bg-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Discover
        </Link>
      </div>
    </div>
  );
}
