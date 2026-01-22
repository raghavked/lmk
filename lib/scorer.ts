export interface ScoringContext {
  category: string;
  query?: string;
  filters?: {
    priceMax?: number;
    timeMax?: number;
    mood?: string;
    friendsOnly?: boolean;
  };
  time_of_day?: string;
  day_of_week?: string;
  user_location?: [number, number];
}

export interface ScoredObject {
  object: any;
  personalized_score: number;
  breakdown: {
    friend: number;
    taste: number;
    external: number;
    recency: number;
    context: number;
  };
  weights: {
    friend_ratings: number;
    user_taste_match: number;
    external_ratings: number;
    recency: number;
    context_match: number;
  };
}

export class LMKScorer {
  calculateScore(
    object: any,
    user: any,
    friendRatings: any[],
    context: ScoringContext
  ): ScoredObject {
    const weights = {
      friend_ratings: 0.40,
      user_taste_match: 0.25,
      external_ratings: 0.15,
      recency: 0.10,
      context_match: 0.10,
    };
    
    const scores = {
      friend: this.calculateFriendScore(object, friendRatings),
      taste: this.calculateTasteScore(object, user),
      external: this.calculateExternalScore(object),
      recency: this.calculateRecencyScore(object),
      context: this.calculateContextScore(object, context, user),
    };
    
    const weightedScore = 
      scores.friend * weights.friend_ratings +
      scores.taste * weights.user_taste_match +
      scores.external * weights.external_ratings +
      scores.recency * weights.recency +
      scores.context * weights.context_match;
    
    return {
      object,
      personalized_score: Math.round(weightedScore * 10) / 10,
      breakdown: scores,
      weights,
    };
  }
  
  private calculateFriendScore(object: any, friendRatings: any[]): number {
    if (friendRatings.length === 0) return 5;
    
    const totalScore = friendRatings.reduce((sum, r) => sum + r.score, 0);
    return totalScore / friendRatings.length;
  }
  
  private calculateTasteScore(object: any, user: any): number {
    const tasteProfile = user.taste_profile as any[];
    if (!tasteProfile || tasteProfile.length === 0) return 5;
    
    const profile = tasteProfile.find((p: any) => p.category === object.category);
    if (!profile) return 5;
    
    let matchScore = 0;
    let matchCount = 0;
    
    for (const tag of object.tags || []) {
      const userTagWeight = profile.tags?.find((t: any) => t.tag === tag)?.weight || 0;
      if (userTagWeight > 0) {
        matchScore += userTagWeight;
        matchCount++;
      }
    }
    
    if (matchCount === 0) return 5;
    
    const avgMatch = matchScore / matchCount;
    let baseScore = avgMatch * 10;
    
    if (object.price_level && profile.avg_price_rated) {
      const priceDiff = Math.abs(object.price_level - profile.avg_price_rated);
      const pricePenalty = priceDiff * 0.5;
      baseScore = Math.max(0, Math.min(10, baseScore - pricePenalty));
    }
    
    return baseScore;
  }
  
  private calculateExternalScore(object: any): number {
    const externalRatings = object.external_ratings as any[];
    if (!externalRatings || externalRatings.length === 0) return 5;
    
    const sourceWeights: Record<string, number> = {
      yelp: 1.0,
      google: 0.9,
      tmdb: 1.0,
      imdb: 0.8,
      rotten_tomatoes: 0.7,
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const rating of externalRatings) {
      const weight = (sourceWeights[rating.source] || 0.5) * Math.log(rating.count + 1);
      totalScore += rating.score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 5;
  }
  
  private calculateRecencyScore(object: any): number {
    if (!object.created_at) return 5;
    
    const daysSinceCreated = (Date.now() - new Date(object.created_at).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreated < 30) return 8;
    if (daysSinceCreated < 180) return 6;
    return 5;
  }
  
  private calculateContextScore(object: any, context: ScoringContext, user: any): number {
    let score = 5;
    
    if (context.filters?.mood && object.mood_tags) {
      const hasMood = object.mood_tags.includes(context.filters.mood);
      if (hasMood) score += 2;
    }
    
    if (context.filters?.priceMax && object.price_level) {
      if (object.price_level > context.filters.priceMax) {
        score -= 3;
      }
    }
    
    if (context.filters?.timeMax && object.time_commitment) {
      const typical = object.time_commitment.typical_minutes || object.time_commitment.max_minutes;
      if (typical > context.filters.timeMax) {
        score -= 2;
      }
    }
    
    if (object.location && user.location?.coordinates) {
      const userCoords = user.location.coordinates;
      const objCoords = object.location.coordinates;
      const distance = this.calculateDistance(userCoords[0], userCoords[1], objCoords[0], objCoords[1]);
      
      if (distance > 20) score -= 2;
      if (distance > 50) score -= 3;
    }
    
    return Math.max(0, Math.min(10, score));
  }
  
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
