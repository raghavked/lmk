import axios from 'axios';

export class OpenLibraryAPI {
  private baseUrl = 'https://openlibrary.org';

  async getRecommendedBooks(tasteProfile: string[], limit: number = 10) {
    try {
      // Use taste profile to search for relevant books
      const query = tasteProfile.length > 0 ? tasteProfile[0] : 'fiction';
      
      const response = await axios.get(`${this.baseUrl}/search.json`, {
        params: {
          q: query,
          limit: limit,
          sort: 'rating',
        },
      });

      return response.data.docs?.map((book: any) => this.normalizeBook(book)) || [];
    } catch (error) {
      console.error('OpenLibrary search error:', error);
      return [];
    }
  }

  async getRecommendations({ category, limit, offset, profile }: { category: string, limit: number, offset: number, profile: any }) {
    const tasteProfile = profile.taste_profile || [];
    const query = tasteProfile.length > 0 ? tasteProfile[0] : 'fiction';
    
    try {
      const response = await axios.get(`${this.baseUrl}/search.json`, {
        params: {
          q: query,
          limit: limit,
          offset: offset,
          sort: 'rating',
        },
      });

      return response.data.docs?.map((book: any) => this.normalizeBook(book)) || [];
    } catch (error) {
      console.error('OpenLibrary search error:', error);
      return [];
    }
  }

  private normalizeBook(book: any) {
    return {
      id: `book_${book.key?.replace(/[^a-zA-Z0-9]/g, '')}`,
      category: 'reading',
      title: book.title,
      description: `By ${book.author_name?.[0] || 'Unknown Author'}. First published in ${book.first_publish_year || 'Unknown'}.`,
      primary_image: book.cover_i
        ? {
            url: `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`,
            width: 300,
            height: 450,
          }
        : null,
      external_ratings: [
        {
          source: 'openlibrary',
          score: (book.ratings_average || 7.5) as number,
          count: book.ratings_count || 0,
        },
      ],
      source_links: [
        {
          type: 'website',
          url: `${this.baseUrl}${book.key}`,
          label: 'View on Open Library',
        },
      ],
      tags: book.subject?.slice(0, 3) || ['Book'],
      last_fetched: new Date().toISOString(),
      data_stale: false,
    };
  }
}
