import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { TMDBAPI } from '@/lib/api/tmdb';
import { generateCacheKey } from '@/lib/utils';

const requestSchema = z.object({
  query: z.string().optional(),
  genre: z.number().optional(),
  year: z.number().min(1900).max(2100).optional(),
  page: z.number().min(1).max(100).optional().default(1),
  popular: z.boolean().optional().default(false),
});

const tmdbAPI = new TMDBAPI();

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = requestSchema.parse(body);
    
    // Generate cache key
    const cacheKey = generateCacheKey('movies', validatedData);
    
    // Check cache (7 day TTL for movies)
    const { data: cached } = await supabase
      .from('api_cache')
      .select('response_data, created_at')
      .eq('cache_key', cacheKey)
      .eq('endpoint', 'tmdb')
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (cached) {
      await supabase.rpc('increment_cache_hits', { cache_id: cached.id });
      
      return NextResponse.json({
        results: cached.response_data,
        cached: true,
      });
    }
    
    // Fetch from TMDB API
    let results;
    
    if (validatedData.popular) {
      results = await tmdbAPI.getPopularMovies();
    } else if (validatedData.query) {
      results = await tmdbAPI.searchMovies({
        query: validatedData.query,
        year: validatedData.year,
        page: validatedData.page,
      });
    } else {
      return NextResponse.json({
        error: 'Either query or popular flag is required',
      }, { status: 400 });
    }
    
    if (!results || results.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'No movies found',
      });
    }
    
    // Normalize and upsert to database
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
    console.error('Movies API error:', error);
    
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
    const tmdbId = searchParams.get('tmdb_id');
    
    if (!id && !tmdbId) {
      return NextResponse.json({ error: 'ID or TMDB ID required' }, { status: 400 });
    }
    
    let movie;
    
    if (id) {
      const { data } = await supabase
        .from('objects')
        .select('*')
        .eq('id', id)
        .eq('category', 'movie')
        .single();
      movie = data;
    } else if (tmdbId) {
      // Fetch detailed info from TMDB if not in DB
      const { data: existing } = await supabase
        .from('objects')
        .select('*')
        .eq('external_ids->>tmdb_id', tmdbId)
        .eq('category', 'movie')
        .single();
      
      if (existing) {
        movie = existing;
      } else {
        const details = await tmdbAPI.getMovieDetails(parseInt(tmdbId));
        
        if (details) {
          const { data: inserted } = await supabase
            .from('objects')
            .insert(details)
            .select()
            .single();
          
          movie = inserted;
        }
      }
    }
    
    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }
    
    // Get user's rating
    const { data: userRating } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', user.id)
      .eq('object_id', movie.id)
      .single();
    
    // Get friend ratings
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
      .eq('object_id', movie.id)
      .eq('is_public', true)
      .neq('user_id', user.id);
    
    return NextResponse.json({
      movie,
      user_rating: userRating,
      friend_ratings: friendRatings || [],
    });
    
  } catch (error: any) {
    console.error('Get movie error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
