import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function sendVerificationEmail(email: string, confirmationUrl: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { success: false, error: 'Email service not configured' };
  }

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0D1117; color: #fea3a6;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #fea3a6; font-size: 32px; margin: 0;">LMK</h1>
        <p style="color: #fea3a6; opacity: 0.6; font-size: 14px; margin-top: 4px;">Personalized Recommendations</p>
      </div>
      <div style="background-color: #161B22; border-radius: 12px; padding: 32px; border: 1px solid rgba(254,163,166,0.2);">
        <h2 style="color: #fea3a6; font-size: 20px; margin-top: 0;">Verify your email address</h2>
        <p style="color: #fea3a6; opacity: 0.7; font-size: 15px; line-height: 1.6;">
          Please click the button below to verify your email address and activate your LMK account.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${confirmationUrl}" style="display: inline-block; background-color: #fea3a6; color: #0D1117; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #fea3a6; opacity: 0.5; font-size: 13px; line-height: 1.5;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${confirmationUrl}" style="color: #fea3a6; word-break: break-all;">${confirmationUrl}</a>
        </p>
      </div>
      <p style="color: #fea3a6; opacity: 0.35; font-size: 12px; text-align: center; margin-top: 24px;">
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
      console.log('Verification email resent via Resend:', data.id);
      return { success: true };
    } else {
      const errorText = await res.text();
      console.error('Resend API error:', errorText);

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
          return { success: true };
        }
        const fallbackError = await fallbackRes.text();
        console.error('Resend fallback error:', fallbackError);
        return { success: false, error: fallbackError };
      }

      return { success: false, error: errorText };
    }
  } catch (err: any) {
    console.error('Error sending email via Resend:', err);
    return { success: false, error: err.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
    const user = users?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
    }

    if (user.email_confirmed_at) {
      return NextResponse.json({ message: 'Email already verified. You can sign in.' });
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: normalizedEmail,
      password: 'placeholder',
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Error generating confirmation link:', linkError);
      return NextResponse.json({ error: 'Could not generate verification link.' }, { status: 500 });
    }

    const emailResult = await sendVerificationEmail(normalizedEmail, linkData.properties.action_link);

    if (emailResult.success) {
      return NextResponse.json({ message: 'Verification email sent' });
    } else {
      return NextResponse.json({ error: 'Could not send verification email. Please try again later.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Resend verification endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
