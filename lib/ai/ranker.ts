import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AIRankingContext {
  category: string;
  query?: string;
  filters?: any;
  friendRatings?: any[];
  mode?: 'chat' | 'swipe' | 'decide';
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
  };
}

export class AIRanker {
  async rank(
    objects: any[],
    user: any,
    context: AIRankingContext
  ): Promise<RankedResult[]> {
    if (objects.length === 0) return [];
    
    const prompt = this.buildPrompt(objects, user, context);
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: this.getSystemPrompt(context.category),
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });
      
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }
      
      const parsed = this.parseResponse(content.text);
      
      return parsed.rankings.map((ranking: any, index: number) => {
        const obj = objects[ranking.object_index - 1];
        return {
          rank: index + 1,
          object: obj,
          personalized_score: ranking.personalized_score,
          explanation: {
            hook: ranking.hook,
            why_youll_like: ranking.why_youll_like,
            friend_callout: ranking.friend_callout,
            caveats: ranking.caveats,
          },
        };
      });
    } catch (error) {
      console.error('AI ranking error:', error);
      
      return objects.map((obj, index) => ({
        rank: index + 1,
        object: obj,
        personalized_score: 8 - (index * 0.5),
      }));
    }
  }
  
  private getSystemPrompt(category: string): string {
    return `You are the LMK AI, a personalized recommendation engine.

Your role:
- Rank and explain recommendations based on user taste, friend ratings, and context
- Be concise but insightful
- Never hallucinate data—only use provided information
- Explain WHY something is recommended

Core principles:
1. Friends > Personal taste > Global ratings
2. Context is king (time of day, mood, occasion)
3. Diversity in recommendations
4. Acknowledge uncertainty`;
  }
  
  private buildPrompt(objects: any[], user: any, context: AIRankingContext): string {
    const tasteProfile = (user.taste_profile as any[])?.find(p => p.category === context.category);
    
    let userContext = `User: ${user.display_name}
Location: ${user.location?.city || 'Unknown'}
`;

    if (tasteProfile) {
      const topTags = tasteProfile.tags?.slice(0, 5).map((t: any) => t.tag).join(', ');
      userContext += `Preferences: ${topTags || 'Unknown'}
`;
    }
    
    userContext += `Query: "${context.query || 'general recommendation'}"
`;

    const objectsData = objects.map((obj, idx) => {
      const friendRatings = context.friendRatings?.filter(fr => fr.object_id === obj.id) || [];
      const externalRatings = obj.external_ratings || [];
      
      let objStr = `[${idx + 1}] ${obj.title}
`;

      if (externalRatings.length > 0) {
        objStr += `Ratings: ${externalRatings.map((r: any) => `${r.source} ${r.score.toFixed(1)}/10`).join(', ')}
`;
      }
      
      if (obj.tags && obj.tags.length > 0) {
        objStr += `Tags: ${obj.tags.slice(0, 5).join(', ')}
`;
      }
      
      if (obj.price_level) {
        objStr += `Price: ${'$'.repeat(obj.price_level)}
`;
      }
      
      if (friendRatings.length > 0) {
        objStr += `Friends: ${friendRatings.map((fr: any) => 
          `${fr.profiles?.display_name || 'Friend'} (${fr.score}/10)`
        ).join(', ')}
`;
      }
      
      if (obj.description) {
        objStr += `About: ${obj.description.slice(0, 150)}
`;
      }
      
      return objStr;
    }).join('\n');

    const topN = context.mode === 'decide' ? 1 : Math.min(5, objects.length);

    return `${userContext}

Candidates:
${objectsData}

Task: Rank these ${objects.length} options. Provide detailed explanations for top ${topN}.

Respond ONLY with valid JSON:
{
  "rankings": [
    {
      "object_index": 1,
      "personalized_score": 9.5,
      "hook": "One sentence hook",
      "why_youll_like": "2-3 sentence explanation",
      "friend_callout": "Friend name and rating (or empty)",
      "caveats": "Any warnings (or empty)"
    }
  ]
}`;
  }
  
  private parseResponse(text: string): any {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }
}
