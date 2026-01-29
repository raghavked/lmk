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

export class YelpAPI {
  private baseUrl = 'https://api.yelp.com/v3';
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.YELP_API_KEY!;
  }
  
  async search(params: YelpSearchParams) {
    try {
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
      
      return response.data.businesses.map(this.normalize);
    } catch (error) {
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
  
  async getRecommendations({ category, limit, offset, profile }: { category: string, limit: number, offset: number, profile: any }) {
    const lat = profile.location?.coordinates[0] || 34.0522; // Default to LA
    const lng = profile.location?.coordinates[1] || -118.2437;
    const radius = 16000; // 10 miles

    if (category === 'restaurants') {
      const allSections = await this.getAllRestaurantSections(lat, lng, radius);
      // Combine all results and remove duplicates
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
    
    // Fallback search
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
    return {
      id: biz.id, // Explicit ID for de-duplication
      category: 'restaurant',
      title: biz.name,
      description: biz.categories?.map((c: any) => c.title).join(', '),
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
      tags: biz.categories?.map((c: any) => c.alias) || [],
      location: {
        address: biz.location?.address1,
        city: biz.location?.city,
        state: biz.location?.state,
        zip: biz.location?.zip_code,
        country: biz.location?.country,
        coordinates: [biz.coordinates?.latitude, biz.coordinates?.longitude],
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
