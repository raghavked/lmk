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

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const xAuthToken = request.headers.get('X-Auth-Token');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : xAuthToken;

  if (token) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user) {
      return user;
    }
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    return session.user;
  }
  
  return null;
}

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
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });
    
    const { data: { session } } = await supabase.auth.getSession();
    let userId = session?.user?.id;
    
    if (!userId) {
      const authHeader = request.headers.get('authorization');
      const xAuthToken = request.headers.get('x-auth-token');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : xAuthToken;
      
      if (token) {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      }
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 800,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
    });

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

    if (parsedResponse.categories && parsedResponse.categories.length > 0) {
      parsedResponse.categories = await enrichWithYelpData(parsedResponse.categories, city, event_type);
    }

    const updatedHistory = [
      ...messages,
      { role: 'assistant' as const, content: parsedResponse.message || assistantContent }
    ];

    let planSessionId = session_id;
    
    try {
      const title = `${event_type.charAt(0).toUpperCase() + event_type.slice(1)} in ${city}`;
      
      if (session_id) {
        await supabaseAdmin
          .from('plan_sessions')
          .update({
            chat_history: updatedHistory,
            categories: parsedResponse.categories || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id)
          .eq('user_id', userId);
      } else {
        const { data: newSession } = await supabaseAdmin
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
    } catch (dbError: any) {
      console.error('[Plan My Day] Database error:', dbError.message);
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
    let userId = session?.user?.id;
    
    if (!userId) {
      const authHeader = request.headers.get('authorization');
      const xAuthToken = request.headers.get('x-auth-token');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : xAuthToken;
      
      if (token) {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ plans: [] });
    }

    const requestUrl = new URL(request.url);
    const planId = requestUrl.searchParams.get('id');

    if (planId) {
      const { data: plan, error } = await supabaseAdmin
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

    const { data: plans, error } = await supabaseAdmin
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
    console.error('[Plan My Day GET] Exception:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to load plans' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, title } = body;
    
    if (!id || !title) {
      return NextResponse.json({ error: 'Plan ID and title are required' }, { status: 400 });
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('plan_sessions')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('[Plan My Day PATCH] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to rename plan' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('[Plan My Day PATCH] Exception:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to rename plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');
    
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }
    
    const { error: deleteError } = await supabaseAdmin
      .from('plan_sessions')
      .delete()
      .eq('id', planId)
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.error('[Plan My Day DELETE] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('[Plan My Day DELETE] Exception:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to delete plan' },
      { status: 500 }
    );
  }
}
