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
    query,
    lat: userLat,
    lng: userLng,
    radius: userRadius,
  }: {
    limit?: number;
    offset?: number;
    seenIds?: string[];
    profile?: any;
    query?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }) {
    try {
      const lat = userLat || profile?.location?.coordinates?.[0] || 40.7128;
      const lng = userLng || profile?.location?.coordinates?.[1] || -74.0060;
      const radius = userRadius || 16000;
      
      console.log(`[Activities API] getRecommendations called with lat=${lat}, lng=${lng}, radius=${radius}, limit=${limit}, offset=${offset}`);
      
      // For search queries, use Yelp's native pagination
      if (query && query.length >= 2) {
        const response = await axios.get(`${this.baseUrl}/businesses/search`, {
          headers: {
            'Authorization': `Bearer ${this.yelpApiKey}`,
          },
          params: {
            latitude: lat,
            longitude: lng,
            radius: Math.min(radius, 40000),
            term: query,
            limit: Math.min(limit, 50),
            offset: offset,
            sort_by: 'best_match',
          },
        });
        return (response.data.businesses || []).map(this.normalize);
      }
      
      // Rotate through activity categories based on offset for endless variety
      // Yelp supports up to 1000 results per category with pagination
      const categories = [
        'arts,entertainment', 'active', 'nightlife', 'parks', 
        'tours', 'landmarks', 'museums', 'amusementparks',
        'bowling', 'escapegames', 'gokarts', 'mini_golf'
      ];
      
      // Use offset to determine which category and page within that category
      const categoryIndex = Math.floor(offset / 50) % categories.length;
      const categoryOffset = offset % 50;
      const selectedCategory = categories[categoryIndex];
      
      console.log(`[Activities API] Fetching category "${selectedCategory}" at offset ${categoryOffset}`);
      
      try {
        const response = await axios.get(`${this.baseUrl}/businesses/search`, {
          headers: {
            'Authorization': `Bearer ${this.yelpApiKey}`,
          },
          params: {
            latitude: lat,
            longitude: lng,
            radius: Math.min(radius, 40000),
            categories: selectedCategory,
            limit: Math.min(limit, 50),
            offset: categoryOffset,
            sort_by: 'best_match',
          },
        });
        
        const results = (response.data.businesses || []).map(this.normalize);
        console.log(`[Activities API] Fetched ${results.length} activities`);
        return results;
      } catch (err) {
        console.warn(`Failed to fetch ${selectedCategory} activities:`, err);
        return [];
      }
    } catch (error) {
      console.error('Activities API error:', error);
      return [];
    }
  }
  
  private normalize(business: any) {
    // Build comprehensive description similar to restaurants
    const categoryTypes = business.categories?.map((c: any) => c.title).join(', ') || 'Local activity';
    const priceDesc = business.price ? `${business.price} price range` : '';
    const ratingDesc = business.rating ? `Rated ${business.rating}/5 stars with ${business.review_count || 0} reviews on Yelp` : '';
    const locationDesc = business.location?.city ? `Located in ${business.location.city}${business.location.state ? `, ${business.location.state}` : ''}` : '';
    const distanceDesc = business.distance ? `${(business.distance * 0.000621371).toFixed(1)} miles away` : '';
    const phoneDesc = business.display_phone || '';
    
    // Combine all parts into rich description
    const descriptionParts = [categoryTypes, priceDesc, ratingDesc, locationDesc, distanceDesc, phoneDesc].filter(Boolean);
    const enhancedDescription = descriptionParts.join('. ').trim() + '.';
    
    return {
      id: business.id,
      title: business.name,
      description: enhancedDescription || 'Popular local activity.',
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
