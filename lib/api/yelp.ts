import axios from 'axios';

interface YelpSearchParams {
  latitude: number;
  longitude: number;
  radius?: number;
  term?: string;
  price?: string;
  categories?: string;
  limit?: number;
}

export class YelpAPI {
  private baseUrl = 'https://api.yelp.com/v3';
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.YELP_API_KEY!;
  }
  
  async search(params: YelpSearchParams) {
    try {
      const response = await axios.get(`${this.baseUrl}/businesses/search`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        params: {
          latitude: params.latitude,
          longitude: params.longitude,
          radius: params.radius || 8000,
          term: params.term,
          price: params.price,
          categories: params.categories,
          limit: params.limit || 50,
        },
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
  
  private normalize(biz: any) {
    return {
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
