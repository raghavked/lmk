import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, RefreshControl, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import { ErrorView, NetworkError } from '../../components/ErrorBoundary';
import { FriendListSkeleton } from '../../components/SkeletonLoader';
import * as Haptics from 'expo-haptics';

interface Group {
  id: string;
  name: string;
  description: string;
  creator_id: string;
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

interface Friend {
  id: string;
  full_name: string;
}

interface GroupMember {
  user_id: string;
  full_name: string;
  role: string;
  is_creator: boolean;
  joined_at: string;
}

interface PollOption {
  id: string;
  poll_id: string;
  title: string;
  description: string;
  personalized_score: number;
  votes: number;
}

interface Poll {
  id: string;
  group_id: string;
  title: string;
  category: string;
  created_by: string;
  creator_name: string;
  created_at: string;
  options: PollOption[];
  votes: any[];
  user_voted: boolean;
  user_vote_option?: string;
}

interface Recommendation {
  title: string;
  description: string;
  match_score: number;
  reasoning: string;
}

const CATEGORIES = ['restaurants', 'movies', 'tv_shows', 'reading', 'activities'];
const categoryLabels: Record<string, string> = {
  restaurants: 'Restaurants',
  movies: 'Movies',
  tv_shows: 'TV Shows',
  reading: 'Reading',
  activities: 'Activities',
};

const getCategoryIcon = (category: string, size: number = 16, color: string = Colors.accent.coral) => {
  switch (category) {
    case 'restaurants':
      return <Ionicons name="restaurant" size={size} color={color} />;
    case 'movies':
      return <MaterialCommunityIcons name="movie-open" size={size} color={color} />;
    case 'tv_shows':
      return <Ionicons name="tv" size={size} color={color} />;
    case 'reading':
      return <Ionicons name="book" size={size} color={color} />;
    case 'activities':
      return <MaterialCommunityIcons name="star-four-points" size={size} color={color} />;
    default:
      return null;
  }
};

export default function GroupsScreen() {
  const { getAccessToken, user: authUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [votingPollOption, setVotingPollOption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showInviteFriend, setShowInviteFriend] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'polls'>('chat');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [pollTitle, setPollTitle] = useState('');
  const [pollCategory, setPollCategory] = useState('restaurants');
  const [recCategory, setRecCategory] = useState('restaurants');
  const messagesScrollRef = useRef<ScrollView>(null);

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';

  const getHeaders = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('Not authenticated');
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Auth-Token': accessToken,
    };
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadGroups();
    if (selectedGroup) {
      await loadMessages(selectedGroup.id);
    }
    setRefreshing(false);
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup.id);
      loadPolls(selectedGroup.id);
    }
  }, [selectedGroup?.id]);

  const loadGroups = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);

      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/`, { headers });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        setInvites(data.invites || []);
        if (data.groups && data.groups.length > 0 && !selectedGroup) {
          setSelectedGroup(data.groups[0]);
        }
        if (selectedGroup && data.groups) {
          const stillExists = data.groups.find((g: Group) => g.id === selectedGroup.id);
          if (!stillExists) {
            setSelectedGroup(data.groups[0] || null);
          }
        }
      } else {
        setError('Could not load groups. Please try again.');
      }
    } catch (err: any) {
      if (err.message === 'Not authenticated') {
        setError('Please sign in to view groups');
      } else if (err.name === 'TypeError' || err.message?.toLowerCase().includes('network')) {
        setError('network');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (groupId: string) => {
    try {
      setLoadingMessages(true);
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/?groupId=${groupId}&detail=messages`, { headers });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setTimeout(() => {
          messagesScrollRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadPolls = async (groupId: string) => {
    try {
      setLoadingPolls(true);
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/?groupId=${groupId}&detail=polls`, { headers });

      if (response.ok) {
        const data = await response.json();
        setPolls(data.polls || []);
      }
    } catch (err) {
      console.error('Error loading polls:', err);
    } finally {
      setLoadingPolls(false);
    }
  };

  const loadMembers = async (groupId: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/?groupId=${groupId}&detail=members`, { headers });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Error loading members:', err);
    }
  };

  const loadFriends = async () => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/friends/`, { headers });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Error loading friends:', err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/`, {
        method: 'POST',
        headers,
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
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Group created!');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Could not create group');
      }
    } catch (err) {
      console.error('Error creating group:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${selectedGroup.name}"? This will remove all messages, polls, and members. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getHeaders();
              const response = await fetch(`${apiUrl}/api/groups/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  action: 'delete_group',
                  groupId: selectedGroup.id,
                }),
              });

              if (response.ok) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowGroupSettings(false);
                const remaining = groups.filter(g => g.id !== selectedGroup.id);
                setGroups(remaining);
                setSelectedGroup(remaining[0] || null);
                setMessages([]);
                setPolls([]);
                Alert.alert('Success', 'Group deleted');
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Could not delete group');
              }
            } catch (err) {
              Alert.alert('Error', 'Something went wrong');
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;

    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${selectedGroup.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getHeaders();
              const response = await fetch(`${apiUrl}/api/groups/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  action: 'leave_group',
                  groupId: selectedGroup.id,
                }),
              });

              if (response.ok) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowGroupSettings(false);
                const remaining = groups.filter(g => g.id !== selectedGroup.id);
                setGroups(remaining);
                setSelectedGroup(remaining[0] || null);
                setMessages([]);
                setPolls([]);
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Could not leave group');
              }
            } catch (err) {
              Alert.alert('Error', 'Something went wrong');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!selectedGroup) return;

    Alert.alert(
      'Remove Member',
      `Remove ${memberName} from "${selectedGroup.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getHeaders();
              const response = await fetch(`${apiUrl}/api/groups/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  action: 'remove_member',
                  groupId: selectedGroup.id,
                  userId: memberId,
                }),
              });

              if (response.ok) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setMembers(members.filter(m => m.user_id !== memberId));
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Could not remove member');
              }
            } catch (err) {
              Alert.alert('Error', 'Something went wrong');
            }
          },
        },
      ]
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'message',
          groupId: selectedGroup.id,
          content: messageText,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setTimeout(() => {
          messagesScrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        setNewMessage(messageText);
        Alert.alert('Error', 'Could not send message');
      }
    } catch (err) {
      setNewMessage(messageText);
      console.error('Error sending message:', err);
    }
  };

  const handleCreatePoll = async () => {
    if (!pollTitle.trim() || !selectedGroup) return;

    try {
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create_poll',
          groupId: selectedGroup.id,
          pollTitle,
          pollCategory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPolls(prev => [data.poll, ...prev]);
        setPollTitle('');
        setShowCreatePoll(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Poll created with AI-generated options!');
        loadMessages(selectedGroup.id);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Could not create poll');
      }
    } catch (err) {
      console.error('Error creating poll:', err);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    try {
      setVotingPollOption(optionId);
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'vote_poll',
          pollId,
          optionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPolls(prev => prev.map(p => {
          if (p.id === pollId) {
            return {
              ...p,
              options: data.options || p.options,
              user_voted: true,
              user_vote_option: optionId,
            };
          }
          return p;
        }));
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Could not vote');
      }
    } catch (err) {
      console.error('Error voting:', err);
    } finally {
      setVotingPollOption(null);
    }
  };

  const handleInviteFriend = async (friendId: string) => {
    if (!selectedGroup) return;

    try {
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/`, {
        method: 'POST',
        headers,
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
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/`, {
        method: 'POST',
        headers,
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
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/`, {
        method: 'POST',
        headers,
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

  const handleGetRecommendations = async () => {
    if (!selectedGroup) return;

    try {
      setLoadingRecs(true);
      setShowRecommendations(true);
      const headers = await getHeaders();
      const response = await fetch(`${apiUrl}/api/groups/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'get_recommendations',
          groupId: selectedGroup.id,
          pollCategory: recCategory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } else {
        Alert.alert('Error', 'Could not get recommendations');
      }
    } catch (err) {
      console.error('Error getting recommendations:', err);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoadingRecs(false);
    }
  };

  const isCreator = selectedGroup?.creator_id === authUser?.id;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderPollCard = (poll: Poll) => {
    const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes || 0), 0);

    return (
      <View key={poll.id} style={styles.pollCard}>
        <View style={styles.pollHeader}>
          <View style={styles.pollTitleRow}>
            <Ionicons name="bar-chart" size={16} color={Colors.accent.coral} />
            <Text style={styles.pollTitle}>{poll.title}</Text>
          </View>
          <View style={styles.pollMetaRow}>
            {getCategoryIcon(poll.category, 13, Colors.text.secondary)}
            <Text style={styles.pollMeta}>{categoryLabels[poll.category]} · by {poll.creator_name}</Text>
          </View>
        </View>
        {poll.options.map((option) => {
          const isVoted = poll.user_vote_option === option.id;
          const votePercent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.pollOption, isVoted && styles.pollOptionVoted]}
              onPress={() => handleVotePoll(poll.id, option.id)}
              disabled={votingPollOption !== null}
            >
              {poll.user_voted && (
                <View style={[styles.pollOptionBar, { width: `${votePercent}%` }]} />
              )}
              <View style={styles.pollOptionContent}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pollOptionTitle, isVoted && styles.pollOptionTitleVoted]}>
                    {option.title}
                    {isVoted && ' ✓'}
                  </Text>
                  {option.description ? (
                    <Text style={styles.pollOptionDesc}>{option.description}</Text>
                  ) : null}
                </View>
                <View style={styles.pollOptionRight}>
                  {option.personalized_score > 0 && (
                    <Text style={styles.pollScore}>{option.personalized_score}%</Text>
                  )}
                  {poll.user_voted && (
                    <Text style={styles.pollVotes}>{option.votes} vote{option.votes !== 1 ? 's' : ''}</Text>
                  )}
                </View>
              </View>
              {votingPollOption === option.id && (
                <ActivityIndicator size="small" color={Colors.accent.coral} style={{ position: 'absolute', right: 12 }} />
              )}
            </TouchableOpacity>
          );
        })}
        <Text style={styles.pollFooter}>{totalVotes} total vote{totalVotes !== 1 ? 's' : ''}</Text>
      </View>
    );
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
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
                <Text style={styles.inviteDesc}>{invite.groups?.description || "You've been invited!"}</Text>
              </View>
              <View style={styles.inviteActions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptInvite(invite.id)}>
                  <Text style={styles.acceptBtnText}>Join</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => handleRejectInvite(invite.id)}>
                  <Ionicons name="close" size={18} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {groups.length === 0 && invites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color={Colors.text.secondary} />
          <Text style={styles.emptyText}>No groups yet</Text>
          <Text style={styles.emptySubtext}>Create a group to get recommendations with friends</Text>
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
                    style={styles.iconBtn}
                    onPress={() => {
                      setRecCategory('restaurants');
                      setRecommendations([]);
                      setShowRecommendations(true);
                    }}
                  >
                    <Ionicons name="bulb-outline" size={18} color={Colors.accent.coral} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconBtn}
                    onPress={() => {
                      loadFriends();
                      setShowInviteFriend(true);
                    }}
                  >
                    <Ionicons name="person-add-outline" size={16} color={Colors.accent.coral} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconBtn}
                    onPress={() => {
                      loadMembers(selectedGroup.id);
                      setShowGroupSettings(true);
                    }}
                  >
                    <Ionicons name="settings-outline" size={18} color={Colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.tabBar}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'chat' && styles.activeTabBtn]}
                  onPress={() => setActiveTab('chat')}
                >
                  <Ionicons name="chatbubbles-outline" size={16} color={activeTab === 'chat' ? Colors.accent.coral : Colors.text.secondary} />
                  <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'polls' && styles.activeTabBtn]}
                  onPress={() => {
                    setActiveTab('polls');
                    if (selectedGroup) loadPolls(selectedGroup.id);
                  }}
                >
                  <Ionicons name="bar-chart-outline" size={16} color={activeTab === 'polls' ? Colors.accent.coral : Colors.text.secondary} />
                  <Text style={[styles.tabText, activeTab === 'polls' && styles.activeTabText]}>Polls</Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'chat' ? (
                <>
                  <ScrollView 
                    ref={messagesScrollRef}
                    style={styles.messagesContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent.coral} />}
                  >
                    {loadingMessages ? (
                      <ActivityIndicator size="small" color={Colors.accent.coral} style={{ marginTop: 20 }} />
                    ) : messages.length === 0 ? (
                      <View style={styles.emptyMessages}>
                        <Ionicons name="chatbubble-ellipses-outline" size={32} color={Colors.text.secondary} />
                        <Text style={styles.noMessages}>No messages yet. Start the conversation!</Text>
                      </View>
                    ) : (
                      messages.map((msg) => {
                        const isOwn = msg.user_id === authUser?.id;
                        return (
                          <View key={msg.id} style={[styles.message, isOwn && styles.ownMessage]}>
                            {!isOwn && (
                              <Text style={styles.senderName}>{msg.sender_name || 'Unknown'}</Text>
                            )}
                            <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>{msg.content}</Text>
                            <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>{formatTime(msg.created_at)}</Text>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.messageInput}
                      placeholder="Type a message..."
                      placeholderTextColor={Colors.text.secondary}
                      value={newMessage}
                      onChangeText={setNewMessage}
                      onSubmitEditing={handleSendMessage}
                      returnKeyType="send"
                    />
                    <TouchableOpacity 
                      style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]} 
                      onPress={handleSendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Ionicons name="send" size={18} color={newMessage.trim() ? Colors.background.primary : Colors.text.secondary} />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <ScrollView 
                  style={styles.pollsContainer}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent.coral} />}
                >
                  <TouchableOpacity 
                    style={styles.createPollBtn}
                    onPress={() => setShowCreatePoll(true)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={Colors.accent.coral} />
                    <Text style={styles.createPollBtnText}>Create Poll</Text>
                  </TouchableOpacity>

                  {loadingPolls ? (
                    <ActivityIndicator size="small" color={Colors.accent.coral} style={{ marginTop: 20 }} />
                  ) : polls.length === 0 ? (
                    <View style={styles.emptyMessages}>
                      <Ionicons name="bar-chart-outline" size={32} color={Colors.text.secondary} />
                      <Text style={styles.noMessages}>No polls yet. Create one to get the group deciding!</Text>
                    </View>
                  ) : (
                    polls.map(renderPollCard)
                  )}
                  <View style={{ height: 20 }} />
                </ScrollView>
              )}
            </>
          )}
        </View>
      )}

      {/* Create Group Modal */}
      <Modal visible={showCreateGroup} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Create Group</Text>
                  <TouchableOpacity onPress={() => setShowCreateGroup(false)}>
                    <Ionicons name="close" size={24} color={Colors.text.secondary} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Group name"
                  placeholderTextColor={Colors.text.secondary}
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  placeholder="Description (optional)"
                  placeholderTextColor={Colors.text.secondary}
                  value={newGroupDescription}
                  onChangeText={setNewGroupDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Poll Modal */}
      <Modal visible={showCreatePoll} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Create Poll</Text>
                  <TouchableOpacity onPress={() => setShowCreatePoll(false)}>
                    <Ionicons name="close" size={24} color={Colors.text.secondary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.pollHint}>AI will generate options based on your group's preferences</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="What should we do? (e.g., Where to eat tonight?)"
                  placeholderTextColor={Colors.text.secondary}
                  value={pollTitle}
                  onChangeText={setPollTitle}
                />
                <Text style={styles.categoryLabel}>Category:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {CATEGORIES.map((cat) => {
                    const isActive = pollCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryBtn, isActive && styles.activeCategoryBtn]}
                        onPress={() => setPollCategory(cat)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {getCategoryIcon(cat, 14, isActive ? Colors.background.primary : Colors.accent.coral)}
                          <Text style={[styles.categoryBtnText, isActive && styles.activeCategoryBtnText]}>
                            {categoryLabels[cat]}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invite Friend Modal */}
      <Modal visible={showInviteFriend} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Friend</Text>
              <TouchableOpacity onPress={() => setShowInviteFriend(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
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
          </View>
        </View>
      </Modal>

      {/* Group Settings Modal */}
      <Modal visible={showGroupSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Settings</Text>
              <TouchableOpacity onPress={() => setShowGroupSettings(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {selectedGroup && (
              <>
                <Text style={styles.settingsGroupName}>{selectedGroup.name}</Text>
                {selectedGroup.description ? (
                  <Text style={styles.settingsDesc}>{selectedGroup.description}</Text>
                ) : null}

                <Text style={styles.membersTitle}>Members ({members.length})</Text>
                <ScrollView style={styles.membersList}>
                  {members.map((member) => (
                    <View key={member.user_id} style={styles.memberItem}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{member.full_name[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>
                          {member.full_name}
                          {member.is_creator && ' 👑'}
                          {member.user_id === authUser?.id && ' (you)'}
                        </Text>
                      </View>
                      {isCreator && !member.is_creator && member.user_id !== authUser?.id && (
                        <TouchableOpacity
                          style={styles.removeMemberBtn}
                          onPress={() => handleRemoveMember(member.user_id, member.full_name)}
                        >
                          <Ionicons name="remove-circle-outline" size={22} color="#F44336" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.settingsActions}>
                  {isCreator ? (
                    <TouchableOpacity style={styles.deleteGroupBtn} onPress={handleDeleteGroup}>
                      <Ionicons name="trash-outline" size={18} color="#F44336" />
                      <Text style={styles.deleteGroupBtnText}>Delete Group</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.leaveGroupBtn} onPress={handleLeaveGroup}>
                      <Ionicons name="exit-outline" size={18} color="#F44336" />
                      <Text style={styles.deleteGroupBtnText}>Leave Group</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Group Recommendations Modal */}
      <Modal visible={showRecommendations} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Recommendations</Text>
              <TouchableOpacity onPress={() => setShowRecommendations(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>AI-powered picks for your whole group</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => {
                const isActive = recCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryBtn, isActive && styles.activeCategoryBtn]}
                    onPress={() => setRecCategory(cat)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {getCategoryIcon(cat, 14, isActive ? Colors.background.primary : Colors.accent.coral)}
                      <Text style={[styles.categoryBtnText, isActive && styles.activeCategoryBtnText]}>
                        {categoryLabels[cat]}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity 
              style={styles.getRecsBtn}
              onPress={handleGetRecommendations}
              disabled={loadingRecs}
            >
              {loadingRecs ? (
                <ActivityIndicator size="small" color={Colors.background.primary} />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color={Colors.background.primary} />
                  <Text style={styles.getRecsBtnText}>Get Recommendations</Text>
                </>
              )}
            </TouchableOpacity>

            <ScrollView style={styles.recsList}>
              {recommendations.map((rec, idx) => (
                <View key={idx} style={styles.recCard}>
                  <View style={styles.recHeader}>
                    <Text style={styles.recTitle}>{rec.title}</Text>
                    <View style={styles.recScoreBadge}>
                      <Text style={styles.recScoreText}>{rec.match_score}%</Text>
                    </View>
                  </View>
                  <Text style={styles.recDescription}>{rec.description}</Text>
                  <Text style={styles.recReasoning}>{rec.reasoning}</Text>
                </View>
              ))}
            </ScrollView>
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
    padding: 32,
  },
  emptyText: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    color: Colors.text.secondary,
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  groupHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 8,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  activeTabBtn: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent.coral,
  },
  tabText: {
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.accent.coral,
    fontWeight: '600',
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
  emptyMessages: {
    alignItems: 'center',
    marginTop: 40,
  },
  noMessages: {
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  message: {
    backgroundColor: Colors.background.secondary,
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    marginBottom: 8,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accent.coral,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  senderName: {
    color: Colors.accent.coral,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    color: Colors.text.primary,
    fontSize: 15,
  },
  ownMessageText: {
    color: Colors.background.primary,
  },
  messageTime: {
    color: Colors.text.secondary,
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(0,0,0,0.4)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  messageInput: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text.primary,
    marginRight: 8,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: Colors.accent.coral,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.background.secondary,
  },
  pollsContainer: {
    flex: 1,
    padding: 16,
  },
  createPollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.background.secondary,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent.coral,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  createPollBtnText: {
    color: Colors.accent.coral,
    fontWeight: '600',
    fontSize: 15,
  },
  pollCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  pollHeader: {
    marginBottom: 12,
  },
  pollTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  pollMeta: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  pollOption: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  pollOptionVoted: {
    borderWidth: 1.5,
    borderColor: Colors.accent.coral,
  },
  pollOptionBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(254, 175, 176, 0.15)',
    borderRadius: 10,
  },
  pollTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  pollOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  pollOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  pollOptionTitleVoted: {
    color: Colors.accent.coral,
  },
  pollOptionDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  pollOptionRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  pollScore: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent.coral,
  },
  pollVotes: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  pollFooter: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  keyboardAvoid: {
    flex: 1,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  modalInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
    padding: 12,
    color: Colors.text.primary,
    marginBottom: 12,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pollHint: {
    color: Colors.text.secondary,
    fontSize: 13,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  categoryLabel: {
    color: Colors.text.secondary,
    marginBottom: 8,
    fontSize: 14,
  },
  categoryScroll: {
    marginBottom: 16,
    maxHeight: 44,
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
    fontSize: 13,
  },
  activeCategoryBtnText: {
    color: Colors.background.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
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
  settingsGroupName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  settingsDesc: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 12,
  },
  membersList: {
    maxHeight: 250,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: Colors.background.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  removeMemberBtn: {
    padding: 8,
  },
  settingsActions: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  deleteGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  leaveGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  deleteGroupBtnText: {
    color: '#F44336',
    fontWeight: '600',
  },
  getRecsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent.coral,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  getRecsBtnText: {
    color: Colors.background.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  recsList: {
    maxHeight: 400,
  },
  recCard: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  recScoreBadge: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  recScoreText: {
    color: Colors.background.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  recDescription: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 6,
    lineHeight: 20,
  },
  recReasoning: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
