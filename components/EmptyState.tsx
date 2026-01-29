'use client';

import { Zap } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

export default function EmptyState({
  title = "No results found",
  description = "Try adjusting your search or expanding your radius to discover more recommendations.",
  actionLabel = "Try Again",
  onAction,
  icon = "✨"
}: EmptyStateProps) {
  return (
    <div className="bg-background-secondary rounded-[40px] p-16 text-center border border-gray-700 shadow-sm">
      <div className="text-6xl mb-6">{icon}</div>
      <h3 className="text-2xl font-bold text-gray-50 mb-2">{title}</h3>
      <p className="text-gray-400 font-medium mb-8 max-w-xs mx-auto">
        {description}
      </p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-10 py-4 bg-coral text-background-primary rounded-2xl hover:bg-coral/90 transition font-bold uppercase tracking-widest text-xs shadow-lg shadow-coral/30 inline-flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
