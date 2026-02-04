'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ArrowLeft, Send, Loader2, Heart, Users, User, Sparkles, MapPin, RefreshCw, Clock, ChevronRight, Star, ExternalLink, X, Utensils, Wine, Coffee, IceCream, Ticket, Film, Footprints, Tv, BookOpen, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const getCategoryIcon = (type: string) => {
  const lower = type.toLowerCase();
  if (lower.includes('dinner') || lower.includes('restaurant') || lower.includes('food') || lower.includes('dining') || lower.includes('lunch')) return Utensils;
  if (lower.includes('drink') || lower.includes('bar') || lower.includes('cocktail')) return Wine;
  if (lower.includes('coffee') || lower.includes('cafe')) return Coffee;
  if (lower.includes('dessert') || lower.includes('sweet')) return IceCream;
  if (lower.includes('entertainment') || lower.includes('show') || lower.includes('concert')) return Ticket;
  if (lower.includes('movie') || lower.includes('film') || lower.includes('cinema')) return Film;
  if (lower.includes('activity') || lower.includes('activities') || lower.includes('park') || lower.includes('walk')) return Footprints;
  if (lower.includes('tv')) return Tv;
  if (lower.includes('read') || lower.includes('book')) return BookOpen;
  return Sparkles;
};

type EventType = 'date' | 'hangout' | 'solo' | 'other' | null;
type Stage = 'event_select' | 'city_prompt' | 'intent_prompt' | 'chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  categories?: Category[];
}

interface PlanItem {
  title: string;
  description: string;
  event_relevance?: string;
  neighborhood?: string;
  rating?: number;
  price?: string;
  why_perfect?: string;
  address?: string;
  cuisine?: string;
  vibe?: string;
  image_url?: string;
  review_count?: number;
  yelp_url?: string;
  yelp_id?: string;
}

interface Category {
  type: string;
  items: PlanItem[];
}

interface SavedPlan {
  id: string;
  title: string;
  event_type: string;
  city: string;
  created_at: string;
  updated_at: string;
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{ item: PlanItem; category: string } | null>(null);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<SavedPlan | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');

  useEffect(() => {
    loadSavedPlans();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSavedPlans = async () => {
    try {
      const response = await fetch('/api/plan-my-day');
      const data = await response.json();
      if (data.plans) {
        setSavedPlans(data.plans);
      }
    } catch (error) {
      console.log('Could not load saved plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadPlan = async (planId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/plan-my-day?id=${planId}`);
      const plan = await response.json();
      
      if (plan.id) {
        setSessionId(plan.id);
        setEventType(plan.event_type as EventType);
        setCity(plan.city);
        setDayIntent(plan.day_intent || '');
        
        const chatMessages: ChatMessage[] = (plan.chat_history || []).map((msg: any) => {
          const parsed: ChatMessage = { role: msg.role, content: msg.content };
          return parsed;
        });
        
        if (plan.categories && plan.categories.length > 0 && chatMessages.length > 0) {
          chatMessages[chatMessages.length - 1].categories = plan.categories;
        }
        
        setMessages(chatMessages);
        setStage('chat');
      }
    } catch (error) {
      console.log('Could not load plan');
    } finally {
      setLoading(false);
    }
  };

  const renamePlan = async (planId: string, newTitle: string) => {
    try {
      const response = await fetch('/api/plan-my-day', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId, title: newTitle })
      });
      
      if (response.ok) {
        setSavedPlans(prev => prev.map(p => 
          p.id === planId ? { ...p, title: newTitle } : p
        ));
      }
    } catch (error) {
      console.log('Could not rename plan');
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const response = await fetch(`/api/plan-my-day?id=${planId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSavedPlans(prev => prev.filter(p => p.id !== planId));
        if (sessionId === planId) {
          resetFlow();
        }
      }
    } catch (error) {
      console.log('Could not delete plan');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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
            chat_history: [],
            session_id: sessionId
          })
        });

        const data = await response.json();
        
        if (data.session_id && !sessionId) {
          setSessionId(data.session_id);
        }
        
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
          user_message: userMessage,
          session_id: sessionId
        })
      });

      const data = await response.json();
      
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }
      
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
    setSessionId(null);
    loadSavedPlans();
  };

  return (
    <div className="flex flex-col h-screen bg-[#0D1117]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#30363D]">
        <button onClick={() => router.back()} className="flex items-center gap-1 p-2 hover:bg-[#21262D] rounded-full">
          <ArrowLeft className="w-5 h-5 text-[#E6EDF3]" />
          <span className="text-sm text-[#E6EDF3]">Discover</span>
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

            {!loadingPlans && savedPlans.length > 0 && (
              <div className="mt-10">
                <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#8B949E]" />
                  Recent Plans
                </h3>
                <div className="space-y-2">
                  {savedPlans.slice(0, 5).map((plan) => (
                    <div
                      key={plan.id}
                      className="w-full flex items-center justify-between p-4 bg-[#21262D] rounded-xl border border-[#30363D] hover:border-[#feafb0]/50 transition-colors group"
                    >
                      <button
                        onClick={() => loadPlan(plan.id)}
                        className="flex-1 text-left"
                      >
                        <p className="text-[#E6EDF3] font-medium">{plan.title}</p>
                        <p className="text-[#8B949E] text-sm">{formatDate(plan.updated_at)}</p>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanForEdit(plan);
                            setNewPlanName(plan.title);
                            setShowRenameModal(true);
                          }}
                          className="p-2 text-[#8B949E] hover:text-[#feafb0] hover:bg-[#30363D] rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Rename plan"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanForEdit(plan);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 text-[#8B949E] hover:text-red-400 hover:bg-[#30363D] rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-5 h-5 text-[#8B949E]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                    <div className="mt-4 space-y-4">
                      {msg.categories.map((cat, catIdx) => {
                        const CategoryIcon = getCategoryIcon(cat.type);
                        return (
                          <div key={catIdx} className="bg-[#161B22] rounded-xl p-4 border border-[#30363D]">
                            <h3 className="text-[#feafb0] font-semibold mb-3 flex items-center gap-2">
                              <CategoryIcon className="w-5 h-5" />
                              {cat.type}
                              <span className="text-[#8B949E] text-xs font-normal ml-auto">{cat.items.length} picks</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {cat.items.map((item, itemIdx) => (
                                <button
                                  key={itemIdx}
                                  onClick={() => setSelectedItem({ item, category: cat.type })}
                                  className="bg-[#21262D] rounded-xl overflow-hidden border border-[#30363D] hover:border-[#feafb0]/50 transition-all hover:scale-[1.02] text-left"
                                >
                                  {item.image_url && (
                                    <div className="relative h-32 w-full">
                                      <Image
                                        src={item.image_url}
                                        alt={item.title}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-[#21262D] to-transparent" />
                                    </div>
                                  )}
                                  <div className="p-3">
                                    <h4 className="text-[#E6EDF3] font-medium text-sm line-clamp-1">{item.title}</h4>
                                    {(item.cuisine || item.vibe) && (
                                      <p className="text-[#8B949E] text-xs mt-1 line-clamp-1">
                                        {[item.cuisine, item.vibe].filter(Boolean).join(' · ')}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      {item.rating && (
                                        <div className="flex items-center gap-1 text-[#feafb0]">
                                          <Star className="w-3 h-3 fill-current" />
                                          <span className="text-xs font-medium">{item.rating}</span>
                                        </div>
                                      )}
                                      {item.price && (
                                        <span className="text-[#8B949E] text-xs">{item.price}</span>
                                      )}
                                      {item.neighborhood && (
                                        <span className="text-[#8B949E] text-xs flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {item.neighborhood}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
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

      {/* Item Detail Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-[#161B22] rounded-2xl border border-[#30363D] max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Swipe handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-[#30363D] rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-3 border-b border-[#30363D]">
              <div className="flex items-center gap-2 text-[#feafb0]">
                {(() => {
                  const CategoryIcon = getCategoryIcon(selectedItem.category);
                  return <CategoryIcon className="w-5 h-5" />;
                })()}
                <span className="text-sm font-medium">{selectedItem.category}</span>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-1.5 hover:bg-[#21262D] rounded-full"
              >
                <X className="w-5 h-5 text-[#8B949E]" />
              </button>
            </div>

            {/* Image */}
            {selectedItem.item.image_url && (
              <div className="relative h-48 w-full">
                <Image
                  src={selectedItem.item.image_url}
                  alt={selectedItem.item.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#161B22] via-transparent to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[#E6EDF3]">{selectedItem.item.title}</h2>
                {(selectedItem.item.cuisine || selectedItem.item.vibe) && (
                  <p className="text-[#8B949E] text-sm mt-1">
                    {[selectedItem.item.cuisine, selectedItem.item.vibe].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              {/* Rating & Price Row */}
              <div className="flex items-center gap-4">
                {selectedItem.item.rating && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          className={`w-4 h-4 ${star <= Math.round(selectedItem.item.rating!) ? 'fill-[#feafb0] text-[#feafb0]' : 'text-[#30363D]'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[#E6EDF3] text-sm font-medium">{selectedItem.item.rating}</span>
                    {selectedItem.item.review_count && (
                      <span className="text-[#8B949E] text-sm">({selectedItem.item.review_count} reviews)</span>
                    )}
                  </div>
                )}
                {selectedItem.item.price && (
                  <span className="text-[#8B949E] font-medium">{selectedItem.item.price}</span>
                )}
              </div>

              {/* Address */}
              {selectedItem.item.address && (
                <div className="flex items-start gap-2 text-[#8B949E]">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{selectedItem.item.address}</span>
                </div>
              )}

              {/* Why Perfect */}
              {selectedItem.item.why_perfect && (
                <div className="bg-[#21262D] rounded-xl p-4 border border-[#30363D]">
                  <p className="text-[#feafb0] text-sm font-medium mb-1">Why it&apos;s perfect</p>
                  <p className="text-[#E6EDF3] text-sm">{selectedItem.item.why_perfect}</p>
                </div>
              )}

              {/* Description */}
              {selectedItem.item.description && (
                <p className="text-[#8B949E] text-sm">{selectedItem.item.description}</p>
              )}

              {/* Yelp Link */}
              {selectedItem.item.yelp_url && (
                <a
                  href={selectedItem.item.yelp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-[#feafb0] text-[#0D1117] rounded-xl font-semibold hover:bg-[#feafb0]/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Yelp
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && selectedPlanForEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161B22] rounded-2xl border border-[#30363D] w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-[#E6EDF3] mb-4 text-center">Rename Plan</h3>
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="Enter plan name"
              className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-4 py-3 text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#feafb0] mb-5"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setSelectedPlanForEdit(null);
                }}
                className="flex-1 py-3 rounded-xl bg-[#21262D] text-[#8B949E] font-semibold hover:bg-[#30363D] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (selectedPlanForEdit && newPlanName.trim()) {
                    await renamePlan(selectedPlanForEdit.id, newPlanName.trim());
                  }
                  setShowRenameModal(false);
                  setSelectedPlanForEdit(null);
                }}
                className="flex-1 py-3 rounded-xl bg-[#feafb0] text-[#0D1117] font-semibold hover:bg-[#feafb0]/90 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedPlanForEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161B22] rounded-2xl border border-[#30363D] w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-[#E6EDF3] mb-2">Delete Plan?</h3>
            <p className="text-[#8B949E] mb-6">
              This will permanently delete "{selectedPlanForEdit.title}". This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedPlanForEdit(null);
                }}
                className="flex-1 py-3 rounded-xl bg-[#21262D] text-[#8B949E] font-semibold hover:bg-[#30363D] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (selectedPlanForEdit) {
                    await deletePlan(selectedPlanForEdit.id);
                  }
                  setShowDeleteConfirm(false);
                  setSelectedPlanForEdit(null);
                }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
