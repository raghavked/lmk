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

  // Get real metrics from API data (3 metrics max)
  const getRealMetrics = (): Array<{ label: string; value: number; displayValue: string }> => {
    const metrics: Array<{ label: string; value: number; displayValue: string }> = [];
    const category = object.category?.toLowerCase();
    
    // Rating (from Yelp or TMDB)
    if (object.rating) {
      if (category === 'restaurants' || category === 'activities') {
        metrics.push({ 
          label: 'Rating', 
          value: (object.rating / 5) * 10,
          displayValue: `${object.rating.toFixed(1)}/5`
        });
      }
    } else if (object.external_rating) {
      metrics.push({ 
        label: 'Rating', 
        value: object.external_rating,
        displayValue: `${(object.external_rating).toFixed(1)}/10`
      });
    }
    
    // Review/Vote Count
    if (object.review_count) {
      const count = object.review_count;
      const normalizedScore = Math.min(10, (count / 500) * 10);
      metrics.push({ 
        label: 'Popularity', 
        value: normalizedScore,
        displayValue: count >= 1000 ? `${(count/1000).toFixed(1)}K reviews` : `${count} reviews`
      });
    } else if (object.external_ratings?.[0]?.count) {
      const count = object.external_ratings[0].count;
      const normalizedScore = Math.min(10, (count / 1000) * 10);
      metrics.push({ 
        label: 'Popularity', 
        value: normalizedScore,
        displayValue: count >= 1000 ? `${(count/1000).toFixed(1)}K votes` : `${count} votes`
      });
    }
    
    // Price Level for restaurants
    if (object.price && (category === 'restaurants' || category === 'activities')) {
      const priceLength = object.price.length;
      const priceScore = ((5 - priceLength) / 4) * 10;
      metrics.push({ 
        label: 'Value', 
        value: Math.max(2, priceScore),
        displayValue: object.price
      });
    }
    
    // For movies/TV, add vote count and year as additional metrics
    if (category === 'movies' || category === 'tv_shows') {
      if (object.vote_count) {
        const count = object.vote_count;
        const normalizedScore = Math.min(10, (count / 5000) * 10);
        metrics.push({ 
          label: 'Popularity', 
          value: normalizedScore,
          displayValue: count >= 1000 ? `${(count/1000).toFixed(1)}K votes` : `${count} votes`
        });
      }
      if (object.release_date || object.first_air_date) {
        const date = object.release_date || object.first_air_date;
        const year = new Date(date).getFullYear();
        if (!isNaN(year)) {
          metrics.push({ 
            label: 'Released', 
            value: 8,
            displayValue: year.toString()
          });
        }
      }
      if (object.runtime) {
        const hours = Math.floor(object.runtime / 60);
        const mins = object.runtime % 60;
        metrics.push({ 
          label: 'Runtime', 
          value: Math.min(10, (object.runtime / 180) * 10),
          displayValue: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
        });
      }
    }
    
    // For YouTube
    if (object.view_count) {
      const views = object.view_count;
      const normalizedScore = Math.min(10, (views / 1000000) * 10);
      metrics.push({ 
        label: 'Views', 
        value: normalizedScore,
        displayValue: views >= 1000000 ? `${(views/1000000).toFixed(1)}M` : views >= 1000 ? `${(views/1000).toFixed(1)}K` : `${views}`
      });
    }
    if (object.like_count) {
      const likes = object.like_count;
      const normalizedScore = Math.min(10, (likes / 100000) * 10);
      metrics.push({ 
        label: 'Likes', 
        value: normalizedScore,
        displayValue: likes >= 1000000 ? `${(likes/1000000).toFixed(1)}M` : likes >= 1000 ? `${(likes/1000).toFixed(1)}K` : `${likes}`
      });
    }
    if (object.channel_title) {
      metrics.push({ 
        label: 'Channel', 
        value: 8,
        displayValue: object.channel_title.substring(0, 20)
      });
    }
    
    // For books
    if (object.page_count) {
      metrics.push({ 
        label: 'Length', 
        value: Math.min(10, (object.page_count / 500) * 10),
        displayValue: `${object.page_count} pages`
      });
    }
    if (object.publish_year) {
      metrics.push({ 
        label: 'Published', 
        value: 8,
        displayValue: object.publish_year.toString()
      });
    }
    if (object.author) {
      metrics.push({ 
        label: 'Author', 
        value: 8,
        displayValue: typeof object.author === 'string' ? object.author.substring(0, 20) : 'Unknown'
      });
    }
    
    // Fallback metrics to ensure at least 3 if available data exists
    if (metrics.length < 3 && object.categories && object.categories.length > 0) {
      const categoryName = object.categories[0]?.title || object.categories[0];
      if (typeof categoryName === 'string') {
        metrics.push({ 
          label: 'Category', 
          value: 7,
          displayValue: categoryName.substring(0, 20)
        });
      }
    }
    if (metrics.length < 3 && object.genres && object.genres.length > 0) {
      metrics.push({ 
        label: 'Genre', 
        value: 7,
        displayValue: object.genres[0].substring(0, 20)
      });
    }
    if (metrics.length < 3 && object.tags && object.tags.length > 0) {
      metrics.push({ 
        label: 'Type', 
        value: 6,
        displayValue: object.tags[0].substring(0, 20)
      });
    }
    
    return metrics.slice(0, 3);
  };

  const renderRealMetric = (metric: { label: string; value: number; displayValue: string }) => {
    const stars = Math.round(metric.value / 2);
    return (
      <div key={metric.label} className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-coral uppercase tracking-wider">{metric.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-primary">{metric.displayValue}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${star <= stars ? 'fill-coral text-coral' : 'fill-background-tertiary text-background-tertiary'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="w-full bg-background-tertiary h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-coral/70 to-coral rounded-full transition-all duration-1000"
            style={{ width: `${metric.value * 10}%` }}
          />
        </div>
      </div>
    );
  };

  const imageUrl = object.primary_image?.url || object.image_url || object.poster_path;
  const displayTags = explanation?.tags || object.tags || [];
  const hook = explanation?.hook || '';
  const realMetrics = getRealMetrics();

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
                    {distance !== undefined && distance !== null && (
                      <span className="text-xs bg-coral/20 text-coral px-2 py-0.5 rounded-full font-bold">
                        {distance < 0.01 ? 'Nearby' : distance < 1 ? `${(distance * 5280).toFixed(0)} ft` : `${distance.toFixed(1)} mi`}
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
                {(explanation?.why_youll_like || object.description) && (
                  <div className="space-y-2">
                    {hook && (
                      <p className="text-coral font-bold text-xs uppercase tracking-wider">
                        {hook}
                      </p>
                    )}
                    <div className="text-text-primary text-sm leading-relaxed space-y-2">
                      {explanation?.why_youll_like && (
                        <p>{explanation.why_youll_like}</p>
                      )}
                      {object.description && (
                        <p className="text-text-secondary">
                          {object.description.length > 200 
                            ? object.description.substring(0, 200) + '...' 
                            : object.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

        {/* Real Metrics */}
        {realMetrics.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border-color">
            {realMetrics.map((metric) => renderRealMetric(metric))}
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
