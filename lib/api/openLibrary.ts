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

  async getRecommendations({ category, limit, offset, profile, query: searchQuery }: { category: string, limit: number, offset: number, profile: any, query?: string }) {
    const tasteProfile = profile.taste_profile || [];
    
    // Use search query if provided, otherwise rotate through popular subjects for variety
    const popularSubjects = [
      'fiction', 'mystery', 'science fiction', 'fantasy', 'romance', 
      'thriller', 'biography', 'history', 'self-help', 'adventure',
      'horror', 'literary fiction', 'classics', 'young adult', 'crime'
    ];
    
    let query: string;
    if (searchQuery && searchQuery.length >= 2) {
      query = searchQuery;
    } else if (tasteProfile.length > 0) {
      query = tasteProfile[Math.floor(offset / 20) % tasteProfile.length];
    } else {
      // Rotate through subjects based on offset to provide variety
      query = popularSubjects[Math.floor(offset / 20) % popularSubjects.length];
    }
    
    console.log(`[OpenLibrary API] Fetching books: query="${query}", limit=${limit}, offset=${offset}`);
    
    try {
      const response = await axios.get(`${this.baseUrl}/search.json`, {
        params: {
          q: query,
          limit: Math.min(limit, 100), // Open Library supports larger limits
          offset: offset % 100, // Adjust offset for subject rotation
          sort: 'rating',
          has_fulltext: true, // Prioritize books with content
        },
      });

      const results = response.data.docs?.map((book: any) => this.normalizeBook(book)) || [];
      console.log(`[OpenLibrary API] Fetched ${results.length} books`);
      return results;
    } catch (error) {
      console.error('OpenLibrary search error:', error);
      return [];
    }
  }

  private normalizeBook(book: any) {
    const author = book.author_name?.[0] || 'Unknown Author';
    const year = book.first_publish_year;
    const subjects = book.subject?.slice(0, 5) || [];
    const pageCount = book.number_of_pages_median;
    const editionCount = book.edition_count || 0;
    const ratingsCount = book.ratings_count || 0;
    const ratingsAvg = book.ratings_average || 0;
    
    let description = `${book.title} by ${author}`;
    if (year) description += `, first published in ${year}`;
    if (pageCount) description += `. ${pageCount} pages`;
    if (editionCount > 1) description += `, available in ${editionCount} editions`;
    if (ratingsCount > 0) description += `. Rated ${ratingsAvg.toFixed(1)}/5 by ${ratingsCount} readers`;
    if (subjects.length > 0) description += `. Genres: ${subjects.slice(0, 3).join(', ')}`;
    description += '.';
    
    return {
      id: `book_${book.key?.replace(/[^a-zA-Z0-9]/g, '')}`,
      category: 'reading',
      title: book.title,
      description,
      author,
      publish_year: year,
      page_count: pageCount,
      edition_count: editionCount,
      genres: subjects.slice(0, 5),
      rating: ratingsAvg,
      review_count: ratingsCount,
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
          score: ratingsAvg ? ratingsAvg * 2 : 7.5,
          count: ratingsCount,
        },
      ],
      external_rating: ratingsAvg ? ratingsAvg * 2 : 7.5,
      source_links: [
        {
          type: 'website',
          url: `${this.baseUrl}${book.key}`,
          label: 'View on Open Library',
        },
      ],
      tags: subjects.slice(0, 3).length > 0 ? subjects.slice(0, 3) : ['Book'],
      last_fetched: new Date().toISOString(),
      data_stale: false,
    };
  }
}
