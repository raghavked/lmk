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
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-[#fea4a7]">{value.toFixed(1)}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${star <= stars ? 'fill-[#fea4a7] text-[#fea4a7]' : 'fill-gray-700 text-gray-700'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#fea4a7]/70 to-[#fea4a7] rounded-full transition-all duration-1000"
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
    <div className="bg-[#230f10] rounded-3xl shadow-lg border border-gray-700 overflow-hidden hover:border-[#fea4a7]/30 hover:shadow-[#fea4a7]/20 transition-all duration-300 flex flex-col h-full">
      {/* Image Section */}
      <div className="relative h-80 w-full overflow-hidden bg-gray-800">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#230f10] via-transparent to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span className="bg-white text-[#230f10] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {object.category?.replace('_', ' ') || 'Recommendation'}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1 space-y-4">
        {/* Title and Tagline */}
        <div>
          <h3 className="text-2xl font-bold text-gray-50 leading-tight mb-2">
            {object.title}
          </h3>
          {explanation?.tagline && (
            <p className="text-[#fea4a7] font-bold text-xs uppercase tracking-wider">
              {explanation.tagline}
            </p>
          )}
        </div>

        {/* Location */}
        {(object.location?.city || object.location?.address) && (
          <div className="flex items-center gap-2 text-gray-400">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">
              {object.location.city ? `${object.location.city}, ${object.location.state || object.location.country}` : object.location.address}
            </span>
          </div>
        )}

        {/* Description */}
        {explanation?.why_youll_like && (
          <p className="text-gray-300 text-sm leading-relaxed">
            {explanation.why_youll_like}
          </p>
        )}

        {/* Metrics */}
        {Object.keys(metrics).length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-700">
            {Object.entries(metrics).map(([label, value]) =>
              renderMetric(label, value as number)
            )}
          </div>
        )}

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-700">
            {displayTags.slice(0, 4).map((tag: string) => (
              <span
                key={tag}
                className="text-xs text-gray-400 font-medium"
              >
                #{tag.toLowerCase().replace(/\s+/g, '')}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-700 mt-auto">
          <button
            onClick={() => {
              haptics.impact();
              setIsSaved(!isSaved);
            }}
            className={`flex-1 py-3 rounded-full font-bold transition-all flex items-center justify-center gap-2 ${
              isSaved
                ? 'bg-[#fea4a7] text-[#230f10] shadow-lg shadow-[#fea4a7]/30'
                : 'bg-gray-800 text-gray-50 hover:bg-gray-700 border border-gray-700'
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
              className="flex-1 py-3 bg-gray-800 text-gray-50 rounded-full font-bold hover:bg-gray-700 transition-all flex items-center justify-center gap-2 border border-gray-700 hover:border-[#fea4a7]/50 hover:text-[#fea4a7]"
            >
              <ExternalLink className="w-4 h-4" />
              View
            </a>
          )}
          <button
            onClick={() => haptics.impact()}
            className="py-3 px-4 bg-gray-800 text-gray-50 rounded-full hover:bg-gray-700 transition-all border border-gray-700 hover:border-[#fea4a7]/50 hover:text-[#fea4a7]"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
