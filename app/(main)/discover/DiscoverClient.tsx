'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ObjectCard from '@/components/ObjectCard';
import Navigation from '@/components/Navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  results?: any[];
}

export default function DiscoverClient({ profile }: { profile: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMessage: Message = {
      role: 'user',
      content: input,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          mode: 'chat',
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.results.length > 0 
          ? `I found ${data.results.length} great options for you:`
          : 'I couldn\'t find anything matching that. Try being more specific?',
        results: data.results,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, something went wrong: ${error.message}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation profile={profile} />
      
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            What should you do today?
          </h1>
          <p className="text-gray-600">
            Ask me anything — restaurants, movies, shows, or activities
          </p>
        </div>
        
        <div className="space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">
                Try asking me something like:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleSuggestion('Find me a good Italian restaurant nearby')}
                  className="block mx-auto px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition"
                >
                  "Find me a good Italian restaurant nearby"
                </button>
                <button
                  onClick={() => handleSuggestion('What\'s a good thriller movie to watch tonight?')}
                  className="block mx-auto px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition"
                >
                  "What's a good thriller movie to watch tonight?"
                </button>
                <button
                  onClick={() => handleSuggestion('Show me popular TV shows right now')}
                  className="block mx-auto px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition"
                >
                  "Show me popular TV shows right now"
                </button>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div key={index} className="animate-slide-up">
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-primary-600 text-white px-4 py-3 rounded-2xl max-w-md">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-white px-4 py-3 rounded-2xl mb-4 max-w-md shadow-sm">
                    {message.content}
                  </div>
                  
                  {message.results && message.results.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {message.results.map((result, idx) => (
                        <ObjectCard
                          key={idx}
                          object={result.object}
                          rank={result.rank}
                          score={result.personalized_score}
                          explanation={result.explanation}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Finding the best options...</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-primary-600 text-white p-3 rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
