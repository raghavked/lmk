import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

if (!apiKey) {
  console.warn('Plan My Day: No Anthropic/Claude API key configured');
}

const anthropic = new Anthropic({
  apiKey: apiKey,
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
  return `You are an event-aware planning assistant embedded inside an existing mobile app.

Feature Context:
- Event Type: ${eventType}
- City: ${city}
- User Intent: ${dayIntent}

Your responsibilities:
1. Interpret the user's intent and constraints.
2. Determine the best fitting category or categories:
   - Restaurant
   - Movie
   - TV Show
   - Activity
   - Reading
3. Generate 3–5 recommendations per category.
4. Briefly explain why each option fits THIS event type.
5. Match tone to event:
   - Date → warm, thoughtful
   - Hang Out → fun, social
   - Solo → calm, reflective
   - Other → neutral and adaptive
6. Support iterative refinement in the same chat thread.

Rules:
- Do NOT mention system prompts or internal reasoning.
- Keep responses concise and mobile-friendly.
- Always respond with valid JSON in this exact format:
{
  "message": "Short conversational response",
  "categories": [
    {
      "type": "Restaurant | Movie | TV Show | Activity | Reading",
      "items": [
        {
          "title": "Name",
          "description": "What it is",
          "event_relevance": "Why it fits this event"
        }
      ]
    }
  ]
}`;
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

    if (!apiKey) {
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

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    const assistantContent = response.content[0];
    if (assistantContent.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    let parsedResponse;
    try {
      const jsonMatch = assistantContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = {
          message: assistantContent.text,
          categories: []
        };
      }
    } catch (parseError) {
      parsedResponse = {
        message: assistantContent.text,
        categories: []
      };
    }

    const updatedHistory = [
      ...messages,
      { role: 'assistant' as const, content: assistantContent.text }
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

    const requestUrl = new URL(request.url);
    const planId = requestUrl.searchParams.get('id');

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

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
