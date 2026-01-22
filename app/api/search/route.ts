import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1),
  category: z.enum(['restaurant', 'movie', 'tv_show', 'article', 'youtube', 'activity']).optional(),
  limit: z.number().min(1).max(50).optional().default(20),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validatedData = searchSchema.parse(body);
    
    // Build search query
    let query = supabase
      .from('objects')
      .select('*')
      .or(`title.ilike.%${validatedData.query}%,description.ilike.%${validatedData.query}%`)
      .limit(validatedData.limit);
    
    if (validatedData.category) {
      query = query.eq('category', validatedData.category);
    }
    
    const { data: results, error } = await query.order('lmk_score', { ascending: false, nullsLast: true });
    
    if (error) {
      throw error;
    }
    
    // Get user's ratings for these objects
    const objectIds = results?.map(r => r.id) || [];
    
    const { data: userRatings } = await supabase
      .from('ratings')
      .select('object_id, score, is_favorite')
      .eq('user_id', user.id)
      .in('object_id', objectIds);
    
    // Create rating map
    const ratingMap = (userRatings || []).reduce((acc: any, rating: any) => {
      acc[rating.object_id] = rating;
      return acc;
    }, {});
    
    // Attach user ratings to results
    const enrichedResults = (results || []).map(obj => ({
      ...obj,
      user_rating: ratingMap[obj.id] || null,
    }));
    
    return NextResponse.json({
      results: enrichedResults,
      total: enrichedResults.length,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }
    
    // Build search query
    let dbQuery = supabase
      .from('objects')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit);
    
    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }
    
    const { data: results, error } = await dbQuery.order('lmk_score', { ascending: false, nullsLast: true });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      results: results || [],
      total: results?.length || 0,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
