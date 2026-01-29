'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Star, User, Sparkles, Zap, MessageSquare } from 'lucide-react';

export default function ModeNavigation({ currentMode, onModeChange }: { currentMode?: string, onModeChange?: (mode: string) => void }) {
  const pathname = usePathname();

  const modes = [
    { id: 'discover', label: 'Discover', icon: Sparkles, href: '/discover' },
    { id: 'decide', label: 'Decide', icon: Zap, href: '/decide' },
    { id: 'groups', label: 'Groups', icon: Users, href: '/groups' },
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
  ];

  return (
    <div className="w-full bg-background-secondary border-b border-border-color px-4 py-3 overflow-x-auto">
      <div className="flex gap-2 justify-center">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = pathname === mode.href;

          return (
            <Link
              key={mode.id}
              href={mode.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-coral text-background-primary shadow-lg shadow-coral/30'
                  : 'bg-background-tertiary text-text-primary hover:bg-background-secondary border border-border-color hover:border-coral'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{mode.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
