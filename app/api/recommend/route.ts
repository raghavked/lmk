import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { YelpAPI } from '@/lib/api/yelp';
import { TMDBAPI } from '@/lib/api/tmdb';
import { LMKScorer } from '@/lib/scorer';
import { AIRanker } from '@/lib/ai/ranker';

const yelpAPI = new YelpAPI();
const tmdbAPI = new TMDBAPI();
const scorer = new LMKScorer();
const aiRanker = new AIRanker();

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { query, category, location, filters, mode = 'chat' } = body;
    
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Determine category if not specified
    let finalCategory = category;
    if (!finalCategory && query) {
      finalCategory = inferCategory(query);
    }
    
    if (!finalCategory) {
      return NextResponse.json({ error: 'Could not determine category' }, { status: 400 });
    }
    
    // Fetch objects from external APIs
    let objects: any[] = [];
    
    if (finalCategory === 'restaurant') {
      const loc = location || profile.location?.coordinates;
      if (!loc) {
        return NextResponse.json({ error: 'Location required for restaurants' }, { status: 400 });
      }
      
      objects = await yelpAPI.search({
        latitude: loc[0],
        longitude: loc[1],
        radius: 8000,
        term: query,
      });
    } else if (finalCategory === 'movie') {
      objects = query 
        ? await tmdbAPI.searchMovies({ query })
        : await tmdbAPI.getPopularMovies();
    } else if (finalCategory === 'tv_show') {
      objects = query 
        ? await tmdbAPI.searchTVShows({ query })
        : await tmdbAPI.getPopularMovies();
    }
    
    if (objects.length === 0) {
      return NextResponse.json({ results: [], message: 'No results found' });
    }
    
    // Upsert objects to database
    for (const obj of objects) {
      const { data: existing } = await supabase
        .from('objects')
        .select('id')
        .or(`external_ids->yelp_id.eq.${obj.external_ids?.yelp_id},external_ids->tmdb_id.eq.${obj.external_ids?.tmdb_id}`)
        .single();
      
      if (existing) {
        obj.id = existing.id;
      } else {
        const { data: created } = await supabase
          .from('objects')
          .insert(obj)
          .select('id')
          .single();
        
        if (created) {
          obj.id = created.id;
        }
      }
    }
    
    // Get friend ratings for these objects
    const objectIds = objects.map(o => o.id).filter(Boolean);
    const friendRatings = await getFriendRatings(supabase, user.id, objectIds);
    
    // Score objects
    const scored = objects.map(obj => {
      const objFriendRatings = friendRatings.filter(fr => fr.object_id === obj.id);
      return scorer.calculateScore(obj, profile, objFriendRatings, {
        category: finalCategory,
        query,
        filters,
        time_of_day: getTimeOfDay(),
        day_of_week: getDayOfWeek(),
      });
    });
    
    // Sort by score
    scored.sort((a, b) => b.personalized_score - a.personalized_score);
    
    // Get top candidates for AI ranking
    const topCandidates = scored.slice(0, Math.min(20, scored.length));
    
    // AI ranking for chat/decide modes
    let results: any[] = [];
    
    if (mode === 'chat' || mode === 'decide') {
      const ranked = await aiRanker.rank(
        topCandidates.map(s => s.object),
        profile,
        {
          category: finalCategory,
          query,
          filters,
          friendRatings: friendRatings.filter(fr => 
            topCandidates.some(tc => tc.object.id === fr.object_id)
          ),
          mode,
        }
      );
      
      results = ranked;
    } else {
      results = topCandidates.map((s, index) => ({
        rank: index + 1,
        object: s.object,
        personalized_score: s.personalized_score,
        scoring_breakdown: s.breakdown,
      }));
    }
    
    // Save recommendation session
    await supabase
      .from('recommendation_sessions')
      .insert({
        user_id: user.id,
        query: {
          natural_language: query,
          category: finalCategory,
          location,
          filters,
        },
        results: results.map(r => ({
          object_id: r.object.id,
          rank: r.rank,
          personalized_score: r.personalized_score,
          explanation: r.explanation,
        })),
      });
    
    return NextResponse.json({ 
      results,
      category: finalCategory,
      mode,
    });
  } catch (error) {
    console.error('Recommend API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getFriendRatings(supabase: any, userId: string, objectIds: string[]) {
  if (objectIds.length === 0) return [];
  
  const { data: friendships } = await supabase
    .from('friendships')
    .select('user_id_1, user_id_2')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .eq('status', 'accepted');
  
  if (!friendships || friendships.length === 0) return [];
  
  const friendIds = friendships.map((f: any) => 
    f.user_id_1 === userId ? f.user_id_2 : f.user_id_1
  );
  
  const { data: ratings } = await supabase
    .from('ratings')
    .select(`
      id,
      object_id,
      user_id,
      score,
      feedback,
      profiles:user_id (display_name, profile_image)
    `)
    .in('object_id', objectIds)
    .in('user_id', friendIds)
    .eq('is_public', true);
  
  return ratings || [];
}

function inferCategory(query: string): string | undefined {
  const q = query.toLowerCase();
  
  if (/(restaurant|food|eat|dinner|lunch|breakfast|pizza|sushi|burger)/i.test(q)) {
    return 'restaurant';
  }
  if (/(movie|film|watch|cinema)/i.test(q)) {
    return 'movie';
  }
  if (/(show|series|tv|episode|season)/i.test(q)) {
    return 'tv_show';
  }
  if (/(article|read|blog|news)/i.test(q)) {
    return 'article';
  }
  if (/(video|youtube|watch|channel)/i.test(q)) {
    return 'youtube';
  }
  if (/(do|activity|things to|fun|experience)/i.test(q)) {
    return 'activity';
  }
  
  return undefined;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'late_night';
}

function getDayOfWeek(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}
