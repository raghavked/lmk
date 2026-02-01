'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Heart, Users, User, Sparkles, MapPin, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type EventType = 'date' | 'hangout' | 'solo' | 'other' | null;
type Stage = 'event_select' | 'city_prompt' | 'intent_prompt' | 'chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  categories?: Category[];
}

interface Category {
  type: string;
  items: {
    title: string;
    description: string;
    event_relevance: string;
  }[];
}

const eventTypes = [
  { id: 'date' as const, label: 'Date', icon: Heart, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { id: 'hangout' as const, label: 'Hang Out', icon: Users, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'solo' as const, label: 'Solo', icon: User, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'other' as const, label: 'Other', icon: Sparkles, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
];

export default function PlanMyDayPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [stage, setStage] = useState<Stage>('event_select');
  const [eventType, setEventType] = useState<EventType>(null);
  const [city, setCity] = useState('');
  const [dayIntent, setDayIntent] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleEventSelect = async (type: EventType) => {
    setEventType(type);
    setStage('city_prompt');
    setMessages([{
      role: 'assistant',
      content: '📍 First things first — what city are you planning this day in?'
    }]);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || loading) return;
    
    const userMessage = inputValue.trim();
    setInputValue('');
    setLoading(true);

    if (stage === 'city_prompt') {
      setCity(userMessage);
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      
      const intentPrompt = getIntentPrompt(eventType!);
      setMessages(prev => [...prev, { role: 'assistant', content: intentPrompt }]);
      setStage('intent_prompt');
      setLoading(false);
      return;
    }

    if (stage === 'intent_prompt') {
      setDayIntent(userMessage);
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      setStage('chat');
      
      try {
        const response = await fetch('/api/plan-my-day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: eventType,
            city: city,
            day_intent: userMessage,
            chat_history: []
          })
        });

        const data = await response.json();
        
        if (data.error) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Sorry, I encountered an error: ${data.error}` 
          }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: data.message,
            categories: data.categories
          }]);
        }
      } catch (error) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, something went wrong. Please try again.' 
        }]);
      }
      
      setLoading(false);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const chatHistory = messages
        .filter(m => !m.categories)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/plan-my-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          city,
          day_intent: dayIntent,
          chat_history: chatHistory,
          user_message: userMessage
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Sorry, I encountered an error: ${data.error}` 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.message,
          categories: data.categories
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, something went wrong. Please try again.' 
      }]);
    }
    
    setLoading(false);
  };

  const getIntentPrompt = (type: EventType): string => {
    switch (type) {
      case 'date':
        return '💖 Tell me what kind of date you want — vibe, budget, time, anything.';
      case 'hangout':
        return '👥 What kind of hangout are you imagining? How many people and what energy?';
      case 'solo':
        return '🧘 What kind of day do you want for yourself?';
      default:
        return '✨ Describe the kind of day you\'re trying to plan.';
    }
  };

  const resetFlow = () => {
    setStage('event_select');
    setEventType(null);
    setCity('');
    setDayIntent('');
    setMessages([]);
    setInputValue('');
  };

  return (
    <div className="flex flex-col h-screen bg-[#0D1117]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#30363D]">
        <button onClick={() => router.back()} className="p-2 hover:bg-[#21262D] rounded-full">
          <ArrowLeft className="w-5 h-5 text-[#E6EDF3]" />
        </button>
        <h1 className="text-lg font-semibold text-[#E6EDF3]">Plan My Day</h1>
        <button onClick={resetFlow} className="p-2 hover:bg-[#21262D] rounded-full">
          <RefreshCw className="w-5 h-5 text-[#8B949E]" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {stage === 'event_select' ? (
          <div className="max-w-md mx-auto pt-8">
            <h2 className="text-2xl font-bold text-[#E6EDF3] text-center mb-2">What are you planning?</h2>
            <p className="text-[#8B949E] text-center mb-8">Choose the type of day you want to plan</p>
            
            <div className="grid grid-cols-2 gap-4">
              {eventTypes.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleEventSelect(event.id)}
                  className={`flex flex-col items-center justify-center p-6 rounded-2xl border ${event.color} hover:scale-105 transition-transform`}
                >
                  <event.icon className="w-8 h-8 mb-2" />
                  <span className="font-medium">{event.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {eventType && (
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-[#21262D] text-[#8B949E] text-sm flex items-center gap-1">
                  {eventTypes.find(e => e.id === eventType)?.icon && (
                    <span className="w-4 h-4">
                      {(() => {
                        const Icon = eventTypes.find(e => e.id === eventType)?.icon;
                        return Icon ? <Icon className="w-4 h-4" /> : null;
                      })()}
                    </span>
                  )}
                  {eventTypes.find(e => e.id === eventType)?.label}
                </span>
                {city && (
                  <span className="px-3 py-1 rounded-full bg-[#21262D] text-[#8B949E] text-sm flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {city}
                  </span>
                )}
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-[#feafb0] text-[#0D1117]' 
                      : 'bg-[#21262D] text-[#E6EDF3]'
                  }`}>
                    {msg.content}
                  </div>
                  
                  {msg.categories && msg.categories.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {msg.categories.map((cat, catIdx) => (
                        <div key={catIdx} className="bg-[#161B22] rounded-xl p-4 border border-[#30363D]">
                          <h3 className="text-[#feafb0] font-semibold mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#feafb0]"></span>
                            {cat.type}
                          </h3>
                          <div className="space-y-3">
                            {cat.items.map((item, itemIdx) => (
                              <div key={itemIdx} className="bg-[#21262D] rounded-lg p-3">
                                <h4 className="text-[#E6EDF3] font-medium">{item.title}</h4>
                                <p className="text-[#8B949E] text-sm mt-1">{item.description}</p>
                                <p className="text-[#feafb0] text-sm mt-2 italic">{item.event_relevance}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#21262D] rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 text-[#feafb0] animate-spin" />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        )}
      </main>

      {stage !== 'event_select' && (
        <footer className="p-4 border-t border-[#30363D]">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={
                stage === 'city_prompt' ? 'Enter a city...' :
                stage === 'intent_prompt' ? 'Describe your ideal day...' :
                'Refine your plan...'
              }
              className="flex-1 bg-[#21262D] border border-[#30363D] rounded-full px-4 py-3 text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:ring-2 focus:ring-[#feafb0]/50"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || loading}
              className="p-3 bg-[#feafb0] rounded-full hover:bg-[#feafb0]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5 text-[#0D1117]" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
