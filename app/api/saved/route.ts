import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const saveSchema = z.object({
  objectId: z.string().uuid(),
  collection: z.string().optional().default('default'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validatedData = saveSchema.parse(body);
    
    // Check if object exists
    const { data: object } = await supabase
      .from('objects')
      .select('id, category, title')
      .eq('id', validatedData.objectId)
      .single();
    
    if (!object) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 });
    }
    
    // Save as favorite rating if not already rated
    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id, is_favorite')
      .eq('user_id', user.id)
      .eq('object_id', validatedData.objectId)
      .single();
    
    if (existingRating) {
      // Update to favorite
      const { data: updated } = await supabase
        .from('ratings')
        .update({ is_favorite: true })
        .eq('id', existingRating.id)
        .select()
        .single();
      
      return NextResponse.json({
        message: 'Added to favorites',
        rating: updated,
      });
    } else {
      // Create new rating as favorite with neutral score
      const { data: created } = await supabase
        .from('ratings')
        .insert({
          user_id: user.id,
          object_id: validatedData.objectId,
          score: 7.0, // Default score for saved items
          is_favorite: true,
          is_public: false, // Don't show as public rating yet
        })
        .select()
        .single();
      
      return NextResponse.json({
        message: 'Saved for later',
        rating: created,
      });
    }
  } catch (error: any) {
    console.error('Save item error:', error);
    
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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get('objectId');
    
    if (!objectId) {
      return NextResponse.json({ error: 'Object ID required' }, { status: 400 });
    }
    
    // Find rating
    const { data: rating } = await supabase
      .from('ratings')
      .select('id, score, feedback, is_public')
      .eq('user_id', user.id)
      .eq('object_id', objectId)
      .single();
    
    if (!rating) {
      return NextResponse.json({ error: 'Not saved' }, { status: 404 });
    }
    
    // If it has a real rating, just unfavorite
    if (rating.score !== 7.0 || rating.feedback || rating.is_public) {
      await supabase
        .from('ratings')
        .update({ is_favorite: false })
        .eq('id', rating.id);
      
      return NextResponse.json({ message: 'Removed from favorites' });
    } else {
      // Delete if it was just a save without rating
      await supabase
        .from('ratings')
        .delete()
        .eq('id', rating.id);
      
      return NextResponse.json({ message: 'Removed from saved items' });
    }
  } catch (error: any) {
    console.error('Unsave item error:', error);
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
    
    // Get all saved/favorited items
    const { data: saved, error } = await supabase
      .from('ratings')
      .select(`
        id,
        created_at,
        score,
        is_favorite,
        objects (
          id,
          category,
          title,
          description,
          primary_image,
          tags,
          external_ratings,
          lmk_score
        )
      `)
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ saved: saved || [] });
  } catch (error: any) {
    console.error('Get saved items error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
