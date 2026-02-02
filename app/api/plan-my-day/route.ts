import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const openaiKey = process.env.OPENAI_API_KEY;

if (!openaiKey) {
  console.warn('Plan My Day: No OpenAI API key configured');
}

const openai = new OpenAI({
  apiKey: openaiKey,
});

interface PlanMyDayRequest {
  event_type: 'date' | 'hangout' | 'solo' | 'other';
  city: string;
  day_intent: string;
  chat_history?: { role: 'user' | 'assistant'; content: string }[];
  user_message?: string;
  session_id?: string;
}

function getSystemPrompt(eventType: string, city: string, dayIntent: string): string {
  return `You are a local expert planning a ${eventType} in ${city}. The user wants: ${dayIntent}

Respond with JSON only (no markdown). Include 2-3 categories relevant to their request. Each category should have 2-3 specific real venue/activity recommendations.

Format:
{"message":"Your friendly 1-2 sentence summary of the plan","categories":[{"type":"Dinner","items":[{"title":"Venue Name","description":"Brief description with cuisine/vibe"}]},{"type":"Activity","items":[{"title":"Activity Name","description":"What to do there"}]}]}

Categories to consider: Dinner, Lunch, Drinks, Coffee, Activity, Entertainment, Dessert, Walk/Park. Pick what fits best.`;
}

function getInitialPrompt(eventType: string): string {
  switch (eventType) {
    case 'date':
      return '💖 Tell me what kind of date you want — vibe, budget, time, anything.';
    case 'hangout':
      return '👥 What kind of hangout are you imagining? How many people and what energy?';
    case 'solo':
      return '🧘 What kind of day do you want for yourself?';
    default:
      return '✨ Describe the kind of day you\'re trying to plan.';
  }
}

export async function POST(request: NextRequest) {
  console.log('[Plan My Day] POST request received');
  const startTime = Date.now();
  
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    const authHeader = request.headers.get('authorization');
    let userId = session?.user?.id;
    
    if (!userId && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body: PlanMyDayRequest = await request.json();
    const { event_type, city, day_intent, chat_history = [], user_message, session_id } = body;

    if (!event_type) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
    }

    if (!city) {
      return NextResponse.json({
        message: '📍 First things first — what city are you planning this day in?',
        stage: 'city_prompt',
        categories: []
      });
    }

    if (!day_intent) {
      return NextResponse.json({
        message: getInitialPrompt(event_type),
        stage: 'intent_prompt',
        categories: []
      });
    }

    if (!openaiKey) {
      return NextResponse.json({ 
        error: 'AI service is not configured. Please contact support.',
        message: 'Sorry, the AI service is temporarily unavailable.',
        categories: []
      }, { status: 503 });
    }

    const systemPrompt = getSystemPrompt(event_type, city, day_intent);
    
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    
    if (chat_history.length === 0) {
      messages.push({
        role: 'user',
        content: `I want to plan a ${event_type} in ${city}. ${day_intent}`
      });
    } else {
      messages.push(...chat_history);
      if (user_message) {
        messages.push({ role: 'user', content: user_message });
      }
    }

    console.log('[Plan My Day] Calling OpenAI, elapsed:', Date.now() - startTime, 'ms');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 800,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
    });
    console.log('[Plan My Day] OpenAI responded, elapsed:', Date.now() - startTime, 'ms');

    const assistantContent = response.choices[0]?.message?.content || '';

    let parsedResponse;
    try {
      const jsonMatch = assistantContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = {
          message: assistantContent,
          categories: []
        };
      }
    } catch (parseError) {
      parsedResponse = {
        message: assistantContent,
        categories: []
      };
    }

    const updatedHistory = [
      ...messages,
      { role: 'assistant' as const, content: assistantContent }
    ];

    let planSessionId = session_id;
    
    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      
      const title = `${event_type.charAt(0).toUpperCase() + event_type.slice(1)} in ${city}`;
      
      if (session_id) {
        await adminClient
          .from('plan_sessions')
          .update({
            chat_history: updatedHistory,
            categories: parsedResponse.categories || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id)
          .eq('user_id', userId);
      } else {
        const { data: newSession } = await adminClient
          .from('plan_sessions')
          .insert({
            user_id: userId,
            event_type,
            city,
            day_intent,
            chat_history: updatedHistory,
            categories: parsedResponse.categories || [],
            title
          })
          .select('id')
          .single();
        
        if (newSession) {
          planSessionId = newSession.id;
        }
      }
    } catch (dbError) {
      console.log('Could not save plan session:', dbError);
    }

    return NextResponse.json({
      ...parsedResponse,
      stage: 'recommendations',
      chat_history: updatedHistory,
      session_id: planSessionId
    });

  } catch (error: any) {
    console.error('Plan My Day API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    
    // Get token from Authorization header or X-Auth-Token
    let token: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token) {
      token = request.headers.get('x-auth-token');
    }
    
    let userId: string | undefined;
    if (token) {
      const { data: { user } } = await adminClient.auth.getUser(token);
      userId = user?.id;
    }

    if (!userId) {
      return NextResponse.json({ plans: [] });
    }

    const requestUrl = new URL(request.url);
    const planId = requestUrl.searchParams.get('id');

    if (planId) {
      const { data: plan, error } = await adminClient
        .from('plan_sessions')
        .select('*')
        .eq('id', planId)
        .eq('user_id', userId)
        .single();

      if (error || !plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      return NextResponse.json(plan);
    }

    const { data: plans, error } = await adminClient
      .from('plan_sessions')
      .select('id, title, event_type, city, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 });
    }

    return NextResponse.json({ plans: plans || [] });

  } catch (error: any) {
    console.error('Plan My Day GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load plans' },
      { status: 500 }
    );
  }
}
