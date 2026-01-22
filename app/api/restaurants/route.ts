import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { YelpAPI } from '@/lib/api/yelp';
import { generateCacheKey } from '@/lib/utils';

const requestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(100).max(40000).optional().default(8000),
  term: z.string().optional(),
  price: z.array(z.number().min(1).max(4)).optional(),
  limit: z.number().min(1).max(50).optional().default(20),
});

const yelpAPI = new YelpAPI();

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
    const cacheKey = generateCacheKey('restaurants', validatedData);
    
    // Check cache (24 hour TTL)
    const cacheExpiry = new Date();
    cacheExpiry.setHours(cacheExpiry.getHours() - 24);
    
    const { data: cached } = await supabase
      .from('api_cache')
      .select('response_data, created_at')
      .eq('cache_key', cacheKey)
      .eq('endpoint', 'yelp')
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (cached) {
      // Update hit count
      await supabase
        .from('api_cache')
        .update({ hit_count: supabase.rpc('increment', { row_id: cached.id }) })
        .eq('cache_key', cacheKey);
      
      return NextResponse.json({
        results: cached.response_data,
        cached: true,
      });
    }
    
    // Fetch from Yelp API
    const results = await yelpAPI.search({
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      radius: validatedData.radius,
      term: validatedData.term,
      price: validatedData.price?.join(','),
      limit: validatedData.limit,
    });
    
    if (!results || results.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'No restaurants found',
      });
    }
    
    // Normalize and upsert to database
    const normalizedResults = [];
    
    for (const result of results) {
      // Check if object already exists
      const { data: existing } = await supabase
        .from('objects')
        .select('id')
        .eq('external_ids->>yelp_id', result.external_ids.yelp_id)
        .single();
      
      if (existing) {
        // Update existing
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
        // Insert new
        const { data: inserted } = await supabase
          .from('objects')
          .insert(result)
          .select()
          .single();
        
        normalizedResults.push(inserted);
      }
    }
    
    // Cache results
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await supabase
      .from('api_cache')
      .upsert({
        cache_key: cacheKey,
        endpoint: 'yelp',
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
    console.error('Restaurants API error:', error);
    
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
    
    const { data: restaurant, error } = await supabase
      .from('objects')
      .select('*')
      .eq('id', id)
      .eq('category', 'restaurant')
      .single();
    
    if (error || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    
    // Get user's rating if exists
    const { data: userRating } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', user.id)
      .eq('object_id', id)
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
      .eq('object_id', id)
      .eq('is_public', true)
      .neq('user_id', user.id);
    
    return NextResponse.json({
      restaurant,
      user_rating: userRating,
      friend_ratings: friendRatings || [],
    });
    
  } catch (error: any) {
    console.error('Get restaurant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
