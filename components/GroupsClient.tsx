'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, MessageSquare, Users, BarChart3, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const CATEGORIES = ['restaurants', 'movies', 'tv_shows', 'youtube_videos', 'reading', 'activities'];

interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  poll_id?: string;
}

export default function GroupsClient({ profile, friends }: { profile: any; friends: any[] }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [pollTitle, setPollTitle] = useState('');
  const [pollCategory, setPollCategory] = useState('restaurants');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages();
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });
      
      setGroups(data || []);
      if (data && data.length > 0) {
        setSelectedGroup(data[0]);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedGroup) return;
    
    try {
      const { data } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', selectedGroup.id)
        .order('created_at', { ascending: true });
      
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const { data: group } = await supabase
        .from('groups')
        .insert({
          name: newGroupName,
          description: newGroupDescription,
          created_by: profile.id,
        })
        .select()
        .single();

      if (group) {
        // Add creator as member
        await supabase
          .from('group_members')
          .insert({
            group_id: group.id,
            user_id: profile.id,
          });

        // Add selected friends
        for (const friendId of selectedFriends) {
          await supabase
            .from('group_members')
            .insert({
              group_id: group.id,
              user_id: friendId,
            });
        }

        setGroups([group, ...groups]);
        setSelectedGroup(group);
        setNewGroupName('');
        setNewGroupDescription('');
        setSelectedFriends([]);
        setShowCreateGroup(false);
      }
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return;

    try {
      const { data: message } = await supabase
        .from('group_messages')
        .insert({
          group_id: selectedGroup.id,
          user_id: profile.id,
          content: newMessage,
        })
        .select()
        .single();

      if (message) {
        setMessages([...messages, message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleCreatePoll = async () => {
    if (!pollTitle.trim() || !selectedGroup) return;

    try {
      const { data: poll } = await supabase
        .from('polls')
        .insert({
          group_id: selectedGroup.id,
          title: pollTitle,
          category: pollCategory,
          created_by: profile.id,
        })
        .select()
        .single();

      if (poll) {
        // Add poll message
        await supabase
          .from('group_messages')
          .insert({
            group_id: selectedGroup.id,
            user_id: profile.id,
            content: `Created a poll: ${pollTitle}`,
            poll_id: poll.id,
          });

        setPollTitle('');
        setShowCreatePoll(false);
        loadMessages();
      }
    } catch (err) {
      console.error('Error creating poll:', err);
    }
  };

  const categoryLabels: Record<string, string> = {
    restaurants: '🍽️ Restaurants',
    movies: '🎬 Movies',
    tv_shows: '📺 TV Shows',
    youtube_videos: '🎥 YouTube',
    reading: '📚 Reading',
    activities: '🎯 Activities',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation profile={profile} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-black mb-2">
              Group Decisions
            </h1>
            <p className="text-black font-bold opacity-70 text-lg">
              Decide together with your friends
            </p>
          </div>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-bold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Group
          </button>
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-extrabold text-black">Create Group</h2>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="e.g., Weekend Plans"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newGroupDescription}
                    onChange={e => setNewGroupDescription(e.target.value)}
                    placeholder="What's this group about?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Invite Friends
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {friends.map((friendship, idx) => {
                      const friendId = friendship.user_id_1 === profile.id 
                        ? friendship.user_id_2 
                        : friendship.user_id_1;
                      
                      return (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedFriends.includes(friendId)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedFriends([...selectedFriends, friendId]);
                              } else {
                                setSelectedFriends(selectedFriends.filter(id => id !== friendId));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-black font-bold">{friendId}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleCreateGroup}
                  className="w-full px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-bold"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Groups List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-bold text-black">Your Groups</h3>
              </div>
              <div className="overflow-y-auto max-h-96">
                {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition ${
                      selectedGroup?.id === group.id ? 'bg-brand-50 border-l-4 border-l-brand-600' : ''
                    }`}
                  >
                    <div className="font-bold text-black line-clamp-1">{group.name}</div>
                    <div className="text-xs text-black opacity-70 mt-1 line-clamp-2">
                      {group.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            {selectedGroup ? (
              <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-[500px]">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-xl font-extrabold text-black">{selectedGroup.name}</h2>
                  <p className="text-sm text-black opacity-70">{selectedGroup.description}</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(msg => (
                    <div key={msg.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-bold text-black opacity-70 mb-1">
                        {msg.user_id}
                      </div>
                      <div className="text-black">{msg.content}</div>
                      {msg.poll_id && (
                        <button
                          onClick={() => router.push(`/groups/${selectedGroup.id}/polls/${msg.poll_id}`)}
                          className="mt-2 text-sm text-brand-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <BarChart3 className="w-4 h-4" />
                          View Poll
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-bold"
                    >
                      Send
                    </button>
                  </div>

                  <button
                    onClick={() => setShowCreatePoll(true)}
                    className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-bold flex items-center justify-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Create Poll
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-black font-bold opacity-70">
                  Create or select a group to start chatting
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Create Poll Modal */}
        {showCreatePoll && selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-extrabold text-black">Create Poll</h2>
                <button
                  onClick={() => setShowCreatePoll(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Poll Title
                  </label>
                  <input
                    type="text"
                    value={pollTitle}
                    onChange={e => setPollTitle(e.target.value)}
                    placeholder="What should we do?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Category
                  </label>
                  <select
                    value={pollCategory}
                    onChange={e => setPollCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleCreatePoll}
                  className="w-full px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-bold"
                >
                  Create Poll
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
