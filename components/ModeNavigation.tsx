'use client';

import { useState } from 'react';
import { Map, Users, MessageSquare, Star, Bookmark, User, Sparkles } from 'lucide-react';

interface ModeNavigationProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
}

export default function ModeNavigation({ currentMode, onModeChange }: ModeNavigationProps) {
  const modes = [
    { id: 'discover', label: 'Discover', icon: Sparkles, description: 'AI Recommendations' },
    { id: 'map', label: 'Map', icon: Map, description: 'Location-based' },
    { id: 'friends', label: 'Friends', icon: Users, description: 'Friends\' picks' },
    { id: 'chats', label: 'Chats', icon: MessageSquare, description: 'Group chats' },
    { id: 'ratings', label: 'Ratings', icon: Star, description: 'Your ratings' },
    { id: 'saved', label: 'Saved', icon: Bookmark, description: 'Saved items' },
    { id: 'profile', label: 'Profile', icon: User, description: 'Your profile' },
  ];

  return (
    <div className="w-full bg-[#230f10] border-b border-gray-700 px-4 py-4 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#fea4a7] text-[#230f10] shadow-lg shadow-[#fea4a7]/30'
                  : 'bg-gray-800 text-gray-50 hover:bg-gray-700 border border-gray-700 hover:border-[#fea4a7]/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
