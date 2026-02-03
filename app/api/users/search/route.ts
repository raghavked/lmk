import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const xAuthToken = request.headers.get('X-Auth-Token');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : xAuthToken;

  if (token) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user) {
      return user;
    }
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    return session.user;
  }
  
  return null;
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
