'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Star, MapPin, ExternalLink, Zap } from 'lucide-react';
import RatingModal from './RatingModal';
import RecommendationDetailModal from './RecommendationDetailModal';
import haptics from '@/lib/haptics';

interface ObjectCardProps {
  object: any;
  rank?: number;
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
}

export default function ObjectCard({ object, rank, score, explanation }: ObjectCardProps) {
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

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
                  // Scale 0-10 to 0-5 stars
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

  const displayTags = explanation?.tags || object.tags || [];
  const imageUrl = object.primary_image?.url || object.image_url;
  
  // Find the best external rating to display
  const externalRating = object.external_ratings?.find((r: any) => r.source === 'yelp' || r.source === 'tmdb' || r.source === 'imdb');
  const displayScore = externalRating ? externalRating.score : null;
  const displaySource = externalRating ? externalRating.source.toUpperCase() : null;

  // Calculate AI Match Score percentage (0-100)
  const aiMatchScore = score ? Math.min(Math.max(Math.round(score * 10), 0), 100) : 85;

  return (
    <>
      <div 
        className="bg-background-secondary rounded-[32px] shadow-lg border border-gray-700 overflow-hidden active:scale-[0.98] transition-all duration-500 group flex flex-col h-full hover:border-coral/30 hover:shadow-coral/20 cursor-pointer"
        onClick={() => {
          haptics.impact();
          setDetailModalOpen(true);
        }}
      >
        {/* Image Section */}
        <div className="relative h-64 w-full overflow-hidden">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={object.title || 'Image'}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, 400px"
              onError={handleImageError}
              unoptimized={true}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-5xl">
              {getCategoryIcon(object.category)}
            </div>
          )}
          
          {/* Gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-background-secondary via-transparent to-transparent" />
          
          {/* AI Match Score Badge - Prominent Coral Accent */}
          <div className="absolute top-4 right-4">
            <div className="bg-coral/90 backdrop-blur-md text-background-primary px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] shadow-lg shadow-coral/30 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-current" />
              {aiMatchScore}% Match
            </div>
          </div>

          {/* Category Badge */}
          <div className="absolute bottom-4 left-4">
            <span className="bg-background-secondary/90 backdrop-blur-md text-gray-50 px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] shadow-sm border border-gray-600">
              {object.category?.replace('_', ' ') || 'Recommendation'}
            </span>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="p-8 flex flex-col flex-1">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-50 leading-tight mb-2 group-hover:text-coral transition-colors">
              {object.title}
            </h3>
            
            {/* Tagline / Quick Look Info */}
            {explanation?.tagline && (
              <p className="text-coral font-semibold text-[11px] uppercase tracking-[0.15em] leading-relaxed">
                {explanation.tagline}
              </p>
            )}

            {object.location?.city && (
              <div className="flex items-center gap-2 text-gray-400 mt-3">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium truncate">
                  {object.location.city}, {object.location.state || object.location.country}
                </span>
              </div>
            )}
          </div>
          
          <p className="text-gray-300 text-sm font-medium leading-relaxed mb-8">
            {explanation?.why_youll_like || object.description || "The AI is generating a personalized description..."}
          </p>
          
          {/* Detailed Ratings - Dynamic Metrics */}
          {explanation?.detailed_ratings && Object.keys(explanation.detailed_ratings).length > 0 && (
            <div className="space-y-5 mb-8">
              {Object.entries(explanation.detailed_ratings).map(([label, val]) => 
                renderRatingBar(label, val as number)
              )}
            </div>
          )}
          
          {/* Tags & Footer */}
          <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-700">
            <div className="flex flex-wrap gap-2 max-w-[70%]">
              {displayTags.slice(0, 2).map((tag: string) => (
                <span key={tag} className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest border border-gray-700 hover:border-coral/50 hover:text-coral transition-colors">
                  #{tag.replace(/\s+/g, '').replace('#', '')}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.notification('success');
                  setRatingModalOpen(true);
                }}
                className="w-12 h-12 bg-coral text-background-primary rounded-[16px] flex items-center justify-center shadow-lg shadow-coral/30 active:scale-90 transition-all hover:bg-coral/90"
                aria-label="Rate this item"
              >
                <Star className="w-5 h-5 fill-current" />
              </button>
              {object.source_links?.[0]?.url && (
                <a 
                  href={object.source_links[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-12 h-12 bg-gray-800 text-gray-400 rounded-[16px] flex items-center justify-center active:scale-90 transition-all border border-gray-700 hover:border-coral/50 hover:text-coral"
                  aria-label="View source"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {ratingModalOpen && (
        <RatingModal
          object={object}
          onClose={() => setRatingModalOpen(false)}
        />
      )}
      
      {detailModalOpen && (
        <RecommendationDetailModal
          object={object}
          score={score}
          explanation={explanation}
          onClose={() => setDetailModalOpen(false)}
        />
      )}
    </>
  );
}
