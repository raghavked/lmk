'use client';

import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

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
    <nav className="sticky top-0 z-40 bg-background-primary/95 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Logo className="text-[#8b3a3a]" size={28} />
          <div>
            <h1 className="text-lg font-black text-gray-50">LMK</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Personalized</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          {profile?.full_name && (
            <div className="text-sm">
              <p className="font-black text-gray-50">{profile.full_name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">User</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-3 hover:bg-background-secondary rounded-2xl transition text-gray-400 hover:text-coral"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-3 hover:bg-background-secondary rounded-2xl transition text-gray-400"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-gray-800 bg-background-primary p-4 space-y-4">
          {profile?.full_name && (
            <div className="text-sm pb-4 border-b border-gray-800">
              <p className="font-black text-gray-50">{profile.full_name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">User</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 p-3 hover:bg-background-secondary rounded-2xl transition font-black text-gray-400 hover:text-coral"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
