import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);
    
    // Ensure profile exists after email verification
    if (sessionData?.user) {
      try {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', sessionData.user.id)
          .single();
        
        if (!existingProfile) {
          // Create profile via API
          await fetch(`${requestUrl.origin}/api/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: sessionData.user.id,
              full_name: sessionData.user.user_metadata?.full_name || '',
            }),
          });
        }
      } catch (error) {
        console.error('Profile check/create error in callback:', error);
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${requestUrl.origin}/discover`);
}
