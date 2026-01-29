'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { X, Star, MapPin, ExternalLink, Zap, Share2, Heart } from 'lucide-react';
import haptics from '@/lib/haptics';

interface RecommendationDetailModalProps {
  object: any;
  score?: number;
  explanation?: {
    hook?: string;
    why_youll_like?: string;
    friend_callout?: string;
    caveats?: string;
    detailed_ratings?: Record<string, number>;
    tags?: string[];
    tagline?: string;
  };
  onClose: () => void;
  onSimilarClick?: (item: any) => void;
}

export default function RecommendationDetailModal({
  object,
  score,
  explanation,
  onClose,
  onSimilarClick
}: RecommendationDetailModalProps) {
  const [imageError, setImageError] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'restaurants': return '🍽️';
      case 'movies': return '🎬';
      case 'tv_shows': return '📺';
      case 'youtube_videos': return '🎥';
      case 'reading': return '📚';
      case 'activities': return '🎯';
      default: return '✨';
    }
  };

  const renderRatingBar = (label: string, value: unknown) => {
    const numValue = typeof value === 'number' && Number.isFinite(value) ? value : 7.5;
    return (
      <div key={label} className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">{label}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-coral">{numValue.toFixed(1)}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`w-2.5 h-2.5 ${star <= Math.ceil(numValue / 2) ? 'fill-coral text-coral' : 'fill-gray-700 text-gray-700'}`} 
                />
              ))}
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-coral/70 to-coral rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${numValue * 10}%` }}
          />
        </div>
      </div>
    );
  };

  const aiMatchScore = score ? Math.min(Math.max(Math.round(score * 10), 0), 100) : 85;
  const imageUrl = object.primary_image?.url || object.image_url;
  const displayTags = explanation?.tags || object.tags || [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-background-secondary rounded-[32px] border border-gray-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Close Button */}
        <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-700 bg-background-secondary/95 backdrop-blur">
          <h2 className="text-2xl font-bold text-gray-50">Recommendation Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Hero Image */}
          <div className="relative h-80 w-full rounded-[24px] overflow-hidden">
            {imageUrl && !imageError ? (
              <Image
                src={imageUrl}
                alt={object.title || 'Image'}
                fill
                className="object-cover"
                sizes="100vw"
                onError={handleImageError}
                unoptimized={true}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-6xl">
                {getCategoryIcon(object.category)}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background-secondary via-transparent to-transparent" />
            
            {/* AI Match Score Badge */}
            <div className="absolute top-4 right-4">
              <div className="bg-coral/90 backdrop-blur-md text-background-primary px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] shadow-lg shadow-coral/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-current" />
                {aiMatchScore}% Match
              </div>
            </div>
          </div>

          {/* Title and Basic Info */}
          <div>
            <h1 className="text-4xl font-bold text-gray-50 mb-3">{object.title}</h1>
            
            {explanation?.tagline && (
              <p className="text-coral font-semibold text-sm uppercase tracking-[0.15em] mb-4">
                {explanation.tagline}
              </p>
            )}

            {object.location?.city && (
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {object.location.city}, {object.location.state || object.location.country}
                </span>
              </div>
            )}
          </div>

          {/* Main Description */}
          <div className="bg-gray-800/50 rounded-[20px] p-6 border border-gray-700">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-[0.1em] mb-3">Why You'll Like This</h3>
            <p className="text-gray-200 leading-relaxed">
              {explanation?.why_youll_like || object.description || "The AI is generating a personalized description..."}
            </p>
          </div>

          {/* Detailed Ratings */}
          {explanation?.detailed_ratings && Object.keys(explanation.detailed_ratings).length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-[0.1em] mb-4">AI-Powered Metrics</h3>
              <div className="space-y-5">
                {Object.entries(explanation.detailed_ratings).map(([label, val]) => 
                  renderRatingBar(label, val as number)
                )}
              </div>
            </div>
          )}

          {/* Additional Info */}
          {explanation?.friend_callout && (
            <div className="bg-coral/10 rounded-[20px] p-6 border border-coral/30">
              <h3 className="text-sm font-bold text-coral uppercase tracking-[0.1em] mb-2">Friend Callout</h3>
              <p className="text-gray-200">{explanation.friend_callout}</p>
            </div>
          )}

          {explanation?.caveats && (
            <div className="bg-yellow-900/20 rounded-[20px] p-6 border border-yellow-700/30">
              <h3 className="text-sm font-bold text-yellow-300 uppercase tracking-[0.1em] mb-2">Things to Know</h3>
              <p className="text-gray-200">{explanation.caveats}</p>
            </div>
          )}

          {/* Tags */}
          {displayTags.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-[0.1em] mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {displayTags.map((tag: string) => (
                  <span key={tag} className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest border border-gray-700 hover:border-coral/50 hover:text-coral transition-colors">
                    #{tag.replace(/\s+/g, '').replace('#', '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={() => {
                haptics.notification('success');
                setIsFavorited(!isFavorited);
              }}
              className={`flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${
                isFavorited
                  ? 'bg-coral/20 text-coral border border-coral/50'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-coral/50 hover:text-coral'
              }`}
            >
              <Heart className={`w-4 h-4 inline-block mr-2 ${isFavorited ? 'fill-current' : ''}`} />
              {isFavorited ? 'Saved' : 'Save'}
            </button>

            <button
              onClick={() => haptics.notification('success')}
              className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs bg-gray-800 text-gray-300 border border-gray-700 hover:border-coral/50 hover:text-coral transition-all"
            >
              <Share2 className="w-4 h-4 inline-block mr-2" />
              Share
            </button>

            {object.source_links?.[0]?.url && (
              <a
                href={object.source_links[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs bg-coral text-background-primary hover:bg-coral/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-coral/30"
              >
                <ExternalLink className="w-4 h-4" />
                Go
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
