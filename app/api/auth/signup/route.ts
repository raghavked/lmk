import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, action } = body;

    if (action !== 'cleanup-unconfirmed') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });

    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json({ success: true, cleaned: false });
    }

    const existingUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (!existingUser) {
      return NextResponse.json({ success: true, cleaned: false });
    }

    if (existingUser.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Account already verified. Please sign in.' },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    if (deleteError) {
      console.error('Error deleting unconfirmed user:', deleteError);
      return NextResponse.json({ success: true, cleaned: false });
    }

    await supabaseAdmin.from('profiles').delete().eq('id', existingUser.id);
    console.log('Cleaned up unconfirmed user:', normalizedEmail);

    return NextResponse.json({ success: true, cleaned: true });
  } catch (err: any) {
    console.error('Signup API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
