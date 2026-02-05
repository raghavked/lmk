import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  let isNewUser = false;

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);
    
    // Ensure profile exists after email verification
    if (sessionData?.user) {
      try {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, taste_profile')
          .eq('id', sessionData.user.id)
          .single();
        
        if (!existingProfile) {
          // Create profile via API - this is a new user
          await fetch(`${requestUrl.origin}/api/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: sessionData.user.id,
              full_name: sessionData.user.user_metadata?.full_name || '',
            }),
          });
          isNewUser = true;
        } else if (!existingProfile.taste_profile) {
          // User exists but hasn't completed quiz
          isNewUser = true;
        }
      } catch (error) {
        console.error('Profile check/create error in callback:', error);
      }
    }
  }

  // Redirect new users to onboarding, existing users to discover
  const redirectPath = isNewUser ? '/onboarding' : '/discover';
  return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`);
}
