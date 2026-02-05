import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) {
      console.error('Error listing users:', usersError);
      return NextResponse.json({ exists: false });
    }

    const userExists = usersData.users.some(
      (user) => user.email?.toLowerCase() === normalizedEmail
    );

    return NextResponse.json({ exists: userExists });
  } catch (error) {
    console.error('Check email error:', error);
    return NextResponse.json({ exists: false });
  }
}
