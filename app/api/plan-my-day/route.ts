import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import axios from 'axios';

const openaiKey = process.env.OPENAI_API_KEY;
const yelpApiKey = process.env.YELP_API_KEY;

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

interface YelpBusiness {
  id: string;
  name: string;
  image_url: string;
  url: string;
  review_count: number;
  rating: number;
  price?: string;
  location: {
    address1: string;
    city: string;
    state: string;
    display_address: string[];
  };
  categories: { alias: string; title: string }[];
  distance?: number;
}

async function searchYelp(query: string, city: string, category?: string): Promise<YelpBusiness | null> {
  if (!yelpApiKey) return null;
  
  try {
    const params: any = {
      term: query,
      location: city,
      limit: 1,
    };
    
    if (category) {
      const categoryMap: Record<string, string> = {
        'Dinner': 'restaurants',
        'Lunch': 'restaurants',
        'Drinks': 'bars',
        'Coffee': 'coffee',
        'Dessert': 'desserts,bakeries',
        'Activity': 'active,arts',
        'Entertainment': 'nightlife,arts',
      };
      if (categoryMap[category]) {
        params.categories = categoryMap[category];
      }
    }
    
    const response = await axios.get('https://api.yelp.com/v3/businesses/search', {
      headers: { 'Authorization': `Bearer ${yelpApiKey}` },
      params,
    });
    
    return response.data.businesses?.[0] || null;
  } catch (error) {
    console.log('[Plan My Day] Yelp search failed for:', query);
    return null;
  }
}

async function enrichWithYelpData(categories: any[], city: string, eventType: string): Promise<any[]> {
  const enrichedCategories = await Promise.all(
    categories.map(async (cat) => {
      const enrichedItems = await Promise.all(
        cat.items.map(async (item: any) => {
          const yelpData = await searchYelp(item.title, city, cat.type);
          
          if (yelpData) {
            return {
              title: yelpData.name,
              description: item.description || `${yelpData.categories.map(c => c.title).join(', ')}. ${yelpData.review_count} reviews on Yelp.`,
              image_url: yelpData.image_url,
              rating: yelpData.rating,
              price: yelpData.price || item.price,
              address: yelpData.location.address1,
              neighborhood: yelpData.location.city,
              cuisine: yelpData.categories.map(c => c.title).join(', '),
              vibe: item.vibe,
              why_perfect: item.why_perfect || `Great for your ${eventType}!`,
              review_count: yelpData.review_count,
              yelp_url: yelpData.url,
              yelp_id: yelpData.id,
            };
          }
          
          return item;
        })
      );
      
      return { ...cat, items: enrichedItems };
    })
  );
  
  return enrichedCategories;
}

function getSystemPrompt(eventType: string, city: string, dayIntent: string): string {
  return `You are a local expert planning a ${eventType} in ${city}. User wants: ${dayIntent}

Reply JSON only. Give 2-3 categories with exactly 3 REAL venue/business names that exist in ${city}.

Format:
{"message":"1 sentence friendly summary","categories":[{"type":"Dinner","items":[{"title":"Exact Real Business Name","vibe":"Romantic and cozy","why_perfect":"Why this fits the ${eventType}"}]}]}

IMPORTANT: Use REAL business names that actually exist in ${city}. The names will be looked up in Yelp to get photos and details.
Categories: Dinner, Lunch, Drinks, Coffee, Activity, Entertainment, Dessert.`;
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

    // Enrich venue data with Yelp API (real images, ratings, addresses)
    if (parsedResponse.categories && parsedResponse.categories.length > 0) {
      console.log('[Plan My Day] Enriching with Yelp data, elapsed:', Date.now() - startTime, 'ms');
      parsedResponse.categories = await enrichWithYelpData(parsedResponse.categories, city, event_type);
      console.log('[Plan My Day] Yelp enrichment complete, elapsed:', Date.now() - startTime, 'ms');
    }

    const updatedHistory = [
      ...messages,
      { role: 'assistant' as const, content: parsedResponse.message || assistantContent }
    ];

    let planSessionId = session_id;
    
    console.log('[Plan My Day] Saving plan, userId:', userId, 'session_id:', session_id);
    
    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      
      const title = `${event_type.charAt(0).toUpperCase() + event_type.slice(1)} in ${city}`;
      
      if (session_id) {
        console.log('[Plan My Day] Updating existing session:', session_id);
        const { error: updateError } = await adminClient
          .from('plan_sessions')
          .update({
            chat_history: updatedHistory,
            categories: parsedResponse.categories || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id)
          .eq('user_id', userId);
        
        if (updateError) {
          console.log('[Plan My Day] Update error:', updateError.message);
        } else {
          console.log('[Plan My Day] Updated session successfully');
        }
      } else {
        console.log('[Plan My Day] Creating new session');
        const { data: newSession, error: insertError } = await adminClient
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
        
        if (insertError) {
          console.log('[Plan My Day] Insert error:', insertError.message);
        } else if (newSession) {
          planSessionId = newSession.id;
          console.log('[Plan My Day] Created session:', planSessionId);
        }
      }
    } catch (dbError: any) {
      console.log('[Plan My Day] Database error:', dbError.message);
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
  console.log('[Plan My Day GET] Request received');
  try {
    console.log('[Plan My Day GET] Creating admin client');
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
    
    console.log('[Plan My Day GET] Token present:', !!token);
    
    let userId: string | undefined;
    if (token) {
      const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
      if (userError) {
        console.log('[Plan My Day GET] User auth error:', userError.message);
      }
      userId = user?.id;
    }

    console.log('[Plan My Day GET] User ID:', userId ? 'found' : 'not found');

    if (!userId) {
      return NextResponse.json({ plans: [] });
    }

    const requestUrl = new URL(request.url);
    const planId = requestUrl.searchParams.get('id');

    if (planId) {
      console.log('[Plan My Day GET] Fetching single plan:', planId);
      const { data: plan, error } = await adminClient
        .from('plan_sessions')
        .select('*')
        .eq('id', planId)
        .eq('user_id', userId)
        .single();

      if (error || !plan) {
        console.log('[Plan My Day GET] Plan not found error:', error?.message);
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      return NextResponse.json(plan);
    }

    console.log('[Plan My Day GET] Fetching all plans for user');
    const { data: plans, error } = await adminClient
      .from('plan_sessions')
      .select('id, title, event_type, city, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log('[Plan My Day GET] Query error:', error.message);
      return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 });
    }

    console.log('[Plan My Day GET] Found plans:', plans?.length || 0);
    return NextResponse.json({ plans: plans || [] });

  } catch (error: any) {
    console.error('[Plan My Day GET] Exception:', error.message, error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to load plans' },
      { status: 500 }
    );
  }
}
