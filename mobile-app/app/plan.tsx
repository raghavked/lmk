import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Linking
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { supabase } from '../lib/supabase';
import * as Haptics from 'expo-haptics';

const getPlaceholderImage = (category: string, title: string): string => {
  const searchTerm = encodeURIComponent(title.split(' ').slice(0, 2).join(' '));
  const categoryTerm = category.toLowerCase();
  
  if (categoryTerm.includes('dinner') || categoryTerm.includes('restaurant') || categoryTerm.includes('lunch')) {
    return `https://source.unsplash.com/400x300/?restaurant,food,${searchTerm}`;
  }
  if (categoryTerm.includes('drink') || categoryTerm.includes('bar') || categoryTerm.includes('cocktail')) {
    return `https://source.unsplash.com/400x300/?bar,cocktail,drinks`;
  }
  if (categoryTerm.includes('coffee') || categoryTerm.includes('cafe')) {
    return `https://source.unsplash.com/400x300/?coffee,cafe`;
  }
  if (categoryTerm.includes('dessert')) {
    return `https://source.unsplash.com/400x300/?dessert,bakery,sweet`;
  }
  if (categoryTerm.includes('entertainment') || categoryTerm.includes('show')) {
    return `https://source.unsplash.com/400x300/?entertainment,theater,show`;
  }
  if (categoryTerm.includes('activity') || categoryTerm.includes('park')) {
    return `https://source.unsplash.com/400x300/?outdoor,activity,park`;
  }
  return `https://source.unsplash.com/400x300/?${searchTerm}`;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.75;
const CARD_MARGIN = 8;

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
  { id: 'date' as const, label: 'Date', icon: 'heart', color: Colors.accent.coral },
  { id: 'hangout' as const, label: 'Hang Out', icon: 'people', color: Colors.accent.coral },
  { id: 'solo' as const, label: 'Solo', icon: 'person', color: Colors.accent.coral },
  { id: 'other' as const, label: 'Other', icon: 'sparkles', color: Colors.accent.coral },
];

const getCategoryIcon = (type: string): any => {
  const lower = type.toLowerCase();
  if (lower.includes('dinner') || lower.includes('restaurant') || lower.includes('food') || lower.includes('dining') || lower.includes('lunch')) return 'restaurant';
  if (lower.includes('drink') || lower.includes('bar') || lower.includes('cocktail')) return 'wine';
  if (lower.includes('coffee') || lower.includes('cafe')) return 'cafe';
  if (lower.includes('dessert') || lower.includes('sweet')) return 'ice-cream';
  if (lower.includes('entertainment') || lower.includes('show') || lower.includes('concert')) return 'ticket';
  if (lower.includes('movie') || lower.includes('film') || lower.includes('cinema')) return 'film';
  if (lower.includes('activity') || lower.includes('activities') || lower.includes('park') || lower.includes('walk')) return 'walk';
  if (lower.includes('tv')) return 'tv';
  if (lower.includes('read') || lower.includes('book')) return 'book';
  return 'sparkles';
};

export default function PlanMyDayScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  
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
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    loadSavedPlans();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const loadSavedPlans = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      
      console.log('[Plan] Loading saved plans...');
      const response = await fetch(`${apiUrl}/api/plan-my-day/`, {
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Auth-Token': session?.access_token || ''
        }
      });
      const data = await response.json();
      console.log('[Plan] Loaded plans:', data.plans?.length || 0);
      if (data.plans) {
        setSavedPlans(data.plans);
      }
    } catch (error) {
      console.log('[Plan] Could not load saved plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadPlan = async (planId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      
      console.log('[Plan] Loading plan:', planId);
      const response = await fetch(`${apiUrl}/api/plan-my-day/?id=${planId}`, {
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Auth-Token': session?.access_token || ''
        }
      });
      const plan = await response.json();
      console.log('[Plan] Loaded plan:', plan.id, plan.title);
      
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
      console.log('[Plan] Could not load plan:', error);
    } finally {
      setLoading(false);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEventType(type);
    setStage('city_prompt');
    setMessages([{
      role: 'assistant',
      content: '📍 First things first — what city are you planning this day in?'
    }]);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || loading) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        const { data: { session } } = await supabase.auth.getSession();
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
        
        console.log('[Plan] Starting API request to:', apiUrl);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(`${apiUrl}/api/plan-my-day/`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            event_type: eventType,
            city: city,
            day_intent: userMessage,
            chat_history: [],
            session_id: sessionId
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('[Plan] Response received, status:', response.status);

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
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      
      const chatHistory = messages
        .filter(m => !m.categories)
        .map(m => ({ role: m.role, content: m.content }));

      console.log('[Plan] Sending follow-up message');
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 30000);
      
      const response = await fetch(`${apiUrl}/api/plan-my-day/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          event_type: eventType,
          city,
          day_intent: dayIntent,
          chat_history: chatHistory,
          user_message: userMessage,
          session_id: sessionId
        }),
        signal: controller2.signal
      });
      
      clearTimeout(timeoutId2);
      console.log('[Plan] Follow-up response received');

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStage('event_select');
    setEventType(null);
    setCity('');
    setDayIntent('');
    setMessages([]);
    setInputValue('');
    setSessionId(null);
    loadSavedPlans();
  };

  const selectedEvent = eventTypes.find(e => e.id === eventType);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* History button - always visible at top */}
        {savedPlans.length > 0 && (
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowHistoryModal(true);
            }}
          >
            <Ionicons name="time-outline" size={18} color={Colors.accent.coral} />
            <Text style={styles.historyButtonText}>My Plans ({savedPlans.length})</Text>
          </TouchableOpacity>
        )}

        {stage === 'event_select' ? (
          <View style={styles.eventSelection}>
            <Text style={styles.title}>What are you planning?</Text>
            <Text style={styles.subtitle}>Choose the type of day you want to plan</Text>
            
            <View style={styles.eventGrid}>
              {eventTypes.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => handleEventSelect(event.id)}
                  style={[styles.eventCard, { borderColor: event.color + '50' }]}
                >
                  <View style={[styles.eventIconContainer, { backgroundColor: event.color + '20' }]}>
                    <Ionicons name={event.icon as any} size={28} color={event.color} />
                  </View>
                  <Text style={styles.eventLabel}>{event.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {!loadingPlans && savedPlans.length > 0 && (
              <View style={styles.recentPlansSection}>
                <View style={styles.recentPlansHeader}>
                  <Ionicons name="time-outline" size={20} color={Colors.text.secondary} />
                  <Text style={styles.recentPlansTitle}>Recent Plans</Text>
                </View>
                {savedPlans.slice(0, 5).map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    onPress={() => loadPlan(plan.id)}
                    style={styles.savedPlanCard}
                  >
                    <View style={styles.savedPlanInfo}>
                      <Text style={styles.savedPlanTitle}>{plan.title}</Text>
                      <Text style={styles.savedPlanDate}>{formatDate(plan.updated_at)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.text.secondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              {selectedEvent && (
                <View style={styles.contextTags}>
                  <View style={[styles.tag, { backgroundColor: selectedEvent.color + '20' }]}>
                    <Ionicons name={selectedEvent.icon as any} size={14} color={selectedEvent.color} />
                    <Text style={[styles.tagText, { color: selectedEvent.color }]}>{selectedEvent.label}</Text>
                  </View>
                  {city && (
                    <View style={styles.tag}>
                      <Ionicons name="location" size={14} color={Colors.text.secondary} />
                      <Text style={styles.tagText}>{city}</Text>
                    </View>
                  )}
                </View>
              )}
              <TouchableOpacity onPress={resetFlow} style={styles.newPlanButton}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.accent.coral} />
                <Text style={styles.newPlanText}>New</Text>
              </TouchableOpacity>
            </View>

            {messages.map((msg, idx) => (
              <View key={idx} style={[styles.messageContainer, msg.role === 'user' && styles.userMessageContainer]}>
                <View style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                  <Text style={[styles.messageText, msg.role === 'user' && styles.userMessageText]}>
                    {msg.content}
                  </Text>
                </View>
                
                {msg.categories && msg.categories.length > 0 && (
                  <View style={styles.categoriesContainer}>
                    {msg.categories.map((cat, catIdx) => (
                      <View key={catIdx} style={styles.categorySection}>
                        <View style={styles.categoryHeader}>
                          <Ionicons 
                            name={getCategoryIcon(cat.type)} 
                            size={18} 
                            color={Colors.accent.coral} 
                          />
                          <Text style={styles.categoryTitle}>{cat.type}</Text>
                          <Text style={styles.categoryCount}>{cat.items.length} picks</Text>
                        </View>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.cardsScrollContent}
                          decelerationRate="fast"
                          snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
                        >
                          {cat.items.map((item, itemIdx) => (
                            <TouchableOpacity 
                              key={itemIdx} 
                              style={styles.fullCard}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedItem({ item, category: cat.type });
                              }}
                              activeOpacity={0.9}
                            >
                              <View style={styles.fullCardImageContainer}>
                                {item.image_url ? (
                                  <Image 
                                    source={{ uri: item.image_url }}
                                    style={styles.fullCardImage}
                                  />
                                ) : (
                                  <View style={styles.fullCardImagePlaceholder}>
                                    <Ionicons 
                                      name={getCategoryIcon(cat.type)} 
                                      size={48} 
                                      color={Colors.accent.coral} 
                                    />
                                  </View>
                                )}
                                <View style={styles.fullCardOverlay} />
                                <View style={styles.fullCardCategoryBadge}>
                                  <Text style={styles.fullCardCategoryText}>{cat.type}</Text>
                                </View>
                              </View>
                              
                              <View style={styles.fullCardContent}>
                                <Text style={styles.fullCardTitle} numberOfLines={2}>{item.title}</Text>
                                
                                {(item.cuisine || item.vibe) && (
                                  <Text style={styles.fullCardTagline} numberOfLines={1}>
                                    {[item.cuisine, item.vibe].filter(Boolean).join(' · ')}
                                  </Text>
                                )}
                                
                                {(item.neighborhood || item.address) && (
                                  <View style={styles.fullCardLocationRow}>
                                    <Ionicons name="location" size={14} color={Colors.accent.coral} />
                                    <Text style={styles.fullCardLocationText} numberOfLines={1}>
                                      {item.address || item.neighborhood}
                                    </Text>
                                  </View>
                                )}
                                
                                <Text style={styles.fullCardDescription} numberOfLines={3}>{item.description}</Text>
                                
                                <View style={styles.fullCardMetricsRow}>
                                  {item.rating && (
                                    <View style={styles.fullCardMetric}>
                                      <Text style={styles.fullCardMetricLabel}>Rating</Text>
                                      <View style={styles.fullCardMetricValueRow}>
                                        <Ionicons name="star" size={12} color="#FFD700" />
                                        <Text style={styles.fullCardMetricValue}>{item.rating}/5</Text>
                                      </View>
                                    </View>
                                  )}
                                  {item.price && (
                                    <View style={styles.fullCardMetric}>
                                      <Text style={styles.fullCardMetricLabel}>Price</Text>
                                      <Text style={styles.fullCardMetricValue}>{item.price}</Text>
                                    </View>
                                  )}
                                  {item.neighborhood && (
                                    <View style={styles.fullCardMetric}>
                                      <Text style={styles.fullCardMetricLabel}>Area</Text>
                                      <Text style={styles.fullCardMetricValue} numberOfLines={1}>{item.neighborhood}</Text>
                                    </View>
                                  )}
                                </View>
                                
                                {item.why_perfect && (
                                  <View style={styles.whyPerfectBox}>
                                    <Ionicons name="sparkles" size={14} color={Colors.accent.coral} />
                                    <Text style={styles.whyPerfectText}>{item.why_perfect}</Text>
                                  </View>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
            
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.accent.coral} />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {stage !== 'event_select' && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={sendMessage}
            placeholder={
              stage === 'city_prompt' ? 'Enter a city...' :
              stage === 'intent_prompt' ? 'Describe your ideal day...' :
              'Refine your plan...'
            }
            placeholderTextColor={Colors.text.muted}
            editable={!loading}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputValue.trim() || loading}
            style={[styles.sendButton, (!inputValue.trim() || loading) && styles.sendButtonDisabled]}
          >
            <Ionicons name="send" size={20} color={Colors.background.primary} />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={!!selectedItem} transparent animationType="slide">
        <View style={styles.detailModalContainer}>
          <View style={styles.detailModal}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedItem(null)}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedItem.item.image_url ? (
                  <Image 
                    source={{ uri: selectedItem.item.image_url }} 
                    style={styles.detailImage} 
                  />
                ) : (
                  <View style={[styles.detailImage, styles.detailImagePlaceholder]}>
                    <Ionicons 
                      name={getCategoryIcon(selectedItem.category)} 
                      size={64} 
                      color={Colors.accent.coral} 
                    />
                  </View>
                )}
                <View style={styles.detailContent}>
                  <View style={styles.detailCategoryBadge}>
                    <Text style={styles.detailCategoryText}>{selectedItem.category}</Text>
                  </View>
                  
                  <Text style={styles.detailTitle}>{selectedItem.item.title}</Text>
                  
                  {(selectedItem.item.cuisine || selectedItem.item.vibe) && (
                    <Text style={styles.detailTagline}>
                      {[selectedItem.item.cuisine, selectedItem.item.vibe].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  
                  {(selectedItem.item.address || selectedItem.item.neighborhood) && (
                    <TouchableOpacity 
                      style={styles.detailLocation}
                      onPress={() => {
                        const query = encodeURIComponent(
                          `${selectedItem.item.title} ${selectedItem.item.address || selectedItem.item.neighborhood} ${city}`
                        );
                        Linking.openURL(`https://maps.google.com/?q=${query}`);
                      }}
                    >
                      <Ionicons name="location" size={18} color={Colors.accent.coral} />
                      <Text style={styles.detailLocationText}>
                        {selectedItem.item.address || selectedItem.item.neighborhood}
                      </Text>
                      <Ionicons name="open-outline" size={16} color={Colors.text.secondary} />
                    </TouchableOpacity>
                  )}
                  
                  <View style={styles.detailMetrics}>
                    {selectedItem.item.rating && (
                      <View style={styles.detailMetric}>
                        <Text style={styles.detailMetricLabel}>Rating</Text>
                        <View style={styles.detailMetricValueRow}>
                          <Ionicons name="star" size={14} color="#FFD700" />
                          <Text style={styles.detailMetricValue}>{selectedItem.item.rating}/5</Text>
                        </View>
                      </View>
                    )}
                    {selectedItem.item.review_count && (
                      <View style={styles.detailMetric}>
                        <Text style={styles.detailMetricLabel}>Reviews</Text>
                        <Text style={styles.detailMetricValue}>{selectedItem.item.review_count}</Text>
                      </View>
                    )}
                    {selectedItem.item.price && (
                      <View style={styles.detailMetric}>
                        <Text style={styles.detailMetricLabel}>Price</Text>
                        <Text style={styles.detailMetricValue}>{selectedItem.item.price}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>About</Text>
                    <Text style={styles.detailDescription}>{selectedItem.item.description}</Text>
                  </View>
                  
                  {selectedItem.item.why_perfect && (
                    <View style={styles.detailWhyPerfect}>
                      <View style={styles.detailWhyPerfectHeader}>
                        <Ionicons name="sparkles" size={18} color={Colors.accent.coral} />
                        <Text style={styles.detailWhyPerfectTitle}>Why It's Perfect</Text>
                      </View>
                      <Text style={styles.detailWhyPerfectText}>{selectedItem.item.why_perfect}</Text>
                    </View>
                  )}
                  
                  <View style={styles.actionButtonsRow}>
                    {selectedItem.item.yelp_url && (
                      <TouchableOpacity 
                        style={styles.yelpButton}
                        onPress={() => Linking.openURL(selectedItem.item.yelp_url!)}
                      >
                        <Ionicons name="star" size={18} color={Colors.background.primary} />
                        <Text style={styles.yelpButtonText}>View on Yelp</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={[styles.searchButton, selectedItem.item.yelp_url && styles.searchButtonSecondary]}
                      onPress={() => {
                        const query = encodeURIComponent(`${selectedItem.item.title} ${city}`);
                        Linking.openURL(`https://www.google.com/search?q=${query}`);
                      }}
                    >
                      <Ionicons name="search" size={18} color={selectedItem.item.yelp_url ? Colors.accent.coral : Colors.background.primary} />
                      <Text style={[styles.searchButtonText, selectedItem.item.yelp_url && styles.searchButtonTextSecondary]}>Search</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.historyModalOverlay}>
          <View style={styles.historyModal}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>My Plans</Text>
              <TouchableOpacity 
                onPress={() => setShowHistoryModal(false)}
                style={styles.historyCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.historyList}
              showsVerticalScrollIndicator={false}
            >
              {loadingPlans ? (
                <ActivityIndicator size="large" color={Colors.accent.coral} style={{ marginTop: 40 }} />
              ) : savedPlans.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Ionicons name="calendar-outline" size={48} color={Colors.text.muted} />
                  <Text style={styles.emptyHistoryText}>No plans yet</Text>
                  <Text style={styles.emptyHistorySubtext}>Your saved plans will appear here</Text>
                </View>
              ) : (
                savedPlans.map((plan) => {
                  const eventConfig = eventTypes.find(e => e.id === plan.event_type);
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      onPress={() => {
                        setShowHistoryModal(false);
                        loadPlan(plan.id);
                      }}
                      style={[
                        styles.historyCard,
                        sessionId === plan.id && styles.historyCardActive
                      ]}
                    >
                      <View style={styles.historyCardIcon}>
                        <Ionicons 
                          name={(eventConfig?.icon || 'sparkles') as any} 
                          size={24} 
                          color={eventConfig?.color || Colors.accent.coral} 
                        />
                      </View>
                      <View style={styles.historyCardContent}>
                        <Text style={styles.historyCardTitle} numberOfLines={1}>
                          {plan.title || `${plan.event_type} in ${plan.city}`}
                        </Text>
                        <View style={styles.historyCardMeta}>
                          <Ionicons name="location-outline" size={12} color={Colors.text.muted} />
                          <Text style={styles.historyCardCity}>{plan.city}</Text>
                          <Text style={styles.historyCardDot}>•</Text>
                          <Text style={styles.historyCardDate}>{formatDate(plan.updated_at)}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={Colors.text.muted} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.newPlanModalButton}
              onPress={() => {
                setShowHistoryModal(false);
                resetFlow();
              }}
            >
              <Ionicons name="add-circle" size={20} color={Colors.background.primary} />
              <Text style={styles.newPlanModalButtonText}>Start New Plan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 32,
  },
  eventSelection: {
    paddingTop: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  newPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
  },
  newPlanText: {
    fontSize: 14,
    color: Colors.accent.coral,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  eventGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  eventCard: {
    width: '47%',
    padding: 24,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    alignItems: 'center',
  },
  eventIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  eventLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  recentPlansSection: {
    marginTop: 40,
  },
  recentPlansHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  recentPlansTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  savedPlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.tertiary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  savedPlanInfo: {
    flex: 1,
  },
  savedPlanTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  savedPlanDate: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  chatContainer: {
    flex: 1,
  },
  contextTags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background.tertiary,
  },
  tagText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: Colors.accent.coral,
  },
  assistantBubble: {
    backgroundColor: Colors.background.tertiary,
  },
  messageText: {
    fontSize: 16,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.background.primary,
  },
  categoriesContainer: {
    marginTop: 16,
    gap: 20,
    marginLeft: -16,
    marginRight: -16,
  },
  categorySection: {
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  categoryCount: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  cardsScrollContent: {
    paddingHorizontal: 12,
    gap: CARD_MARGIN,
  },
  swipeCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    marginHorizontal: CARD_MARGIN,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    minHeight: 180,
  },
  swipeCardGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 16,
  },
  cardBgIcon: {
    opacity: 0.3,
  },
  swipeCardContent: {
    padding: 16,
    flex: 1,
    gap: 8,
  },
  swipeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: 24,
  },
  swipeCardDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  swipeCardRelevanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.accent.coral + '15',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  swipeCardRelevance: {
    fontSize: 13,
    color: Colors.accent.coral,
    flex: 1,
    lineHeight: 18,
  },
  swipeCardFooter: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  categoryBadge: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  objectCard: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  objectCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  objectCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent.coral + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectCardTitleBox: {
    flex: 1,
  },
  objectCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: 22,
  },
  objectCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  objectCardNeighborhood: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  objectCardDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  objectCardMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  whyPerfectBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.accent.coral + '15',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  whyPerfectText: {
    fontSize: 13,
    color: Colors.accent.coral,
    flex: 1,
    lineHeight: 18,
  },
  fullCard: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fullCardImageContainer: {
    height: 120,
    position: 'relative',
  },
  fullCardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  fullCardCategoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.background.primary + 'E6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  fullCardCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.primary,
    textTransform: 'uppercase',
  },
  fullCardContent: {
    padding: 14,
  },
  fullCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  fullCardTagline: {
    fontSize: 13,
    color: Colors.accent.coral,
    marginBottom: 6,
    fontWeight: '500',
  },
  fullCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  fullCardLocationText: {
    fontSize: 12,
    color: Colors.text.secondary,
    flex: 1,
  },
  fullCardDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  fullCardMetricsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fullCardMetric: {
    flex: 1,
  },
  fullCardMetricLabel: {
    fontSize: 10,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fullCardMetricValue: {
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  fullCardMetricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: Colors.background.primary + 'CC',
    borderRadius: 20,
    padding: 8,
  },
  detailImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  detailContent: {
    padding: 20,
  },
  detailCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent.coral + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  detailCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent.coral,
    textTransform: 'uppercase',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  detailTagline: {
    fontSize: 15,
    color: Colors.accent.coral,
    marginBottom: 12,
    fontWeight: '500',
  },
  detailLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background.secondary,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  detailLocationText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
  },
  detailMetrics: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  detailMetric: {
    flex: 1,
    alignItems: 'center',
  },
  detailMetricLabel: {
    fontSize: 11,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  detailMetricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  detailWhyPerfect: {
    backgroundColor: Colors.accent.coral + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailWhyPerfectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailWhyPerfectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent.coral,
  },
  detailWhyPerfectText: {
    fontSize: 14,
    color: Colors.accent.coral,
    lineHeight: 22,
  },
  detailImagePlaceholder: {
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  yelpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32323',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  yelpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background.primary,
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.coral,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  searchButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accent.coral,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background.primary,
  },
  searchButtonTextSecondary: {
    color: Colors.accent.coral,
  },
  // History button styles
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    marginBottom: 12,
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent.coral,
  },
  // History modal styles
  historyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  historyModal: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  historyModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  historyCloseButton: {
    padding: 4,
  },
  historyList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: 400,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 16,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: Colors.text.muted,
    marginTop: 4,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  historyCardActive: {
    borderWidth: 1,
    borderColor: Colors.accent.coral,
  },
  historyCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyCardContent: {
    flex: 1,
  },
  historyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  historyCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyCardCity: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  historyCardDot: {
    fontSize: 13,
    color: Colors.text.muted,
    marginHorizontal: 4,
  },
  historyCardDate: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  newPlanModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.coral,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  newPlanModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background.primary,
  },
});
