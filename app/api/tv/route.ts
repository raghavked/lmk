import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { TMDBAPI } from '@/lib/api/tmdb';
import { generateCacheKey } from '@/lib/utils';

const requestSchema = z.object({
  query: z.string().optional(),
  genre: z.number().optional(),
  page: z.number().min(1).max(100).optional().default(1),
  popular: z.boolean().optional().default(false),
});

const tmdbAPI = new TMDBAPI();

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validatedData = requestSchema.parse(body);
    
    const cacheKey = generateCacheKey('tv', validatedData);
    
    // Check cache (7 day TTL)
    const { data: cached } = await supabase
      .from('api_cache')
      .select('response_data, created_at')
      .eq('cache_key', cacheKey)
      .eq('endpoint', 'tmdb')
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (cached) {
      return NextResponse.json({
        results: cached.response_data,
        cached: true,
      });
    }
    
    // Fetch from TMDB
    let results;
    
    if (validatedData.query) {
      results = await tmdbAPI.searchTVShows({
        query: validatedData.query,
        page: validatedData.page,
      });
    } else {
      return NextResponse.json({
        error: 'Query is required',
      }, { status: 400 });
    }
    
    if (!results || results.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'No TV shows found',
      });
    }
    
    // Normalize and upsert
    const normalizedResults = [];
    
    for (const result of results) {
      const { data: existing } = await supabase
        .from('objects')
        .select('id')
        .eq('external_ids->>tmdb_id', result.external_ids.tmdb_id)
        .single();
      
      if (existing) {
        const { data: updated } = await supabase
          .from('objects')
          .update({
            ...result,
            last_fetched: new Date().toISOString(),
            data_stale: false,
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        normalizedResults.push(updated);
      } else {
        const { data: inserted } = await supabase
          .from('objects')
          .insert(result)
          .select()
          .single();
        
        normalizedResults.push(inserted);
      }
    }
    
    // Cache results (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await supabase
      .from('api_cache')
      .upsert({
        cache_key: cacheKey,
        endpoint: 'tmdb',
        response_data: normalizedResults,
        expires_at: expiresAt.toISOString(),
        hit_count: 0,
      }, {
        onConflict: 'cache_key',
      });
    
    return NextResponse.json({
      results: normalizedResults,
      cached: false,
    });
    
  } catch (error: any) {
    console.error('TV API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    const { data: tvShow, error } = await supabase
      .from('objects')
      .select('*')
      .eq('id', id)
      .eq('category', 'tv_show')
      .single();
    
    if (error || !tvShow) {
      return NextResponse.json({ error: 'TV show not found' }, { status: 404 });
    }
    
    const { data: userRating } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', user.id)
      .eq('object_id', id)
      .single();
    
    const { data: friendRatings } = await supabase
      .from('ratings')
      .select(`
        *,
        profiles:user_id (
          id,
          display_name,
          profile_image
        )
      `)
      .eq('object_id', id)
      .eq('is_public', true)
      .neq('user_id', user.id);
    
    return NextResponse.json({
      tv_show: tvShow,
      user_rating: userRating,
      friend_ratings: friendRatings || [],
    });
    
  } catch (error: any) {
    console.error('Get TV show error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
