'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Users, BarChart3, X, Send, UserPlus, Check, Utensils, Clapperboard, Tv, BookOpen, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ModeNavigation from '@/components/ModeNavigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const CATEGORIES = ['restaurants', 'movies', 'tv_shows', 'reading', 'activities'];

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
  sender_name?: string;
}

interface GroupInvite {
  id: string;
  group_id: string;
  invited_by: string;
  created_at: string;
  groups?: { name: string; description: string };
}

interface PollOption {
  id: string;
  poll_id: string;
  title: string;
  description?: string;
  votes: number;
}

interface Poll {
  id: string;
  title: string;
  category: string;
  created_by: string;
  options: PollOption[];
  userVote?: string;
}

export default function GroupsClient({ profile, friends }: { profile: any; friends: any[] }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [polls, setPolls] = useState<Record<string, Poll>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showInviteFriend, setShowInviteFriend] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [pollTitle, setPollTitle] = useState('');
  const [pollCategory, setPollCategory] = useState('restaurants');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

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
      const { data: memberGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', profile.id);

      const memberGroupIds = memberGroups?.map((m: any) => m.group_id) || [];

      let groupsData: any[] = [];
      if (memberGroupIds.length > 0) {
        const { data } = await supabase
          .from('groups')
          .select('*')
          .in('id', memberGroupIds)
          .order('created_at', { ascending: false });
        groupsData = data || [];
      }

      const { data: invitesData } = await supabase
        .from('group_invites')
        .select('id, group_id, invited_by, created_at, groups:group_id (name, description)')
        .eq('user_id', profile.id)
        .eq('status', 'pending');

      setGroups(groupsData);
      setInvites(invitesData || []);
      if (groupsData.length > 0 && !selectedGroup) {
        setSelectedGroup(groupsData[0]);
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
      
      const msgs = data || [];
      setMessages(msgs);

      const userIds = [...new Set(msgs.map((m: any) => m.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        const map: Record<string, string> = {};
        profiles?.forEach((p: any) => {
          map[p.id] = p.full_name || 'Unknown';
        });
        setProfileMap(prev => ({ ...prev, ...map }));
      }

      const pollIds = msgs.filter((m: any) => m.poll_id).map((m: any) => m.poll_id);
      if (pollIds.length > 0) {
        await loadPolls(pollIds);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const loadPolls = async (pollIds: string[]) => {
    try {
      const { data: pollsData } = await supabase
        .from('polls')
        .select('*')
        .in('id', pollIds);

      const { data: optionsData } = await supabase
        .from('poll_options')
        .select('*')
        .in('poll_id', pollIds);

      const { data: allVotesData } = await supabase
        .from('poll_votes')
        .select('*')
        .in('poll_id', pollIds);

      const pollMap: Record<string, Poll> = {};
      pollsData?.forEach((p: any) => {
        const rawOptions = (optionsData || []).filter((o: any) => o.poll_id === p.id);
        const pollVotes = (allVotesData || []).filter((v: any) => v.poll_id === p.id);
        const enrichedOptions = rawOptions.map((o: any, idx: number) => {
          const voteCount = pollVotes.filter((v: any) => v.option_id === o.id).length;
          return {
            ...o,
            title: o.title || `Option ${idx + 1}`,
            description: o.description || '',
            votes: voteCount,
          };
        });

        pollMap[p.id] = {
          ...p,
          options: enrichedOptions,
          userVote: pollVotes.find((v: any) => v.user_id === profile.id)?.option_id,
        };
      });
      setPolls(prev => ({ ...prev, ...pollMap }));
    } catch (err) {
      console.error('Error loading polls:', err);
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
          creator_id: profile.id,
        })
        .select()
        .single();

      if (group) {
        await supabase
          .from('group_members')
          .insert({ group_id: group.id, user_id: profile.id });

        for (const friendId of selectedFriends) {
          await supabase
            .from('group_invites')
            .insert({
              group_id: group.id,
              user_id: friendId,
              invited_by: profile.id,
              status: 'pending',
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

  const handleAcceptInvite = async (inviteId: string, groupId: string) => {
    try {
      await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: profile.id });
      
      await supabase
        .from('group_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);

      loadGroups();
    } catch (err) {
      console.error('Error accepting invite:', err);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    try {
      await supabase
        .from('group_invites')
        .update({ status: 'rejected' })
        .eq('id', inviteId);

      setInvites(invites.filter(i => i.id !== inviteId));
    } catch (err) {
      console.error('Error rejecting invite:', err);
    }
  };

  const handleInviteFriend = async (friendId: string) => {
    if (!selectedGroup) return;
    try {
      await supabase
        .from('group_invites')
        .insert({
          group_id: selectedGroup.id,
          user_id: friendId,
          invited_by: profile.id,
          status: 'pending',
        });
      setShowInviteFriend(false);
    } catch (err) {
      console.error('Error inviting friend:', err);
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

    setCreatingPoll(true);
    try {
      let optionsMetadata: any[] = [];
      const params = new URLSearchParams();
      params.append('category', pollCategory);
      params.append('limit', '5');
      if (profile?.taste_profile) {
        params.append('taste_profile', JSON.stringify(profile.taste_profile));
      }

      try {
        const response = await fetch(`/api/recommend/?${params.toString()}`);
        const data = await response.json();
        optionsMetadata = (data.results || []).map((r: any) => ({
          title: r.object?.title || r.title || 'Option',
          description: r.explanation?.why_youll_like || r.description || '',
          personalized_score: r.personalized_score || 0,
        }));
      } catch (recErr) {
        console.error('Error fetching recommendations for poll:', recErr);
      }

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
        if (optionsMetadata.length > 0) {
          const pollOptionRows = optionsMetadata.map((opt: any) => ({
            poll_id: poll.id,
            title: opt.title || 'Option',
            description: opt.description || '',
            personalized_score: opt.personalized_score || 50,
            votes: 0,
          }));
          await supabase.from('poll_options').insert(pollOptionRows);
        }

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
        setCreatingPoll(false);
        loadMessages();
      }
    } catch (err) {
      console.error('Error creating poll:', err);
      setCreatingPoll(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const { error } = await supabase
        .from('poll_votes')
        .upsert({
          poll_id: pollId,
          option_id: optionId,
          user_id: profile.id,
        }, { onConflict: 'poll_id,user_id' });

      if (!error) {
        setPolls(prev => ({
          ...prev,
          [pollId]: {
            ...prev[pollId],
            userVote: optionId,
            options: prev[pollId].options.map(o => ({
              ...o,
              votes: o.id === optionId ? o.votes + 1 : 
                     (prev[pollId].userVote === o.id ? o.votes - 1 : o.votes),
            })),
          },
        }));
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const categoryLabels: Record<string, string> = {
    restaurants: '🍽️ Restaurants',
    movies: '🎬 Movies',
    tv_shows: '📺 TV Shows',
    reading: '📚 Reading',
    activities: '🎯 Activities',
  };

  return (
    <div className="min-h-screen bg-background-primary">
      <Navigation profile={profile} />
      <ModeNavigation />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-text-primary mb-2">
              Group Decisions
            </h1>
            <p className="text-text-secondary text-lg">
              Decide together with your friends
            </p>
          </div>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="px-6 py-3 bg-coral text-background-primary rounded-lg hover:bg-coral-dark transition font-bold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Group
          </button>
        </div>

        {invites.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-lg font-bold text-text-primary">Pending Invites</h3>
            {invites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between p-4 bg-background-tertiary rounded-lg border border-border-color">
                <div>
                  <p className="font-bold text-text-primary">{(invite.groups as any)?.name || 'Group'}</p>
                  <p className="text-sm text-text-secondary">{(invite.groups as any)?.description || "You've been invited!"}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvite(invite.id, invite.group_id)}
                    className="px-4 py-2 bg-coral text-background-primary rounded-lg font-bold hover:bg-coral-dark transition"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => handleRejectInvite(invite.id)}
                    className="px-4 py-2 bg-background-secondary text-text-secondary rounded-lg font-bold hover:bg-background-primary transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-tertiary rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-extrabold text-text-primary">Create Group</h2>
                <button onClick={() => setShowCreateGroup(false)} className="p-1 hover:bg-background-secondary rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-text-primary mb-2">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="e.g., Weekend Plans"
                    className="w-full px-4 py-2 border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-coral bg-background-secondary text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-primary mb-2">Description (optional)</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={e => setNewGroupDescription(e.target.value)}
                    placeholder="What's this group about?"
                    className="w-full px-4 py-2 border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-coral bg-background-secondary text-text-primary resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-primary mb-2">Invite Friends</label>
                  {friends.length === 0 ? (
                    <p className="text-text-secondary text-sm py-2">No friends to invite. Add some friends first!</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {friends.map((friend, idx) => (
                        <label key={idx} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-background-secondary rounded-lg transition">
                          <input
                            type="checkbox"
                            checked={selectedFriends.includes(friend.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedFriends([...selectedFriends, friend.id]);
                              } else {
                                setSelectedFriends(selectedFriends.filter((id: string) => id !== friend.id));
                              }
                            }}
                            className="w-4 h-4 accent-coral"
                          />
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-coral/20 flex items-center justify-center">
                              <span className="text-sm font-bold text-coral">{friend.full_name?.charAt(0) || '?'}</span>
                            </div>
                            <span className="text-text-primary font-medium">{friend.full_name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCreateGroup}
                  className="w-full px-4 py-3 bg-coral text-background-primary rounded-lg hover:bg-coral-dark transition font-bold"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-background-tertiary rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-border-color">
                <h3 className="font-bold text-text-primary">Your Groups</h3>
              </div>
              <div className="overflow-y-auto max-h-96">
                {groups.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-text-secondary text-sm">No groups yet</p>
                  </div>
                ) : (
                  groups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className={`w-full text-left p-4 border-b border-border-color hover:bg-background-secondary transition ${
                        selectedGroup?.id === group.id ? 'bg-coral/10' : ''
                      }`}
                    >
                      <div className="font-bold text-text-primary">{group.name}</div>
                      <p className="text-sm text-text-secondary">{group.description}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {selectedGroup ? (
              <div className="bg-background-tertiary rounded-lg shadow-md">
                <div className="p-4 border-b border-border-color flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-text-primary">{selectedGroup.name}</h2>
                    <p className="text-sm text-text-secondary">{selectedGroup.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowInviteFriend(true)}
                      className="px-3 py-2 bg-background-secondary text-text-primary rounded-lg hover:bg-background-primary transition font-bold flex items-center gap-1 border border-border-color"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite
                    </button>
                    <button
                      onClick={() => setShowCreatePoll(true)}
                      className="px-4 py-2 bg-coral text-background-primary rounded-lg hover:bg-coral-dark transition font-bold flex items-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      New Poll
                    </button>
                  </div>
                </div>

                <div className="p-4 h-96 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <p className="text-center text-text-secondary py-8">No messages yet. Start the conversation!</p>
                    ) : (
                      messages.map(message => (
                        <div key={message.id}>
                          {message.poll_id && polls[message.poll_id] ? (
                            <div className="bg-background-secondary border border-border-color rounded-lg p-4 max-w-md mx-auto">
                              <div className="flex items-center gap-2 mb-3">
                                <BarChart3 className="w-5 h-5 text-coral" />
                                <span className="font-bold text-text-primary">{polls[message.poll_id].title}</span>
                              </div>
                              <p className="text-xs text-coral mb-3">{categoryLabels[polls[message.poll_id].category] || polls[message.poll_id].category}</p>
                              <div className="space-y-2">
                                {polls[message.poll_id].options.map(option => (
                                  <button
                                    key={option.id}
                                    onClick={() => handleVote(message.poll_id!, option.id)}
                                    className={`w-full text-left p-3 rounded-lg border transition ${
                                      polls[message.poll_id!].userVote === option.id
                                        ? 'border-coral bg-coral/10'
                                        : 'border-border-color hover:border-coral/50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-text-primary">{option.title}</p>
                                        {option.description && (
                                          <p className="text-xs text-text-secondary mt-1">{option.description}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-text-secondary">{option.votes} votes</span>
                                        {polls[message.poll_id!].userVote === option.id && (
                                          <Check className="w-4 h-4 text-coral" />
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                              <p className="text-xs text-text-secondary mt-3 text-right">
                                by {profileMap[polls[message.poll_id].created_by] || 'Unknown'}
                              </p>
                            </div>
                          ) : message.user_id === profile.id ? (
                            <div className="bg-coral text-background-primary p-3 rounded-lg max-w-xs ml-auto">
                              <p className="text-sm">{message.content}</p>
                              <p className="text-xs text-right opacity-70 mt-1">{new Date(message.created_at).toLocaleTimeString()}</p>
                            </div>
                          ) : (
                            <div className="bg-background-secondary border border-border-color p-3 rounded-lg max-w-xs">
                              <p className="text-sm font-bold text-coral">{profileMap[message.user_id] || 'Unknown'}</p>
                              <p className="text-sm text-text-primary mt-1">{message.content}</p>
                              <p className="text-xs text-right text-text-secondary mt-1">{new Date(message.created_at).toLocaleTimeString()}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-border-color">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="w-full px-4 py-3 bg-background-secondary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-coral text-text-primary"
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={handleSendMessage}
                      className="px-6 py-3 bg-coral text-background-primary rounded-lg hover:bg-coral-dark transition font-bold"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-background-tertiary rounded-lg shadow-md p-12 text-center border border-border-color">
                <Users className="w-16 h-16 text-text-secondary mx-auto mb-6" />
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  {groups.length === 0 ? 'No groups yet' : 'Select a group'}
                </h3>
                <p className="text-text-secondary">
                  {groups.length === 0 ? 'Create a group to start deciding together!' : 'Choose a group to start chatting or create a new one.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {showCreatePoll && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-tertiary rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-extrabold text-text-primary">Create Poll</h2>
                <button onClick={() => setShowCreatePoll(false)} className="p-1 hover:bg-background-secondary rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-text-primary mb-2">Poll Title</label>
                  <input
                    type="text"
                    value={pollTitle}
                    onChange={e => setPollTitle(e.target.value)}
                    placeholder="e.g., What to watch tonight?"
                    className="w-full px-4 py-2 border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-coral bg-background-secondary text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-primary mb-3">Category</label>
                  <p className="text-sm text-text-secondary mb-2">AI will suggest options based on this category</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setPollCategory(cat)}
                        className={`px-4 py-2 rounded-lg font-bold transition ${
                          pollCategory === cat
                            ? 'bg-coral text-background-primary shadow-lg'
                            : 'bg-background-secondary text-text-primary border border-border-color hover:border-coral'
                        }`}
                      >
                        {categoryLabels[cat]}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCreatePoll}
                  disabled={creatingPoll}
                  className="w-full px-4 py-3 bg-coral text-background-primary rounded-lg hover:bg-coral-dark transition font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingPoll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Getting recommendations...
                    </>
                  ) : (
                    'Create Poll'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showInviteFriend && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-tertiary rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-extrabold text-text-primary">Invite Friend</h2>
                <button onClick={() => setShowInviteFriend(false)} className="p-1 hover:bg-background-secondary rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-text-secondary mb-4">Invite a friend to {selectedGroup?.name}</p>
              {friends.length === 0 ? (
                <p className="text-text-secondary text-center py-4">No friends to invite. Add some friends first!</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {friends.map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => handleInviteFriend(friend.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-background-secondary rounded-lg transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-coral/20 flex items-center justify-center">
                        <span className="font-bold text-coral">{friend.full_name?.charAt(0) || '?'}</span>
                      </div>
                      <span className="text-text-primary font-medium">{friend.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
