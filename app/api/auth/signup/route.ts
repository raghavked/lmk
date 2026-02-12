import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function sendVerificationEmail(email: string, confirmationUrl: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0D1117; color: #f0f0f0;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #feafb0; font-size: 32px; margin: 0;">LMK</h1>
        <p style="color: #8b949e; font-size: 14px; margin-top: 4px;">Personalized Recommendations</p>
      </div>
      <div style="background-color: #161B22; border-radius: 12px; padding: 32px; border: 1px solid #30363D;">
        <h2 style="color: #f0f0f0; font-size: 20px; margin-top: 0;">Verify your email address</h2>
        <p style="color: #8b949e; font-size: 15px; line-height: 1.6;">
          Thanks for signing up for LMK! Please click the button below to verify your email address and activate your account.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${confirmationUrl}" style="display: inline-block; background-color: #feafb0; color: #0D1117; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #8b949e; font-size: 13px; line-height: 1.5;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${confirmationUrl}" style="color: #feafb0; word-break: break-all;">${confirmationUrl}</a>
        </p>
      </div>
      <p style="color: #484f58; font-size: 12px; text-align: center; margin-top: 24px;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'LMK <noreply@lmkrecs.com>',
        to: email,
        subject: 'Verify your LMK account',
        html: htmlContent,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log('Verification email sent via Resend:', data.id);
      return { success: true };
    } else {
      const errorText = await res.text();
      console.error('Resend API error:', res.status, errorText);

      if (errorText.includes('not a verified') || errorText.includes('not verified')) {
        const fallbackRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'LMK <onboarding@resend.dev>',
            to: email,
            subject: 'Verify your LMK account',
            html: htmlContent,
          }),
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          console.log('Verification email sent via Resend (fallback from):', fallbackData.id);
          return { success: true };
        } else {
          const fallbackError = await fallbackRes.text();
          console.error('Resend fallback error:', fallbackError);
          return { success: false, error: fallbackError };
        }
      }

      return { success: false, error: errorText };
    }
  } catch (err: any) {
    console.error('Error sending email via Resend:', err);
    return { success: false, error: err.message };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, action } = body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (action === 'cleanup-unconfirmed') {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
      const existingUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail);

      if (!existingUser) {
        return NextResponse.json({ success: true, cleaned: false });
      }

      if (existingUser.email_confirmed_at) {
        return NextResponse.json({ error: 'Account already verified. Please sign in.' }, { status: 409 });
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        console.error('Error deleting unconfirmed user:', deleteError);
        return NextResponse.json({ success: true, cleaned: false });
      }
      await supabaseAdmin.from('profiles').delete().eq('id', existingUser.id);
      console.log('Cleaned up unconfirmed user:', normalizedEmail);
      return NextResponse.json({ success: true, cleaned: true });
    }

    if (!password || !fullName) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const trimmedName = fullName.trim();
    const { data: existingName } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('full_name', trimmedName)
      .limit(1);

    if (existingName && existingName.length > 0) {
      return NextResponse.json({ error: 'This display name is already taken. Please choose a different name.' }, { status: 409 });
    }

    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
    const existingUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      if (existingUser.email_confirmed_at) {
        return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 });
      }

      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      await supabaseAdmin.from('profiles').delete().eq('id', existingUser.id);
      console.log('Removed old unconfirmed user for re-signup:', normalizedEmail);
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName.trim() },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: newUser.user.id,
      full_name: fullName.trim(),
    });
    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: normalizedEmail,
      password,
    });

    if (linkError || !linkData) {
      console.error('Error generating confirmation link:', linkError);
      return NextResponse.json({
        success: true,
        message: 'Account created but verification email could not be sent. Please contact support.',
        emailSent: false,
      });
    }

    const confirmationUrl = linkData.properties?.action_link;
    if (!confirmationUrl) {
      console.error('No action_link in generateLink response');
      return NextResponse.json({
        success: true,
        message: 'Account created but verification email could not be sent.',
        emailSent: false,
      });
    }

    console.log('Generated confirmation link for:', normalizedEmail);

    const emailResult = await sendVerificationEmail(normalizedEmail, confirmationUrl);

    return NextResponse.json({
      success: true,
      message: emailResult.success
        ? 'Account created! Check your email for a verification link.'
        : 'Account created but there was an issue sending the verification email. Please try the resend option.',
      emailSent: emailResult.success,
      requiresVerification: true,
    });
  } catch (err: any) {
    console.error('Signup API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
