import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// POST - Create profile (uses service role key for reliability)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, email, full_name } = body;

    if (!user_id || !email) {
      return NextResponse.json({ error: 'user_id and email are required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if profile already exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile, message: 'Profile already exists' });
    }

    // Create new profile
    const { data: profile, error } = await adminClient
      .from('profiles')
      .insert({
        id: user_id,
        email: email,
        full_name: full_name || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Profile creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Profile created via API for user:', user_id);
    return NextResponse.json({ profile, message: 'Profile created successfully' });
  } catch (error) {
    console.error('Profile POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, profile_image, taste_profile, location } = body;

    const updates: any = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (profile_image !== undefined) updates.profile_image = profile_image;
    if (taste_profile !== undefined) updates.taste_profile = taste_profile;
    if (location !== undefined) updates.location = location;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;

    const { error: ratingsError } = await supabase
      .from('ratings')
      .delete()
      .eq('user_id', userId);

    if (ratingsError) {
      console.error('Error deleting ratings:', ratingsError);
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (serviceRoleKey && supabaseUrl) {
      const { createClient } = await import('@supabase/supabase-js');
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      
      const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
      if (authError) {
        console.warn('Could not delete auth user:', authError.message);
      }
    } else {
      console.warn('Service role key not available - auth user not deleted');
    }

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Profile DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
