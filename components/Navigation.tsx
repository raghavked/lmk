'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Home, Users, User, LogOut, Menu, X } from 'lucide-react';

interface NavigationProps {
  profile: any;
}

export default function Navigation({ profile }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };
  
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/discover" className="text-2xl font-bold text-primary-600">
            LMK
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/discover" 
              className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition"
            >
              <Home className="w-5 h-5" />
              <span>Discover</span>
            </Link>
            <Link 
              href="/friends" 
              className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition"
            >
              <Users className="w-5 h-5" />
              <span>Friends</span>
            </Link>
            <Link 
              href="/profile" 
              className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition"
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-700"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              <Link 
                href="/discover" 
                className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="w-5 h-5" />
                <span>Discover</span>
              </Link>
              <Link 
                href="/friends" 
                className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="w-5 h-5" />
                <span>Friends</span>
              </Link>
              <Link 
                href="/profile" 
                className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="w-5 h-5" />
                <span>Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
