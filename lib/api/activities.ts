import axios from 'axios';

interface ActivitiesSearchParams {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
  offset?: number;
}

export class ActivitiesAPI {
  private yelpApiKey: string;
  private baseUrl = 'https://api.yelp.com/v3';
  
  constructor() {
    this.yelpApiKey = process.env.YELP_API_KEY!;
  }
  
  async getRecommendations({
    limit = 10,
    offset = 0,
    seenIds = [],
    profile,
  }: {
    limit?: number;
    offset?: number;
    seenIds?: string[];
    profile?: any;
  }) {
    try {
      // Get user location from profile or use default
      const lat = profile?.location?.coordinates?.[0] || 40.7128;
      const lng = profile?.location?.coordinates?.[1] || -74.0060;
      
      // Search for various activity categories
      const categories = ['arts', 'active', 'nightlife', 'parks', 'tours', 'landmarks'];
      
      const allActivities: any[] = [];
      
      for (const category of categories) {
        try {
          const response = await axios.get(`${this.baseUrl}/businesses/search`, {
            headers: {
              'Authorization': `Bearer ${this.yelpApiKey}`,
            },
            params: {
              latitude: lat,
              longitude: lng,
              radius: 16000,
              categories: category,
              limit: 10,
              sort_by: 'rating',
            },
          });
          
          const businesses = response.data.businesses || [];
          allActivities.push(...businesses.map(this.normalize));
        } catch (err) {
          console.warn(`Failed to fetch ${category} activities:`, err);
        }
      }
      
      // Remove duplicates and apply seen filter
      const uniqueActivities = Array.from(
        new Map(allActivities.map(a => [a.id, a])).values()
      ).filter(a => !seenIds.includes(a.id));
      
      // Return paginated results
      return uniqueActivities.slice(offset, offset + limit);
    } catch (error) {
      console.error('Activities API error:', error);
      return [];
    }
  }
  
  private normalize(business: any) {
    return {
      id: business.id,
      title: business.name,
      description: business.snippet_text || business.review_highlights?.join(', ') || 'Popular activity',
      category: 'activities',
      location: {
        address: business.location?.address1 || '',
        city: business.location?.city || '',
        state: business.location?.state || '',
        zip_code: business.location?.zip_code || '',
        coordinates: business.coordinates ? [business.coordinates.latitude, business.coordinates.longitude] : null,
      },
      image_url: business.image_url,
      external_ratings: [
        {
          source: 'yelp',
          score: business.rating || 0,
          count: business.review_count || 0,
        },
      ],
      price: business.price || null,
      rating: business.rating || 0,
      review_count: business.review_count || 0,
      categories: business.categories?.map((c: any) => ({ title: c.title })) || [],
      tags: business.categories?.map((c: any) => c.alias) || [],
      url: business.url,
      phone: business.phone,
      hours: business.hours,
    };
  }
}
