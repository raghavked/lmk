import axios from 'axios';

interface YelpSearchParams {
  latitude: number;
  longitude: number;
  radius?: number;
  term?: string;
  price?: string;
  categories?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'best_match' | 'rating' | 'review_count' | 'distance';
  attributes?: string;
}

interface CacheEntry {
  data: any[];
  timestamp: number;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const searchCache = new Map<string, CacheEntry>();

function roundCoord(coord: number): number {
  return Math.round(coord * 100) / 100; // Round to 2 decimal places (~1km precision)
}

function getCacheKey(params: any): string {
  const lat = roundCoord(params.latitude);
  const lng = roundCoord(params.longitude);
  const radius = Math.round(params.radius / 1000); // Round radius to km
  return `${lat},${lng},${radius},${params.term || ''},${params.sort_by || ''},${params.categories || ''},${params.attributes || ''}`;
}

export class YelpAPI {
  private baseUrl = 'https://api.yelp.com/v3';
  private apiKey: string;
  private lastRequestTime = 0;
  private minRequestInterval = 200; // 200ms between requests
  
  constructor() {
    this.apiKey = process.env.YELP_API_KEY!;
  }

  private async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }
  
  async search(params: YelpSearchParams) {
    const cacheKey = getCacheKey(params);
    const cached = searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[Yelp API] Cache hit for:', cacheKey.substring(0, 50));
      return cached.data;
    }

    try {
      await this.throttle();
      
      const queryParams: any = {
        latitude: params.latitude,
        longitude: params.longitude,
        radius: Math.min(params.radius || 8000, 40000),
        term: params.term,
        limit: params.limit || 50,
        sort_by: params.sort_by || 'distance',
      };
      
      if (params.offset) {
        queryParams.offset = params.offset;
      }
      if (params.price) {
        queryParams.price = params.price;
      }
      if (params.categories) {
        queryParams.categories = params.categories;
      }
      if (params.attributes) {
        queryParams.attributes = params.attributes;
      }
      
      const response = await axios.get(`${this.baseUrl}/businesses/search`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        params: queryParams,
      });
      
      const results = response.data.businesses.map(this.normalize);
      searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
      return results;
    } catch (error: any) {
      if (error?.response?.status === 429) {
        console.warn('[Yelp API] Rate limited, returning cached data if available');
        if (cached) return cached.data;
      }
      console.error('Yelp API error:', error);
      return [];
    }
  }
  
  async getDetails(yelpId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/businesses/${yelpId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      
      return this.normalize(response.data);
    } catch (error) {
      console.error('Yelp details error:', error);
      return null;
    }
  }
  
  async getAllRestaurantSections(lat: number, lng: number, radius: number = 16000) {
    const [trending, newOpenings, popular, topRated] = await Promise.all([
      this.search({ latitude: lat, longitude: lng, radius, term: 'restaurants', sort_by: 'review_count', limit: 10 }),
      this.search({ latitude: lat, longitude: lng, radius, term: 'restaurants', attributes: 'hot_and_new', limit: 10 }),
      this.search({ latitude: lat, longitude: lng, radius, term: 'restaurants', sort_by: 'best_match', limit: 10 }),
      this.search({ latitude: lat, longitude: lng, radius, term: 'restaurants', sort_by: 'rating', limit: 10 }),
    ]);
    
    return {
      trending: trending.slice(0, 10),
      newOpenings: newOpenings.slice(0, 10),
      popular: popular.slice(0, 10),
      topRated: topRated.slice(0, 10),
    };
  }
  
  async getAllActivitySections(lat: number, lng: number, radius: number = 16000) {
    const [trending, events, popular, topRated] = await Promise.all([
      this.search({ latitude: lat, longitude: lng, radius, categories: 'active,arts', sort_by: 'review_count', limit: 10 }),
      this.search({ latitude: lat, longitude: lng, radius, term: 'things to do', attributes: 'hot_and_new', limit: 10 }),
      this.search({ latitude: lat, longitude: lng, radius, categories: 'nightlife,entertainment', sort_by: 'best_match', limit: 10 }),
      this.search({ latitude: lat, longitude: lng, radius, categories: 'active,arts,entertainment', sort_by: 'rating', limit: 10 }),
    ]);
    
    return {
      trending: trending.slice(0, 10),
      newEvents: events.slice(0, 10),
      popular: popular.slice(0, 10),
      topRated: topRated.slice(0, 10),
    };
  }
  
  async getRecommendations({ category, limit, offset, profile, query, lat: userLat, lng: userLng, radius: userRadius }: { category: string, limit: number, offset: number, profile: any, query?: string, lat?: number, lng?: number, radius?: number }) {
    const lat = userLat || profile.location?.coordinates?.[0] || 34.0522;
    const lng = userLng || profile.location?.coordinates?.[1] || -118.2437;
    const radius = userRadius || 16000;
    
    console.log(`[Yelp API] getRecommendations called with lat=${lat}, lng=${lng}, radius=${radius}, userLat=${userLat}, userLng=${userLng}`);

    if (query && query.length >= 2) {
      return this.search({
        latitude: lat,
        longitude: lng,
        radius,
        term: category === 'restaurants' ? `${query} restaurant` : query,
        limit: Math.max(limit, 20),
        offset,
        sort_by: 'best_match',
      });
    }

    if (category === 'restaurants') {
      const allSections = await this.getAllRestaurantSections(lat, lng, radius);
      const combined = [...allSections.trending, ...allSections.newOpenings, ...allSections.popular, ...allSections.topRated];
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      return unique.slice(offset, offset + limit);
    } else if (category === 'activities') {
      const allSections = await this.getAllActivitySections(lat, lng, radius);
      const combined = [...allSections.trending, ...allSections.newEvents, ...allSections.popular, ...allSections.topRated];
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      return unique.slice(offset, offset + limit);
    }
    
    return this.search({
      latitude: lat,
      longitude: lng,
      radius,
      term: category,
      limit,
      offset,
    });
  }

  private normalize(biz: any) {
    const cuisineTypes = biz.categories?.map((c: any) => c.title).join(', ') || '';
    const priceDesc = biz.price ? `${biz.price} price range` : 'Moderate pricing';
    const ratingDesc = biz.rating ? `Rated ${biz.rating}/5 stars with ${biz.review_count || 0} reviews on Yelp` : '';
    const locationDesc = biz.location?.city ? `Located in ${biz.location.city}` : '';
    const distanceDesc = biz.distance ? `${(biz.distance * 0.000621371).toFixed(1)} miles away` : '';
    
    return {
      id: biz.id,
      category: 'restaurants',
      title: biz.name,
      description: [cuisineTypes, priceDesc, ratingDesc, locationDesc, distanceDesc].filter(Boolean).join('. ').trim() + '.',
      primary_image: biz.image_url ? {
        url: biz.image_url,
        width: 1000,
        height: 1000,
      } : null,
      external_ids: {
        yelp_id: biz.id,
      },
      external_ratings: [{
        source: 'yelp',
        score: (biz.rating / 5) * 10,
        count: biz.review_count,
        url: biz.url,
      }],
      external_rating: biz.rating ? (biz.rating / 5) * 10 : null,
      tags: biz.categories?.map((c: any) => c.alias) || [],
      location: {
        address: biz.location?.address1,
        city: biz.location?.city,
        state: biz.location?.state,
        zip: biz.location?.zip_code,
        country: biz.location?.country,
        coordinates: [biz.coordinates?.latitude, biz.coordinates?.longitude],
        lat: biz.coordinates?.latitude,
        lng: biz.coordinates?.longitude,
      },
      price_level: biz.price?.length || 2,
      price: biz.price || '$$',
      review_count: biz.review_count,
      rating: biz.rating,
      categories: biz.categories || [],
      source_links: [{
        type: 'website',
        url: biz.url,
        label: 'View on Yelp',
      }],
      last_fetched: new Date().toISOString(),
      data_stale: false,
    };
  }
}
