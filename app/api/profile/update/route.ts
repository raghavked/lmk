import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  profile_image: z.string().url().optional(),
  location: z.object({
    city: z.string(),
    state: z.string(),
    country: z.string(),
    coordinates: z.tuple([z.number(), z.number()]),
  }).optional(),
  preferences: z.object({
    categories_enabled: z.array(z.string()).optional(),
    discovery_radius_miles: z.number().min(1).max(100).optional(),
    price_range_preference: z.tuple([z.number(), z.number()]).optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    streaming_services: z.array(z.string()).optional(),
  }).optional(),
  settings: z.object({
    notifications_enabled: z.boolean().optional(),
    friend_ratings_visible: z.boolean().optional(),
    profile_public: z.boolean().optional(),
  }).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);
    
    // Get current profile
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Build update object
    const updateData: any = {};
    
    if (validatedData.display_name !== undefined) {
      updateData.display_name = validatedData.display_name;
    }
    
    if (validatedData.profile_image !== undefined) {
      updateData.profile_image = validatedData.profile_image;
    }
    
    if (validatedData.location !== undefined) {
      updateData.location = validatedData.location;
    }
    
    if (validatedData.preferences !== undefined) {
      updateData.preferences = {
        ...currentProfile.preferences,
        ...validatedData.preferences,
      };
    }
    
    if (validatedData.settings !== undefined) {
      updateData.settings = {
        ...currentProfile.settings,
        ...validatedData.settings,
      };
    }
    
    // Update profile
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updated,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    
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
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
