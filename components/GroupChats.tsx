'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MessageSquare, Plus, Search, Loader2, Send } from 'lucide-react';

interface GroupChat {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  member_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export default function GroupChats() {
  const supabase = createClientComponentClient();
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: groupsData } = await supabase
        .from('group_members')
        .select('group_chats(id, name, description, avatar_url)')
        .eq('user_id', user.id);

      setGroups(groupsData?.map((g: any) => ({
        id: g.group_chats.id,
        name: g.group_chats.name,
        description: g.group_chats.description,
        avatar_url: g.group_chats.avatar_url,
        member_count: 0,
      })) || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (groupId: string) => {
    try {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, profiles(full_name)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      setMessages(messagesData?.map((m: any) => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_name: m.profiles.full_name,
        content: m.content,
        created_at: m.created_at,
      })) || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          group_id: selectedGroup,
          content: newMessage,
        });

      setNewMessage('');
      loadMessages(selectedGroup);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newGroup } = await supabase
        .from('group_chats')
        .insert({
          name: groupName,
          description: groupDescription,
          creator_id: user.id,
        })
        .select()
        .single();

      if (newGroup) {
        await supabase
          .from('group_members')
          .insert({
            group_id: newGroup.id,
            user_id: user.id,
            role: 'admin',
          });

        setGroupName('');
        setGroupDescription('');
        setShowCreateGroup(false);
        loadGroups();
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Groups List */}
      <div className="bg-gray-800 rounded-2xl p-4 overflow-y-auto border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-50">Groups</h3>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="p-2 bg-coral text-[#0D1117] rounded-full hover:bg-coral/90 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showCreateGroup && (
          <div className="mb-4 p-4 bg-gray-700 rounded-xl space-y-3">
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-gray-600 border border-gray-500 rounded-lg py-2 px-3 text-gray-50 placeholder:text-gray-400 focus:ring-2 focus:ring-coral/50"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              className="w-full bg-gray-600 border border-gray-500 rounded-lg py-2 px-3 text-gray-50 placeholder:text-gray-400 focus:ring-2 focus:ring-coral/50"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateGroup}
                className="flex-1 py-2 bg-coral text-[#0D1117] rounded-lg font-semibold hover:bg-coral/90 transition"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 py-2 bg-gray-600 text-gray-50 rounded-lg font-semibold hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {groups.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No groups yet</p>
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedGroup === group.id
                    ? 'bg-coral text-[#0D1117] font-semibold'
                    : 'bg-gray-700 text-gray-50 hover:bg-gray-600'
                }`}
              >
                <p className="font-semibold">{group.name}</p>
                {group.description && (
                  <p className="text-xs opacity-75">{group.description}</p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedGroup ? (
        <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-4 border border-gray-700 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No messages yet</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="p-3 bg-gray-700 rounded-lg">
                  <p className="text-xs font-semibold text-coral">{msg.sender_name}</p>
                  <p className="text-gray-50">{msg.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-gray-50 placeholder:text-gray-400 focus:ring-2 focus:ring-coral/50"
            />
            <button
              onClick={handleSendMessage}
              className="p-2 bg-coral text-[#0D1117] rounded-lg hover:bg-coral/90 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-4 border border-gray-700 flex items-center justify-center">
          <p className="text-gray-400">Select a group to start chatting</p>
        </div>
      )}
    </div>
  );
}
