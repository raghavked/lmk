import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAnon.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      console.error('Signup error:', error.message);
      if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('limit')) {
        return NextResponse.json(
          { error: 'Too many signup attempts. Please wait a minute and try again.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Failed to create account' },
        { status: 500 }
      );
    }

    if (!data?.user || data.user.identities?.length === 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    console.log('Account created for:', normalizedEmail, '- verification email sent via SMTP');

    return NextResponse.json({
      success: true,
      message: 'Account created! Please check your email to verify your account.',
      requiresVerification: true,
    });
  } catch (err: any) {
    console.error('Signup API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
