import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const { email, password, fullName, action } = await request.json();
    const normalizedEmail = email?.trim().toLowerCase();

    if (action === 'resend') {
      if (!normalizedEmail) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail);

      if (!existingUser) {
        return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
      }

      if (existingUser.email_confirmed_at) {
        return NextResponse.json({ error: 'Email is already verified. Please sign in.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Please use the resend button to request a new verification email.',
        needsClientResend: true,
      });
    }

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

    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      if (!existingUser.email_confirmed_at) {
        return NextResponse.json({
          success: true,
          message: 'Account already exists but email is not verified. We\'ll resend the verification email.',
          requiresVerification: true,
          needsClientResend: true,
          alreadyExisted: true,
        });
      }

      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName.trim(),
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        full_name: fullName.trim(),
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    console.log('Account created for:', normalizedEmail, '- client will trigger verification email');

    return NextResponse.json({
      success: true,
      message: 'Account created! Sending verification email...',
      requiresVerification: true,
      needsClientResend: true,
    });
  } catch (err: any) {
    console.error('Signup API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
