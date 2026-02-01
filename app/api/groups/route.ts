import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticateRequest(request: Request) {
  let token: string | null = null;
  
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  if (!token) {
    const xAuthToken = request.headers.get('X-Auth-Token');
    if (xAuthToken) {
      token = xAuthToken;
    }
  }
  
  if (!token) {
    return null;
  }
  
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  
  return user;
}

export async function GET(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: groups, error } = await supabaseAdmin
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ groups: groups || [] });
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .insert({
        name,
        description: description || '',
        created_by: user.id,
      })
      .select()
      .single();

    if (groupError) throw groupError;

    const { error: memberError } = await supabaseAdmin
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
      });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
    }

    return NextResponse.json({ group });
  } catch (error: any) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
