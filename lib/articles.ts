import axios from 'axios';

interface ArticleSearchParams {
  query?: string;
  pageSize?: number;
  page?: number;
}

export class ArticlesAPI {
  private baseUrl = 'https://newsapi.org/v2';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || '';
  }

  async search(params: ArticleSearchParams) {
    try {
      const response = await axios.get(`${this.baseUrl}/everything`, {
        params: {
          q: params.query || 'technology',
          pageSize: params.pageSize || 10,
          page: params.page || 1,
          sortBy: 'publishedAt',
          apiKey: this.apiKey,
        },
      });

      return response.data.articles?.map((article: any) => this.normalizeArticle(article)) || [];
    } catch (error) {
      console.error('Articles search error:', error);
      return [];
    }
  }

  async getTopHeadlines(params: ArticleSearchParams) {
    try {
      const response = await axios.get(`${this.baseUrl}/top-headlines`, {
        params: {
          country: 'us',
          pageSize: params.pageSize || 10,
          apiKey: this.apiKey,
        },
      });

      return response.data.articles?.map((article: any) => this.normalizeArticle(article)) || [];
    } catch (error) {
      console.error('Top headlines error:', error);
      return [];
    }
  }

  private normalizeArticle(article: any) {
    return {
      id: `article_${article.url?.replace(/[^a-zA-Z0-9]/g, '')}`,
      category: 'reading',
      title: article.title,
      description: article.description || article.content,
      primary_image: article.urlToImage
        ? {
            url: article.urlToImage,
            width: 400,
            height: 300,
          }
        : null,
      external_ratings: [
        {
          source: 'newsapi',
          score: 7.5,
          count: 0,
        },
      ],
      source_links: [
        {
          type: 'website',
          url: article.url,
          label: article.source?.name || 'Read Article',
        },
      ],
      tags: [article.source?.name || 'News'],
      last_fetched: new Date().toISOString(),
      data_stale: false,
    };
  }
}
