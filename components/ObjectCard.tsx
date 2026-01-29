'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Star, MapPin, ExternalLink, Bookmark, Share2 } from 'lucide-react';
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
    metrics?: Record<string, number>;
    tags?: string[];
    tagline?: string;
  };
}

export default function ObjectCard({ object, rank, score, explanation }: ObjectCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

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

  // Get category-specific metrics
  const getMetrics = () => {
    const category = object.category?.toLowerCase();
    const baseMetrics = explanation?.metrics || {};

    if (category === 'restaurants') {
      return {
        'Cuisine Diversity': baseMetrics['cuisine_diversity'] || 8.5,
        'Authenticity': baseMetrics['authenticity'] || 8.0,
        'Ambiance': baseMetrics['ambiance'] || 8.5,
        'Value': baseMetrics['value'] || 8.0,
      };
    } else if (category === 'movies') {
      return {
        'Plot Depth': baseMetrics['plot_depth'] || 8.5,
        'Cinematography': baseMetrics['cinematography'] || 9.0,
        'Emotional Impact': baseMetrics['emotional_impact'] || 8.5,
        'Originality': baseMetrics['originality'] || 8.0,
      };
    } else if (category === 'tv_shows') {
      return {
        'Character Development': baseMetrics['character_development'] || 8.5,
        'Pacing': baseMetrics['pacing'] || 8.0,
        'Storytelling': baseMetrics['storytelling'] || 9.0,
        'Production Quality': baseMetrics['production_quality'] || 8.5,
      };
    } else if (category === 'youtube_videos') {
      return {
        'Production Quality': baseMetrics['production_quality'] || 8.5,
        'Entertainment': baseMetrics['entertainment'] || 8.0,
        'Educational Value': baseMetrics['educational_value'] || 8.5,
        'Engagement': baseMetrics['engagement'] || 8.0,
      };
    } else if (category === 'reading') {
      return {
        'Writing Quality': baseMetrics['writing_quality'] || 8.5,
        'Pacing': baseMetrics['pacing'] || 8.0,
        'Character Development': baseMetrics['character_development'] || 8.5,
        'Originality': baseMetrics['originality'] || 8.0,
      };
    } else if (category === 'activities') {
      return {
        'Adventure Level': baseMetrics['adventure_level'] || 8.5,
        'Social Opportunity': baseMetrics['social_opportunity'] || 8.0,
        'Value': baseMetrics['value'] || 8.5,
        'Accessibility': baseMetrics['accessibility'] || 8.0,
      };
    }
    return {};
  };

  const renderMetric = (label: string, value: number) => {
    const stars = Math.round(value / 2);
    return (
      <div key={label} className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-[text-secondary] uppercase tracking-wider">{label}</span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-coral">{value.toFixed(1)}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${star <= stars ? 'fill-coral text-coral' : 'fill-[background-tertiary] text-[background-tertiary]'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="w-full bg-[background-tertiary] h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-coral/70 to-coral rounded-full transition-all duration-1000"
            style={{ width: `${value * 10}%` }}
          />
        </div>
      </div>
    );
  };

  const imageUrl = object.primary_image?.url || object.image_url || object.poster_path;
  const displayTags = explanation?.tags || object.tags || [];
  const metrics = getMetrics();

  return (
    <div className="bg-[background-secondary] rounded-3xl shadow-lg border border-[border-color] overflow-hidden hover:border-coral/30 hover:shadow-coral/20 transition-all duration-300 flex flex-col h-full">
      {/* Image Section */}
      <div className="relative h-80 w-full overflow-hidden bg-[background-tertiary]">
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={object.title || 'Image'}
            fill
            className="object-cover transition-transform duration-700 hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
            onError={handleImageError}
            unoptimized={true}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-6xl">
            {getCategoryIcon(object.category)}
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[background-secondary] via-transparent to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span className="bg-coral text-[background-primary] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {object.category?.replace('_', ' ') || 'Recommendation'}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1 space-y-4">
        {/* Title and Tagline */}
        <div>
          <h3 className="text-2xl font-bold text-[text-primary] leading-tight mb-2">
            {object.title}
          </h3>
          {explanation?.tagline && (
            <p className="text-coral font-bold text-xs uppercase tracking-wider">
              {explanation.tagline}
            </p>
          )}
        </div>

        {/* Location */}
        {(object.location?.city || object.location?.address) && (
          <div className="flex items-center gap-2 text-[text-secondary]">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">
              {object.location.city ? `${object.location.city}, ${object.location.state || object.location.country}` : object.location.address}
            </span>
          </div>
        )}

        {/* Description */}
        {explanation?.why_youll_like && (
          <p className="text-[text-primary] text-sm leading-relaxed">
            {explanation.why_youll_like}
          </p>
        )}

        {/* Metrics */}
        {Object.keys(metrics).length > 0 && (
          <div className="space-y-4 pt-4 border-t border-[border-color]">
            {Object.entries(metrics).map(([label, value]) =>
              renderMetric(label, value as number)
            )}
          </div>
        )}

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-[border-color]">
            {displayTags.slice(0, 4).map((tag: string) => (
              <span
                key={tag}
                className="text-xs text-[text-secondary] font-medium"
              >
                #{tag.toLowerCase().replace(/\s+/g, '')}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-[border-color] mt-auto">
          <button
            onClick={() => {
              haptics.impact();
              setIsSaved(!isSaved);
            }}
            className={`flex-1 py-3 rounded-full font-bold transition-all flex items-center justify-center gap-2 ${
              isSaved
                ? 'bg-coral text-[background-primary] shadow-lg shadow-coral/30'
                : 'bg-[background-tertiary] text-[text-primary] hover:bg-[background-secondary] border border-[border-color]'
            }`}
          >
            <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
            Save
          </button>
          {object.source_links?.[0]?.url && (
            <a
              href={object.source_links[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 bg-[background-tertiary] text-[text-primary] rounded-full font-bold hover:bg-[background-secondary] transition-all flex items-center justify-center gap-2 border border-[border-color] hover:border-coral/50 hover:text-coral"
            >
              <ExternalLink className="w-4 h-4" />
              View
            </a>
          )}
          <button
            onClick={() => haptics.impact()}
            className="py-3 px-4 bg-[background-tertiary] text-[text-primary] rounded-full hover:bg-[background-secondary] transition-all border border-[border-color] hover:border-coral/50 hover:text-coral"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
