import axios from 'axios';

interface YouTubeSearchParams {
  query: string;
  maxResults?: number;
  order?: 'relevance' | 'date' | 'viewCount' | 'rating';
}

export class YouTubeAPI {
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY!;
  }
  
  async search(params: YouTubeSearchParams) {
    try {
      // Search for videos
      const searchResponse = await axios.get(`${this.baseUrl}/search`, {
        params: {
          key: this.apiKey,
          q: params.query,
          part: 'snippet',
          type: 'video',
          maxResults: params.maxResults || 20,
          order: params.order || 'relevance',
        },
      });
      
      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        return [];
      }
      
      // Get video IDs
      const videoIds = searchResponse.data.items
        .map((item: any) => item.id.videoId)
        .join(',');
      
      // Get video statistics
      const statsResponse = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          id: videoIds,
          part: 'statistics,contentDetails',
        },
      });
      
      // Create stats map
      const statsMap = statsResponse.data.items.reduce((acc: any, item: any) => {
        acc[item.id] = item;
        return acc;
      }, {});
      
      // Normalize results
      return searchResponse.data.items.map((item: any) => {
        const videoId = item.id.videoId;
        const stats = statsMap[videoId];
        
        return this.normalize(item, stats);
      });
    } catch (error) {
      console.error('YouTube API error:', error);
      return [];
    }
  }
  
  async getDetails(videoId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          id: videoId,
          part: 'snippet,statistics,contentDetails',
        },
      });
      
      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }
      
      const video = response.data.items[0];
      
      return this.normalize(
        {
          id: { videoId: video.id },
          snippet: video.snippet,
        },
        video
      );
    } catch (error) {
      console.error('YouTube details error:', error);
      return null;
    }
  }
  
  private normalize(item: any, stats: any) {
    const videoId = item.id.videoId;
    
    return {
      category: 'youtube',
      title: item.snippet.title,
      description: item.snippet.description,
      primary_image: {
        url:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default?.url,
        width: 480,
        height: 360,
      },
      external_ids: {
        youtube_video_id: videoId,
      },
      external_ratings: stats
        ? [
            {
              source: 'youtube',
              score: this.calculateScore(stats.statistics),
              count: parseInt(stats.statistics.likeCount || '0'),
            },
          ]
        : [],
      tags: [item.snippet.channelTitle.toLowerCase()],
      mood_tags: this.inferMoodTags(item.snippet.title, item.snippet.description),
      time_commitment: stats
        ? {
            typical_minutes: this.parseDuration(stats.contentDetails.duration),
            min_minutes: this.parseDuration(stats.contentDetails.duration),
            max_minutes: this.parseDuration(stats.contentDetails.duration),
          }
        : null,
      availability: {
        platforms: ['youtube'],
      },
      source_links: [
        {
          type: 'video',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          label: 'Watch on YouTube',
        },
      ],
      last_fetched: new Date().toISOString(),
      data_stale: false,
    };
  }
  
  private calculateScore(stats: any): number {
    const views = parseInt(stats.viewCount || '0');
    const likes = parseInt(stats.likeCount || '0');
    const comments = parseInt(stats.commentCount || '0');
    
    if (views === 0) return 5;
    
    // Calculate engagement rate
    const likeRatio = likes / views;
    const engagementRatio = (likes + comments) / views;
    
    // Score based on engagement (0-10 scale)
    // Higher engagement = higher score
    const baseScore = 5;
    const likeBonus = Math.min(3, likeRatio * 1000);
    const engagementBonus = Math.min(2, engagementRatio * 500);
    
    return Math.min(10, baseScore + likeBonus + engagementBonus);
  }
  
  private parseDuration(duration: string): number {
    // Parse ISO 8601 duration (e.g., "PT15M33S")
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 60 + minutes + Math.ceil(seconds / 60);
  }
  
  private inferMoodTags(title: string, description: string): string[] {
    const moods: string[] = [];
    const text = (title + ' ' + description).toLowerCase();
    
    if (/tutorial|how to|guide|learn/i.test(text)) moods.push('educational');
    if (/funny|comedy|hilarious|laugh/i.test(text))
      moods.push('fun', 'lighthearted');
    if (/relaxing|calm|peaceful|asmr/i.test(text)) moods.push('cozy', 'relaxing');
    if (/intense|extreme|epic|amazing/i.test(text))
      moods.push('energetic', 'thrilling');
    if (/review|analysis|explained/i.test(text))
      moods.push('informative', 'thoughtful');
    if (/music|song|soundtrack/i.test(text)) moods.push('musical', 'entertaining');
    
    return moods.length > 0 ? moods : ['entertaining'];
  }
}
