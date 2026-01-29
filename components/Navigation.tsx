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
          className="md:hidden p-2 text-gray-400 hover:text-gray-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-800 bg-background-primary p-4 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col gap-4">
            {profile?.full_name && (
              <div className="px-2">
                <p className="font-black text-gray-50">{profile.full_name}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">User</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-2 py-3 text-gray-400 hover:text-coral transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-bold">Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
