/**
 * AIRanker - Intelligent Recommendation Ranking Engine (V2 - Reworked for Claude/Data-First)
 * Focuses on strict data synthesis and output validation to ensure factually grounded metrics.
 */

export interface AIRankingContext {
  category: string;
  query?: string;
  filters?: any;
  friendRatings?: any[];
  socialSignals?: any;
  mode?: 'chat' | 'swipe' | 'decide' | 'feed' | 'search' | 'map';
  location?: { lat: number, lng: number };
}

export interface RankedResult {
  rank: number;
  object: any;
  personalized_score: number;
  explanation?: {
    hook?: string;
    why_youll_like?: string;
    friend_callout?: string;
    caveats?: string;
    detailed_ratings?: Record<string, number>;
    tags?: string[];
    tagline?: string;
  };
}

export class AIRanker {
  // --- Core Ranking Logic ---
  async rank(
    objects: any[],
    user: any,
    context: AIRankingContext
  ): Promise<RankedResult[]> {
    if (!objects || objects.length === 0) return [];
    
    const claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    const openAIApiKey = process.env.OPENAI_API_KEY;
    
    if (!claudeApiKey && !openAIApiKey) {
      return this.getFallbackRankings(objects, context);
    }

    const prompt = this.buildPrompt(objects, user, context);
    const systemPrompt = this.getSystemPrompt(context.category, !!context.location);
    
    try {
      let content: string | null = null;
      
      // Use Claude Opus as primary (higher quality rankings)
      if (claudeApiKey) {
        content = await this.callClaudeAPI(systemPrompt, prompt, claudeApiKey);
      } else {
        return this.getFallbackRankings(objects, context);
      }

      if (!content) {
        throw new Error('Empty response from AI service');
      }
      
      let jsonString = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      } else {
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          jsonString = content.substring(firstBrace, lastBrace + 1);
        }
      }
      
      jsonString = jsonString.trim().replace(/,\s*([\]}])/g, '$1');
      
      const parsed = JSON.parse(jsonString);
      const rankings = parsed.rankings || [];
      
      const results = rankings.map((ranking: any) => {
        const obj = objects[ranking.object_index - 1];
        if (!obj) return null;
        
        let finalWhyYoullLike = ranking.why_youll_like || ranking.why_youll_like_it || obj.description || `A personalized recommendation based on your taste profile.`;

        return {
          rank: ranking.rank || 1,
          object: obj,
          personalized_score: ranking.personalized_score || 8.0,
          explanation: {
            hook: ranking.hook,
            why_youll_like: finalWhyYoullLike,
            friend_callout: ranking.friend_callout,
            caveats: ranking.caveats,
            detailed_ratings: ranking.detailed_ratings || {},
            tags: ranking.tags || [],
            tagline: ranking.tagline,
          },
        };
      }).filter(Boolean);
      
      // If AI returned no valid results but we had objects, use fallback
      if (results.length === 0 && objects.length > 0) {
        console.warn('[AIRanker] AI returned 0 results, using fallback');
        return this.getFallbackRankings(objects, context);
      }
      
      return results;
    } catch (error) {
      console.error('AI ranking error:', error);
      return this.getFallbackRankings(objects, context);
    }
  }

  private async callOpenAIAPI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async callClaudeAPI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4096,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const textContent = data.content.find((c: any) => c.type === 'text')?.text;
    return textContent || '';
  }
  
  private getSystemPrompt(category: string, hasLocation: boolean): string {
    const locationInstruction = hasLocation ? '- PROXIMITY: If an item is very close, factor that into the score and mention it. The user is reporting a lack of localization, so make sure to mention the distance if it is under 5 miles.' : '';
    
    return `You are the LMK AI, a highly intelligent and context-aware recommendation engine.

Your goal is to provide recommendations that feel deeply researched and expertly curated.

CRITICAL INSTRUCTIONS FOR RATINGS:
1. **FACTUAL ANCHORS**: You MUST use the provided 'Factual Data Points' to generate your metrics and descriptions. Do not invent facts.
2. **METRICS**: You MUST invent 3 unique, highly specific, and **category-appropriate** metrics for each item. These metrics MUST be directly derived from the Factual Data Points and the item's title/description. Examples: 'Dumpling Craftsmanship', 'Halal Authenticity', 'Cultural Fusion'.
   - **ZERO-TOLERANCE**: Metrics MUST NOT be generic (e.g., 'Quality', 'Value', 'Taste').
   - **SCORING**: The score for each metric (0-10) MUST reflect the Factual Data Points.
3. **PERSONALIZED SCORE**: The personalized_score (0-10) MUST be the final, most accurate reflection of the item's fit for the user, adjusting the external rating based on the user's taste profile.

CRITICAL INSTRUCTIONS FOR CONTENT:
1. TAGLINE: Create a punchy, high-end tagline (max 8 words).
2. WHY YOU'LL LIKE IT: Write 2-3 sentences that connect the item's specific strengths (from the Factual Data Points) to the user's taste profile. The description MUST reference at least one specific Factual Data Point. Use the key "why_youll_like" for this field. The description MUST be written in a sophisticated, high-end editorial tone.
3. TAGS: Use 2-3 specific subject tags (e.g., #Cyberpunk, #FarmToTable).

${locationInstruction}

        Respond ONLY with a JSON object containing a "rankings" array. The JSON MUST be wrapped in \`\`\`json ... \`\`\`. Each ranking MUST include "object_index", "personalized_score", "hook", "why_youll_like", "tagline", "tags", and "detailed_ratings". The "detailed_ratings" field MUST be an object with exactly 3 keys (the 3 unique metrics). DO NOT include any text or markdown outside of the JSON block.

**FINAL INSTRUCTION**: Since the user is reporting a lack of personalization, you MUST be extremely aggressive in using the 'Taste Profile' data in the 'why_youll_like' field. The description MUST be written in a sophisticated, high-end editorial tone, matching the style of the provided image examples. For example, if the user likes 'Spicy Food' and the restaurant has 'High Yelp Review Count', the 'why_youll_like' must say something like: "Given your preference for Spicy Food, this restaurant's high Yelp Review Count of 395 suggests a reliable source for the authentic heat you crave."`;
  }
  
  private buildPrompt(objects: any[], user: any, context: AIRankingContext): string {
    const tasteProfile = user.taste_profile || [];
    const socialSignals = context.socialSignals;
    
    let userContext = `User: ${user.full_name || user.display_name || 'User'}
Location: ${user.location?.city || 'Unknown'}
`;

    if (context.location) {
      userContext += `Current GPS: ${context.location.lat}, ${context.location.lng}\n`;
    }

    if (tasteProfile && (Array.isArray(tasteProfile) ? tasteProfile.length > 0 : Object.keys(tasteProfile).length > 0)) {
      let profileStr = '';
      if (Array.isArray(tasteProfile)) {
        profileStr = tasteProfile.map((p: any) => p.name || p).join(', ');
      } else {
        const parts: string[] = [];
        const formatValue = (val: any): string => {
          if (Array.isArray(val)) return val.join(', ');
          return String(val);
        };
        if (tasteProfile.cuisine_preference) parts.push(`Cuisines: ${formatValue(tasteProfile.cuisine_preference)}`);
        if (tasteProfile.dining_atmosphere) parts.push(`Dining Atmosphere: ${formatValue(tasteProfile.dining_atmosphere)}`);
        if (tasteProfile.dietary_preferences) parts.push(`Dietary: ${formatValue(tasteProfile.dietary_preferences)}`);
        if (tasteProfile.movie_genres) parts.push(`Movie Genres: ${formatValue(tasteProfile.movie_genres)}`);
        if (tasteProfile.movie_style) parts.push(`Movie Style: ${formatValue(tasteProfile.movie_style)}`);
        if (tasteProfile.movie_era) parts.push(`Movie Era: ${formatValue(tasteProfile.movie_era)}`);
        if (tasteProfile.tv_genres) parts.push(`TV Genres: ${formatValue(tasteProfile.tv_genres)}`);
        if (tasteProfile.show_commitment) parts.push(`Show Length: ${formatValue(tasteProfile.show_commitment)}`);
        if (tasteProfile.show_tone) parts.push(`Show Tone: ${formatValue(tasteProfile.show_tone)}`);
        if (tasteProfile.youtube_content) parts.push(`YouTube Content: ${formatValue(tasteProfile.youtube_content)}`);
        if (tasteProfile.youtube_length) parts.push(`YouTube Length: ${formatValue(tasteProfile.youtube_length)}`);
        if (tasteProfile.book_genres) parts.push(`Book Genres: ${formatValue(tasteProfile.book_genres)}`);
        if (tasteProfile.reading_pace) parts.push(`Reading Pace: ${formatValue(tasteProfile.reading_pace)}`);
        if (tasteProfile.book_depth) parts.push(`Book Depth: ${formatValue(tasteProfile.book_depth)}`);
        if (tasteProfile.activity_type) parts.push(`Activities: ${formatValue(tasteProfile.activity_type)}`);
        if (tasteProfile.activity_energy) parts.push(`Activity Energy: ${formatValue(tasteProfile.activity_energy)}`);
        if (tasteProfile.activity_group) parts.push(`Activity Group Size: ${formatValue(tasteProfile.activity_group)}`);
        profileStr = parts.join('\n');
      }
      userContext += `\n--- User Taste Profile ---\n${profileStr}\n--------------------------\n`;
    }
    
    if (socialSignals) {
      userContext += `\n--- Social Context ---\n`;
      userContext += `Top Friend Preferences: ${socialSignals.topFriendPreferences}\n`;
      userContext += `Friends' Average Rating: ${socialSignals.averageFriendRating}/10\n`;
      userContext += `Common Friend Hashtags: ${socialSignals.commonFriendHashtags}\n`;
      userContext += `----------------------\n`;
    }
    
    userContext += `Context: ${context.query || 'Browsing for discovery'}\n`;

    const objectsData = objects.map((obj, idx) => {
      let objStr = `[${idx + 1}] ${obj.title}\n`;
      if (obj.location) {
        objStr += `Location: ${obj.location.address || ''}, ${obj.location.city || ''}\n`;
        if (context.location && obj.location.coordinates) {
          const dist = this.calculateDistance(
            context.location.lat, context.location.lng,
            obj.location.coordinates[0], obj.location.coordinates[1]
          );
          objStr += `Distance: ${dist.toFixed(1)} miles\n`;
        }
      }
      if (obj.tags) objStr += `Data Tags: ${obj.tags.join(', ')}\n`;
      if (obj.description) objStr += `Detailed Info: ${obj.description}\n`;
      
      objStr += `\n--- Factual Data Points ---\n`;
      if (obj.category === 'restaurant' || obj.category === 'restaurants') {
        objStr += `Yelp Price Level: ${obj.price || 'N/A'}\n`;
        objStr += `Yelp Review Count: ${obj.review_count || 0}\n`;
        objStr += `Yelp Rating: ${obj.external_ratings?.find((r: any) => r.source === 'yelp')?.score || 'N/A'}\n`;
        objStr += `Yelp Categories: ${obj.categories?.map((c: any) => c.title).join(', ') || 'N/A'}\n`;
      } else if (obj.category === 'movie' || obj.category === 'movies') {
        objStr += `TMDB Genres: ${obj.genres?.join(', ') || 'N/A'}\n`;
        objStr += `TMDB Release Date: ${obj.release_date || 'N/A'}\n`;
        objStr += `TMDB Vote Average: ${obj.external_ratings?.find((r: any) => r.source === 'tmdb')?.score || 'N/A'}\n`;
        objStr += `TMDB Vote Count: ${obj.vote_count || 'N/A'}\n`;
      } else if (obj.category === 'tv_show' || obj.category === 'tv_shows') {
        objStr += `TMDB Genres: ${obj.genres?.join(', ') || 'N/A'}\n`;
        objStr += `TMDB Release Date: ${obj.release_date || 'N/A'}\n`;
        objStr += `TMDB Vote Average: ${obj.external_ratings?.find((r: any) => r.source === 'tmdb')?.score || 'N/A'}\n`;
        objStr += `TMDB Vote Count: ${obj.vote_count || 'N/A'}\n`;
      } else if (obj.category === 'youtube_videos' || obj.category === 'youtube') {
        objStr += `YouTube View Count: ${obj.view_count || 'N/A'}\n`;
        objStr += `YouTube Channel: ${obj.channel_title || 'N/A'}\n`;
        objStr += `YouTube Published Date: ${obj.published_at || 'N/A'}\n`;
      }
      objStr += `---------------------------\n`;
      
      if (obj.external_ratings) {
        objStr += `External Ratings: ${JSON.stringify(obj.external_ratings)}\n`;
      }
      
      return objStr;
    }).join('\n---\n');

    return `Rank these items for the user based on their taste profile and the factual data provided.
    
${userContext}

Items to Rank:
${objectsData}

Provide the rankings in the requested JSON format.`;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private getFallbackRankings(objects: any[], context: AIRankingContext): RankedResult[] {
    return objects.map((obj, idx) => {
      try {
        return {
          rank: idx + 1,
          object: obj,
          personalized_score: 8.0,
          explanation: {
            hook: "Recommended for you",
            why_youll_like: `Based on your interest in ${context.category}, this is a great match.`,
            tagline: obj?.title || 'Recommendation',
            tags: obj?.tags || [],
            detailed_ratings: this.getFallbackRatings(context.category, obj)
          }
        };
      } catch (err) {
        console.error('Error in fallback ranking for object:', obj, err);
        return {
          rank: idx + 1,
          object: obj || {},
          personalized_score: 8.0,
          explanation: {
            hook: "Recommended for you",
            why_youll_like: `A great match based on your interests.`,
            tagline: 'Recommendation',
            tags: [],
            detailed_ratings: { 'Quality': 8.0 }
          }
        };
      }
    });
  }

  private getFallbackRatings(category: string, obj: any): Record<string, number> {
    const title = (obj.title || '').toLowerCase();
    if (category === 'restaurants' || category === 'restaurant') {
      if (title.includes('sushi') || title.includes('japanese')) return { "Freshness": 8.5, "Artistry": 8.0, "Authenticity": 9.0 };
      if (title.includes('burger') || title.includes('grill')) return { "Juiciness": 8.5, "Bun Quality": 8.0, "Value": 8.5 };
      return { "Taste": 8.5, "Ambiance": 8.0, "Service": 8.5 };
    }
    if (category === 'movies' || category === 'movie') {
      return { "Plot": 8.5, "Cinematography": 9.0, "Pacing": 8.2 };
    }
    if (category === 'tv_shows' || category === 'tv_show') {
      return { "Plot": 8.5, "Character Development": 8.5, "Pacing": 8.2 };
    }
    if (category === 'youtube_videos' || category === 'youtube') {
      return { "Entertainment": 8.5, "Production Quality": 8.0, "Engagement": 8.5 };
    }
    return { "Quality": 8.5, "Value": 8.0, "Experience": 8.5 };
  }
}
