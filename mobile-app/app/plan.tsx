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
  ActivityIndicator 
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { supabase } from '../lib/supabase';
import * as Haptics from 'expo-haptics';

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
  { id: 'date' as const, label: 'Date', icon: 'heart', color: Colors.accent.coral },
  { id: 'hangout' as const, label: 'Hang Out', icon: 'people', color: Colors.accent.coral },
  { id: 'solo' as const, label: 'Solo', icon: 'person', color: Colors.accent.coral },
  { id: 'other' as const, label: 'Other', icon: 'sparkles', color: Colors.accent.coral },
];

export default function PlanMyDayScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [stage, setStage] = useState<Stage>('event_select');
  const [eventType, setEventType] = useState<EventType>(null);
  const [city, setCity] = useState('');
  const [dayIntent, setDayIntent] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

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
        
        const response = await fetch(`${apiUrl}/api/plan-my-day`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
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
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      
      const chatHistory = messages
        .filter(m => !m.categories)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(`${apiUrl}/api/plan-my-day`, {
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStage('event_select');
    setEventType(null);
    setCity('');
    setDayIntent('');
    setMessages([]);
    setInputValue('');
  };

  const selectedEvent = eventTypes.find(e => e.id === eventType);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.text.primary} />
          <Text style={styles.backButtonText}>Discover</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan My Day</Text>
        <TouchableOpacity onPress={resetFlow} style={styles.headerButton}>
          <Ionicons name="refresh" size={22} color={Colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
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
          </View>
        ) : (
          <View style={styles.chatContainer}>
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
                      <View key={catIdx} style={styles.categoryCard}>
                        <View style={styles.categoryHeader}>
                          <View style={styles.categoryDot} />
                          <Text style={styles.categoryTitle}>{cat.type}</Text>
                        </View>
                        {cat.items.map((item, itemIdx) => (
                          <View key={itemIdx} style={styles.itemCard}>
                            <Text style={styles.itemTitle}>{item.title}</Text>
                            <Text style={styles.itemDescription}>{item.description}</Text>
                            <Text style={styles.itemRelevance}>{item.event_relevance}</Text>
                          </View>
                        ))}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    padding: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  eventSelection: {
    paddingTop: 32,
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
    marginTop: 12,
    gap: 12,
  },
  categoryCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent.coral,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent.coral,
  },
  itemCard: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  itemRelevance: {
    fontSize: 13,
    color: Colors.accent.coral,
    fontStyle: 'italic',
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
});
