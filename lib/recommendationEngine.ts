import { LMKScorer } from './scorer';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export class RecommendationEngine {
  private scorer: LMKScorer;

  constructor() {
    this.scorer = new LMKScorer();
  }

  async getRecommendations(userId: string, options: any = {}) {
    const supabase = createServerComponentClient({ cookies });

    // 1. Get user profile and taste profile
    const { data: user } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // 2. Get candidate objects (could be filtered by category, location, etc.)
    let query = supabase.from('objects').select('*').limit(100);
    
    if (options.category) {
      query = query.eq('category', options.category);
    }

    const { data: candidates } = await query;

    // 3. Get friend ratings for these candidates
    const { data: friendRatings } = await supabase
      .from('ratings')
      .select('*')
      .in('object_id', candidates?.map(c => c.id) || [])
      .neq('user_id', userId);

    // 4. Score each candidate
    const scoredResults = (candidates || []).map(object => {
      const relevantFriendRatings = (friendRatings || []).filter(r => r.object_id === object.id);
      return this.scorer.calculateScore(object, user, relevantFriendRatings, {
        category: options.category || object.category,
        filters: options.filters
      });
    });

    // 5. Sort by score and return top results
    return scoredResults
      .sort((a, b) => b.personalized_score - a.personalized_score)
      .slice(0, options.limit || 20);
  }
}
