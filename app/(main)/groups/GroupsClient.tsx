
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
    <div className="min-h-screen bg-[background-primary]">
      <Navigation profile={profile} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-[text-primary] mb-2">
              Group Decisions
            </h1>
            <p className="text-[text-secondary] text-lg">
              Decide together with your friends
            </p>
          </div>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="px-6 py-3 bg-coral text-[background-primary] rounded-lg hover:bg-coral-dark transition font-bold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Group
          </button>
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[background-tertiary] rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-extrabold text-[text-primary]">Create Group</h2>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="p-1 hover:bg-[background-secondary] rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[text-primary] mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="e.g., Weekend Plans"
                    className="w-full px-4 py-2 border border-[border-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-coral bg-[background-secondary] text-[text-primary]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[text-primary] mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newGroupDescription}
                    onChange={e => setNewGroupDescription(e.target.value)}
                    placeholder="What's this group about?"
                    className="w-full px-4 py-2 border border-[border-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-coral bg-[background-secondary] text-[text-primary] resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[text-primary] mb-2">
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
                          <span className="text-[text-primary] font-bold">{friendId}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleCreateGroup}
                  className="w-full px-4 py-3 bg-coral text-[background-primary] rounded-lg hover:bg-coral-dark transition font-bold"
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
            <div className="bg-[background-tertiary] rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-[border-color]">
                <h3 className="font-bold text-[text-primary]">Your Groups</h3>
              </div>
              <div className="overflow-y-auto max-h-96">
                {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`w-full text-left p-4 border-b border-[border-color] hover:bg-[background-secondary] transition ${
                      selectedGroup?.id === group.id ? 'bg-coral/10' : ''
                    }`}
                  >
                    <div className="font-bold text-[text-primary]">{group.name}</div>
                    <p className="text-sm text-[text-secondary]">{group.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="lg:col-span-3">
            {selectedGroup ? (
              <div className="bg-[background-tertiary] rounded-lg shadow-md">
                <div className="p-4 border-b border-[border-color] flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-[text-primary]">{selectedGroup.name}</h2>
                    <p className="text-sm text-[text-secondary]">{selectedGroup.description}</p>
                  </div>
                  <button
                    onClick={() => setShowCreatePoll(true)}
                    className="px-4 py-2 bg-coral text-[background-primary] rounded-lg hover:bg-coral-dark transition font-bold flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    New Poll
                  </button>
                </div>

                <div className="p-4 h-96 overflow-y-auto flex flex-col-reverse">
                  <div className="space-y-4">
                    {messages.map(message => (
                      <div key={message.id}>
                        {message.user_id === profile.id ? (
                          <div className="bg-coral text-[background-primary] p-3 rounded-lg max-w-xs ml-auto">
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs text-right opacity-70 mt-1">{new Date(message.created_at).toLocaleTimeString()}</p>
                          </div>
                        ) : (
                          <div className="bg-[background-secondary] border border-[border-color] p-3 rounded-lg max-w-xs">
                            <p className="text-sm font-bold text-[text-primary]">{message.user_id}</p>
                            <p className="text-sm text-[text-primary] mt-1">{message.content}</p>
                            <p className="text-xs text-right text-[text-secondary] mt-1">{new Date(message.created_at).toLocaleTimeString()}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t border-[border-color]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="w-full px-4 py-3 bg-[background-secondary] border border-[border-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-coral text-[text-primary]"
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={handleSendMessage}
                      className="px-6 py-3 bg-coral text-[background-primary] rounded-lg hover:bg-coral-dark transition font-bold"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[background-tertiary] rounded-lg shadow-md p-12 text-center border border-[border-color]">
                <Users className="w-16 h-16 text-[text-secondary] mx-auto mb-6" />
                <h3 className="text-xl font-bold text-[text-primary] mb-2">Select a group</h3>
                <p className="text-[text-secondary]">Choose a group to start chatting or create a new one.</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Poll Modal */}
        {showCreatePoll && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[background-tertiary] rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-extrabold text-[text-primary]">Create Poll</h2>
                <button
                  onClick={() => setShowCreatePoll(false)}
                  className="p-1 hover:bg-[background-secondary] rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[text-primary] mb-2">
                    Poll Title
                  </label>
                  <input
                    type="text"
                    value={pollTitle}
                    onChange={e => setPollTitle(e.target.value)}
                    placeholder="e.g., What to watch tonight?"
                    className="w-full px-4 py-2 border border-[border-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-coral bg-[background-secondary] text-[text-primary]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[text-primary] mb-3">
                    Category
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setPollCategory(cat)}
                        className={`px-4 py-2 rounded-lg font-bold transition ${
                          pollCategory === cat
                            ? 'bg-coral text-[background-primary] shadow-lg'
                            : 'bg-[background-secondary] text-[text-primary] border border-[border-color] hover:border-coral'
                        }`}
                      >
                        {categoryLabels[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreatePoll}
                  className="w-full px-4 py-3 bg-coral text-[background-primary] rounded-lg hover:bg-coral-dark transition font-bold"
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
