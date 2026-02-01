import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
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

  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';

  if (query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .ilike('full_name', `%${query}%`)
      .neq('id', user.id)
      .limit(10);

    if (error) throw error;
    return NextResponse.json({ users: data || [] });
  } catch (error: any) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
