import axios from 'axios';

interface ArticleSearchParams {
  query: string;
  category?: string;
  language?: string;
  pageSize?: number;
}

export class ArticlesAPI {
  private baseUrl = 'https://newsapi.org/v2';
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.NEWS_API_KEY!;
  }
  
  async search(params: ArticleSearchParams) {
    try {
      const response = await axios.get(`${this.baseUrl}/everything`, {
        params: {
          apiKey: this.apiKey,
          q: params.query,
          language: params.language || 'en',
          pageSize: params.pageSize || 20,
          sortBy: 'relevancy',
        },
      });
      
      if (!response.data.articles || response.data.articles.length === 0) {
        return [];
      }
      
      return response.data.articles
        .filter((article: any) => article.title && article.url)
        .map(this.normalize);
    } catch (error) {
      console.error('Articles API error:', error);
      return [];
    }
  }
  
  async searchByCategory(category: string, params: ArticleSearchParams) {
    try {
      const response = await axios.get(`${this.baseUrl}/top-headlines`, {
        params: {
          apiKey: this.apiKey,
          category: category,
          language: params.language || 'en',
          pageSize: params.pageSize || 20,
        },
      });
      
      if (!response.data.articles || response.data.articles.length === 0) {
        return [];
      }
      
      return response.data.articles
        .filter((article: any) => article.title && article.url)
        .map((article: any) => this.normalize(article, category));
    } catch (error) {
      console.error('Articles by category error:', error);
      return [];
    }
  }
  
  private normalize(article: any, category?: string) {
    return {
      category: 'article',
      title: article.title,
      description: article.description || article.content?.substring(0, 200),
      primary_image: article.urlToImage
        ? {
            url: article.urlToImage,
            width: 800,
            height: 600,
          }
        : null,
      external_ids: {
        news_url: article.url,
      },
      external_ratings: [],
      tags: [
        article.source.name.toLowerCase().replace(/\s+/g, '-'),
        ...(category ? [category] : []),
      ],
      mood_tags: this.inferMoodTags(article.title, article.description),
      time_commitment: {
        typical_minutes: this.estimateReadingTime(
          article.content || article.description || ''
        ),
        min_minutes: 2,
        max_minutes: 15,
      },
      availability: {
        platforms: ['web'],
      },
      source_links: [
        {
          type: 'article',
          url: article.url,
          label: `Read on ${article.source.name}`,
        },
      ],
      last_fetched: new Date().toISOString(),
      data_stale: false,
    };
  }
  
  private estimateReadingTime(content: string): number {
    // Average reading speed: 200-250 words per minute
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 225);
    
    return Math.max(2, Math.min(15, minutes));
  }
  
  private inferMoodTags(title: string, description: string = ''): string[] {
    const moods: string[] = [];
    const text = (title + ' ' + description).toLowerCase();
    
    if (/breaking|urgent|alert|crisis/i.test(text)) moods.push('urgent', 'important');
    if (/analysis|deep dive|explained|understanding/i.test(text))
      moods.push('thoughtful', 'informative');
    if (/opinion|editorial|commentary/i.test(text)) moods.push('thought-provoking');
    if (/guide|how to|tips|advice/i.test(text))
      moods.push('educational', 'helpful');
    if (/inspiration|success|achievement/i.test(text))
      moods.push('inspiring', 'uplifting');
    if (/scandal|controversy|disaster/i.test(text))
      moods.push('serious', 'concerning');
    if (/fun|entertainment|lifestyle/i.test(text))
      moods.push('lighthearted', 'entertaining');
    
    return moods.length > 0 ? moods : ['informative'];
  }
}
