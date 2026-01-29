'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Star, MapPin, ExternalLink, Bookmark, Share2 } from 'lucide-react';
import haptics from '@/lib/haptics';

interface ObjectCardProps {
  object: any;
  rank?: number;
  score?: number;
  distance?: number;
  explanation?: {
    hook?: string;
    why_youll_like?: string;
    friend_callout?: string;
    caveats?: string;
    metrics?: Record<string, number>;
    detailed_ratings?: Record<string, number>;
    tags?: string[];
    tagline?: string;
  };
}

export default function ObjectCard({ object, rank, score, distance, explanation }: ObjectCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Get category-specific metrics from actual source data
  const getSourceMetrics = () => {
    const metrics: { label: string; value: string; subtext?: string }[] = [];
    const category = object.category?.toLowerCase();
    
    // External ratings from APIs (Yelp, TMDB, etc.)
    if (object.external_ratings && object.external_ratings.length > 0) {
      const rating = object.external_ratings[0];
      const source = rating.source?.toUpperCase() || 'Rating';
      
      if (category === 'restaurants' || category === 'activities') {
        // Yelp uses 1-5 scale
        const yelpRating = rating.score ? (rating.score / 2).toFixed(1) : null;
        if (yelpRating) {
          metrics.push({ 
            label: 'Yelp Rating', 
            value: `${yelpRating}/5`,
            subtext: rating.count ? `${rating.count.toLocaleString()} reviews` : undefined
          });
        }
      } else if (category === 'movies' || category === 'tv_shows') {
        // TMDB uses 1-10 scale
        if (rating.score) {
          metrics.push({ 
            label: 'TMDB Rating', 
            value: `${rating.score.toFixed(1)}/10`,
            subtext: rating.count ? `${rating.count.toLocaleString()} votes` : undefined
          });
        }
      }
    }
    
    // Fallback to external_rating if external_ratings not available
    if (metrics.length === 0 && object.external_rating) {
      if (category === 'restaurants' || category === 'activities') {
        metrics.push({ 
          label: 'Rating', 
          value: `${(object.external_rating / 2).toFixed(1)}/5`
        });
      } else {
        metrics.push({ 
          label: 'Rating', 
          value: `${object.external_rating.toFixed(1)}/10`
        });
      }
    }
    
    // Review/vote count if not already shown
    if (object.review_count && !metrics.some(m => m.subtext?.includes('reviews'))) {
      metrics.push({ 
        label: 'Reviews', 
        value: object.review_count.toLocaleString()
      });
    }
    
    // Price level for restaurants
    if (object.price_level) {
      metrics.push({ 
        label: 'Price', 
        value: object.price_level
      });
    }
    
    // Runtime for movies
    if (object.runtime) {
      const hours = Math.floor(object.runtime / 60);
      const mins = object.runtime % 60;
      metrics.push({ 
        label: 'Runtime', 
        value: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
      });
    }
    
    // Release year for movies/TV
    if (object.release_date || object.first_air_date) {
      const date = object.release_date || object.first_air_date;
      const year = new Date(date).getFullYear();
      if (!isNaN(year)) {
        metrics.push({ 
          label: category === 'tv_shows' ? 'First Aired' : 'Released', 
          value: year.toString()
        });
      }
    }
    
    // YouTube specific
    if (object.view_count) {
      metrics.push({ 
        label: 'Views', 
        value: formatCount(object.view_count)
      });
    }
    if (object.like_count) {
      metrics.push({ 
        label: 'Likes', 
        value: formatCount(object.like_count)
      });
    }
    
    // Book specific
    if (object.page_count) {
      metrics.push({ 
        label: 'Pages', 
        value: object.page_count.toString()
      });
    }
    if (object.publish_year) {
      metrics.push({ 
        label: 'Published', 
        value: object.publish_year.toString()
      });
    }
    
    return metrics;
  };
  
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const renderSourceMetric = (metric: { label: string; value: string; subtext?: string }) => {
    return (
      <div key={metric.label} className="flex justify-between items-center py-2">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{metric.label}</span>
        <div className="text-right">
          <span className="text-sm font-bold text-text-primary">{metric.value}</span>
          {metric.subtext && (
            <span className="text-xs text-text-secondary ml-2">({metric.subtext})</span>
          )}
        </div>
      </div>
    );
  };

  const imageUrl = object.primary_image?.url || object.image_url || object.poster_path;
  const displayTags = explanation?.tags || object.tags || [];
  const hook = explanation?.hook || '';
  const sourceMetrics = getSourceMetrics();

  const mapUrl = useMemo(() => {
    if (object.location?.lat && object.location?.lng && object.title) {
      const lat = object.location.lat;
      const lng = object.location.lng;
      const title = encodeURIComponent(object.title);
      // Universal map URL scheme for Google Maps
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${title}`;
    }
    return null;
  }, [object.location, object.title]);

  return (
            <div 
              className="bg-background-secondary rounded-3xl shadow-lg border border-border-color overflow-hidden hover:border-coral/30 hover:shadow-coral/20 transition-all duration-300 flex flex-col h-full cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
      {/* Image Section */}
      <div className="relative h-80 w-full overflow-hidden bg-background-tertiary">
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
        <div className="absolute inset-0 bg-gradient-to-t from-background-secondary via-transparent to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span className="bg-coral text-background-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {object.category?.replace('_', ' ') || 'Recommendation'}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1 space-y-4">
                {/* Title and Tagline */}
                <div>
                  <h3 className="text-2xl font-bold text-text-primary leading-tight mb-2">
                    {object.title}
                  </h3>
                  {explanation?.tagline && (
                    <p className="text-coral font-bold text-xs uppercase tracking-wider">
                      {explanation.tagline}
                    </p>
                  )}
                </div>

                {/* Location & Distance */}
                {(object.location?.city || object.location?.address || distance) && (
                  <div className="flex items-center gap-2 text-text-secondary">
                    <MapPin className="w-4 h-4 flex-shrink-0 text-coral" />
                    <span className="text-sm font-medium">
                      {object.location?.city ? `${object.location.city}, ${object.location?.state || object.location?.country}` : object.location?.address}
                    </span>
                    {distance !== undefined && distance > 0 && (
                      <span className="text-xs bg-coral/20 text-coral px-2 py-0.5 rounded-full font-bold">
                        {distance < 1 ? `${(distance * 5280).toFixed(0)} ft` : `${distance.toFixed(1)} mi`}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Expanded Detail View */}
                {isExpanded && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-border-color animate-in fade-in duration-300">
                    <h4 className="text-lg font-bold text-text-primary">More Details</h4>
                    
                    {/* Map Integration */}
                    {mapUrl && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-text-secondary flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-coral" />
                          Location on Map
                        </p>
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()} // Prevent card collapse
                          className="flex items-center justify-center w-full py-3 bg-coral text-background-primary rounded-xl font-bold hover:bg-coral/90 transition-all shadow-lg shadow-coral/30"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Get Directions
                        </a>
                      </div>
                    )}
                    
                    {/* Additional details shown in expanded view */}
                    
                  </div>
                )}

                {/* Description */}
                {explanation?.why_youll_like && (
                  <div className="space-y-2">
                    {hook && (
                      <p className="text-coral font-bold text-xs uppercase tracking-wider">
                        {hook}
                      </p>
                    )}
                    <p className="text-text-primary text-sm leading-relaxed">
                      {explanation.why_youll_like}
                    </p>
                  </div>
                )}

        {/* Source Metrics */}
        {sourceMetrics.length > 0 && (
          <div className="space-y-1 pt-4 border-t border-border-color">
            {sourceMetrics.map((metric) => renderSourceMetric(metric))}
          </div>
        )}

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border-color">
            {displayTags.slice(0, 4).map((tag: string) => (
              <span
                key={tag}
                className="text-xs text-text-secondary font-medium"
              >
                #{tag.toLowerCase().replace(/\s+/g, '')}
              </span>
            ))}
          </div>
        )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border-color mt-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card collapse
                      haptics.impact();
                      setIsSaved(!isSaved);
                    }}
                    className={`flex-1 py-3 rounded-full font-bold transition-all flex items-center justify-center gap-2 ${
                      isSaved
                        ? 'bg-coral text-background-primary shadow-lg shadow-coral/30'
                        : 'bg-background-tertiary text-text-primary hover:bg-background-secondary border border-border-color'
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
                      onClick={(e) => e.stopPropagation()} // Prevent card collapse
                      className="flex-1 py-3 bg-background-tertiary text-text-primary rounded-full font-bold hover:bg-background-secondary transition-all flex items-center justify-center gap-2 border border-border-color hover:border-coral/50 hover:text-coral"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card collapse
                      haptics.impact();
                    }}
                    className="py-3 px-4 bg-background-tertiary text-text-primary rounded-full hover:bg-background-secondary transition-all border border-border-color hover:border-coral/50 hover:text-coral"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
      </div>
    </div>
  );
}
