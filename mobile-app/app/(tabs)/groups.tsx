import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import { ErrorView, NetworkError } from '../../components/ErrorBoundary';
import { FriendListSkeleton } from '../../components/SkeletonLoader';
import * as Haptics from 'expo-haptics';

interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  poll_id?: string;
}

interface GroupInvite {
  id: string;
  group_id: string;
  invited_by: string;
  created_at: string;
  groups?: { name: string; description: string };
}

interface Friend {
  id: string;
  full_name: string;
}

const CATEGORIES = ['restaurants', 'movies', 'tv_shows', 'reading', 'activities'];

export default function GroupsScreen() {
  const { getAccessToken } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showInviteFriend, setShowInviteFriend] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [pollTitle, setPollTitle] = useState('');
  const [pollCategory, setPollCategory] = useState('restaurants');
  const [profile, setProfile] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadGroups();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadGroups();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages();
    }
  }, [selectedGroup]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }
  };

  const loadGroups = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);

      const accessToken = await getAccessToken();
      if (!accessToken) {
        setError('Please sign in to view groups');
        setLoading(false);
        return;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/groups`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        setInvites(data.invites || []);
        if (data.groups && data.groups.length > 0 && !selectedGroup) {
          setSelectedGroup(data.groups[0]);
        }
      } else {
        console.error('Error loading groups:', await response.text());
        setError('Could not load groups. Please try again.');
      }
    } catch (err: any) {
      console.error('Error loading groups:', err);
      if (err.name === 'TypeError' || err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('fetch')) {
        setError('network');
      } else {
        setError('Something went wrong. Please try again.');
      }
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
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert('Error', 'Please sign in to create groups');
        return;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/groups`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGroups([data.group, ...groups]);
        setSelectedGroup(data.group);
        setNewGroupName('');
        setNewGroupDescription('');
        setShowCreateGroup(false);
        Alert.alert('Success', 'Group created!');
      } else {
        const errorData = await response.json();
        console.error('Error creating group:', errorData);
        Alert.alert('Error', errorData.error || 'Could not create group. Please try again.');
      }
    } catch (err) {
      console.error('Error creating group:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !profile) return;

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
    if (!pollTitle.trim() || !selectedGroup || !profile) return;

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
        Alert.alert('Success', 'Poll created!');
      }
    } catch (err) {
      console.error('Error creating poll:', err);
    }
  };

  const loadFriends = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/friends`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Error loading friends:', err);
    }
  };

  const handleInviteFriend = async (friendId: string) => {
    if (!selectedGroup) return;

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/groups`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
        body: JSON.stringify({
          action: 'invite',
          groupId: selectedGroup.id,
          userId: friendId,
        }),
      });

      if (response.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Invite sent!');
        setShowInviteFriend(false);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Could not send invite');
      }
    } catch (err) {
      console.error('Error inviting friend:', err);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/groups`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
        body: JSON.stringify({
          action: 'accept_invite',
          inviteId,
        }),
      });

      if (response.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'You joined the group!');
        loadGroups();
      }
    } catch (err) {
      console.error('Error accepting invite:', err);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/groups`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
        body: JSON.stringify({
          action: 'reject_invite',
          inviteId,
        }),
      });

      if (response.ok) {
        loadGroups();
      }
    } catch (err) {
      console.error('Error rejecting invite:', err);
    }
  };

  const categoryLabels: Record<string, string> = {
    restaurants: '🍽️ Restaurants',
    movies: '🎬 Movies',
    tv_shows: '📺 TV Shows',
    reading: '📚 Reading',
    activities: '🎯 Activities',
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Groups</Text>
        </View>
        <FriendListSkeleton count={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Groups</Text>
        </View>
        {error === 'network' ? (
          <NetworkError onRetry={loadGroups} />
        ) : (
          <ErrorView message={error} onRetry={loadGroups} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity 
          style={styles.newBtn} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCreateGroup(true);
          }}
        >
          <Ionicons name="add" size={18} color={Colors.background.primary} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {invites.length > 0 && (
        <View style={styles.invitesSection}>
          <Text style={styles.invitesTitle}>Pending Invites</Text>
          {invites.map((invite) => (
            <View key={invite.id} style={styles.inviteCard}>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteGroupName}>{invite.groups?.name || 'Group'}</Text>
                <Text style={styles.inviteDesc}>{invite.groups?.description || 'You\'ve been invited!'}</Text>
              </View>
              <View style={styles.inviteActions}>
                <TouchableOpacity 
                  style={styles.acceptBtn} 
                  onPress={() => handleAcceptInvite(invite.id)}
                >
                  <Text style={styles.acceptBtnText}>Join</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.declineBtn} 
                  onPress={() => handleRejectInvite(invite.id)}
                >
                  <Ionicons name="close" size={18} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {groups.length === 0 && invites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No groups yet</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateGroup(true)}>
            <Text style={styles.createBtnText}>Create a Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <ScrollView horizontal style={styles.groupTabs} showsHorizontalScrollIndicator={false}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={[styles.groupTab, selectedGroup?.id === group.id && styles.activeGroupTab]}
                onPress={() => setSelectedGroup(group)}
              >
                <Text style={[styles.groupTabText, selectedGroup?.id === group.id && styles.activeGroupTabText]}>
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedGroup && (
            <>
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>{selectedGroup.name}</Text>
                <View style={styles.groupHeaderActions}>
                  <TouchableOpacity 
                    style={styles.inviteBtn} 
                    onPress={() => {
                      loadFriends();
                      setShowInviteFriend(true);
                    }}
                  >
                    <Ionicons name="person-add-outline" size={16} color={Colors.accent.coral} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pollBtn} onPress={() => setShowCreatePoll(true)}>
                    <Text style={styles.pollBtnText}>📊 Poll</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.messagesContainer}>
                {messages.length === 0 ? (
                  <Text style={styles.noMessages}>No messages yet. Start the conversation!</Text>
                ) : (
                  messages.map((msg) => (
                    <View key={msg.id} style={[styles.message, msg.user_id === profile?.id && styles.ownMessage]}>
                      <Text style={styles.messageText}>{msg.content}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type a message..."
                  placeholderTextColor={Colors.text.secondary}
                  value={newMessage}
                  onChangeText={setNewMessage}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                  <Text style={styles.sendBtnText}>Send</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      <Modal visible={showCreateGroup} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group name"
              placeholderTextColor={Colors.text.secondary}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor={Colors.text.secondary}
              value={newGroupDescription}
              onChangeText={setNewGroupDescription}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateGroup(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreateGroup}>
                <Text style={styles.confirmBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreatePoll} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Poll</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Poll question"
              placeholderTextColor={Colors.text.secondary}
              value={pollTitle}
              onChangeText={setPollTitle}
            />
            <Text style={styles.categoryLabel}>Category:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryBtn, pollCategory === cat && styles.activeCategoryBtn]}
                  onPress={() => setPollCategory(cat)}
                >
                  <Text style={[styles.categoryBtnText, pollCategory === cat && styles.activeCategoryBtnText]}>
                    {categoryLabels[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreatePoll(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreatePoll}>
                <Text style={styles.confirmBtnText}>Create Poll</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showInviteFriend} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Friend</Text>
            <Text style={styles.modalSubtitle}>Select a friend to invite to {selectedGroup?.name}</Text>
            <ScrollView style={styles.friendsList}>
              {friends.length === 0 ? (
                <Text style={styles.noFriendsText}>No friends to invite. Add some friends first!</Text>
              ) : (
                friends.map((friend) => (
                  <TouchableOpacity 
                    key={friend.id} 
                    style={styles.friendItem}
                    onPress={() => handleInviteFriend(friend.id)}
                  >
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>{friend.full_name[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.friendItemName}>{friend.full_name}</Text>
                    <Ionicons name="add-circle-outline" size={24} color={Colors.accent.coral} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowInviteFriend(false)}>
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loader: {
    marginTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  newBtnText: {
    color: Colors.background.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: 16,
    marginBottom: 16,
  },
  createBtn: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createBtnText: {
    color: Colors.background.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  groupTabs: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  groupTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activeGroupTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent.coral,
  },
  groupTabText: {
    color: Colors.text.secondary,
  },
  activeGroupTabText: {
    color: Colors.accent.coral,
    fontWeight: '600',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  groupHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteBtn: {
    padding: 8,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 6,
  },
  pollBtn: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pollBtnText: {
    color: Colors.text.primary,
  },
  invitesSection: {
    padding: 16,
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  invitesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent.coral,
    marginBottom: 12,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteGroupName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  inviteDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  acceptBtnText: {
    color: Colors.background.primary,
    fontWeight: '600',
  },
  declineBtn: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  noMessages: {
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 20,
  },
  message: {
    backgroundColor: Colors.background.secondary,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accent.coral,
  },
  messageText: {
    color: Colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  messageInput: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text.primary,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: Colors.background.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
    padding: 12,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryLabel: {
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryBtn: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeCategoryBtn: {
    backgroundColor: Colors.accent.coral,
  },
  categoryBtnText: {
    color: Colors.text.secondary,
  },
  activeCategoryBtnText: {
    color: Colors.background.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: Colors.text.secondary,
  },
  confirmBtn: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: Colors.background.primary,
    fontWeight: '600',
  },
  modalSubtitle: {
    color: Colors.text.secondary,
    marginBottom: 16,
    fontSize: 14,
  },
  friendsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  noFriendsText: {
    color: Colors.text.secondary,
    textAlign: 'center',
    padding: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    color: Colors.background.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  friendItemName: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 16,
  },
  closeModalBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeModalBtnText: {
    color: Colors.text.secondary,
    fontSize: 16,
  },
});
