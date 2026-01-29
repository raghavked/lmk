'use client';

import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface NavigationProps {
  profile: any;
}

export default function Navigation({ profile }: NavigationProps) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-black">✨</div>
          <div>
            <h1 className="text-lg font-black text-black">LMK</h1>
            <p className="text-[10px] text-black/40 uppercase tracking-widest">Personalized</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          {profile?.full_name && (
            <div className="text-sm">
              <p className="font-black text-black">{profile.full_name}</p>
              <p className="text-[10px] text-black/40 uppercase tracking-widest">User</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-3 hover:bg-gray-100 rounded-2xl transition"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-3 hover:bg-gray-100 rounded-2xl transition"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white p-4 space-y-4">
          {profile?.full_name && (
            <div className="text-sm pb-4 border-b border-gray-100">
              <p className="font-black text-black">{profile.full_name}</p>
              <p className="text-[10px] text-black/40 uppercase tracking-widest">User</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 p-3 hover:bg-gray-100 rounded-2xl transition font-black"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
