import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const xAuthToken = request.headers.get('X-Auth-Token');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : xAuthToken;

  if (token) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user) {
      return user;
    }
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    return session.user;
  }
  
  return null;
}

async function verifyGroupMembership(userId: string, groupId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

async function verifyGroupCreator(userId: string, groupId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .or(`creator_id.eq.${userId},created_by.eq.${userId}`)
    .single();
  return !!data;
}

export async function GET(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');
  const detail = searchParams.get('detail');

  try {
    if (groupId && detail === 'members') {
      const isMember = await verifyGroupMembership(user.id, groupId);
      if (!isMember) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }

      const { data: members } = await supabaseAdmin
        .from('group_members')
        .select('user_id, joined_at')
        .eq('group_id', groupId);

      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profileMap: Record<string, string> = {};
        profiles?.forEach(p => { profileMap[p.id] = p.full_name || 'Unknown'; });

        const { data: group } = await supabaseAdmin
          .from('groups')
          .select('creator_id, created_by')
          .eq('id', groupId)
          .single();

        const creatorId = group?.creator_id || group?.created_by;

        const enrichedMembers = members.map(m => ({
          user_id: m.user_id,
          full_name: profileMap[m.user_id] || 'Unknown',
          role: creatorId === m.user_id ? 'admin' : 'member',
          joined_at: m.joined_at,
          is_creator: creatorId === m.user_id,
        }));

        return NextResponse.json({ members: enrichedMembers });
      }

      return NextResponse.json({ members: [] });
    }

    if (groupId && detail === 'messages') {
      const isMember = await verifyGroupMembership(user.id, groupId);
      if (!isMember) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }

      const msgLimit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500));
      const msgOffset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);

      const { data: messages } = await supabaseAdmin
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .range(msgOffset, msgOffset + msgLimit - 1);

      if (messages && messages.length > 0) {
        const userIds = [...new Set(messages.map(m => m.user_id))];
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const nameMap: Record<string, string> = {};
        profiles?.forEach(p => { nameMap[p.id] = p.full_name || 'Unknown'; });

        const enrichedMessages = messages.map(m => ({
          ...m,
          sender_name: nameMap[m.user_id] || 'Unknown',
        }));

        return NextResponse.json({ messages: enrichedMessages });
      }

      return NextResponse.json({ messages: [] });
    }

    if (groupId && detail === 'polls') {
      const isMember = await verifyGroupMembership(user.id, groupId);
      if (!isMember) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }

      const { data: polls } = await supabaseAdmin
        .from('polls')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (polls && polls.length > 0) {
        const pollIds = polls.map(p => p.id);
        const { data: options } = await supabaseAdmin
          .from('poll_options')
          .select('*')
          .in('poll_id', pollIds);

        const { data: votes } = await supabaseAdmin
          .from('poll_votes')
          .select('*')
          .in('poll_id', pollIds);

        const { data: creatorProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .in('id', [...new Set(polls.map(p => p.created_by))]);

        const creatorMap: Record<string, string> = {};
        creatorProfiles?.forEach(p => { creatorMap[p.id] = p.full_name || 'Unknown'; });

        const enrichedPolls = polls.map(p => {
          const pollOptions = (options || []).filter(o => o.poll_id === p.id);
          const pollVotes = (votes || []).filter(v => v.poll_id === p.id);

          const voteCounts: Record<string, number> = {};
          pollVotes.forEach((v: any) => {
            voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
          });

          const enrichedOptions = pollOptions.map((opt: any, idx: number) => ({
            id: opt.id,
            poll_id: opt.poll_id,
            title: opt.title || `Option ${idx + 1}`,
            description: opt.description || '',
            personalized_score: opt.personalized_score || 50,
            votes: voteCounts[opt.id] || 0,
          }));

          return {
            ...p,
            description: undefined,
            creator_name: creatorMap[p.created_by] || 'Unknown',
            options: enrichedOptions,
            votes: pollVotes,
            user_voted: pollVotes.some(v => v.user_id === user.id),
            user_vote_option: pollVotes.find(v => v.user_id === user.id)?.option_id,
          };
        });

        return NextResponse.json({ polls: enrichedPolls });
      }

      return NextResponse.json({ polls: [] });
    }

    const { data: memberGroups } = await supabaseAdmin
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    const memberGroupIds = memberGroups?.map(m => m.group_id) || [];

    let groups: any[] = [];
    if (memberGroupIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('groups')
        .select('*')
        .in('id', memberGroupIds)
        .order('created_at', { ascending: false });
      groups = data || [];
    }

    const { data: invites } = await supabaseAdmin
      .from('group_invites')
      .select(`
        id,
        group_id,
        invited_by,
        created_at,
        groups:group_id (name, description)
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending');

    return NextResponse.json({ 
      groups: groups || [],
      invites: invites || [] 
    });
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ groups: [], invites: [] });
  }
}

export async function POST(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, name, description, groupId, userId, inviteId, content, pollId, optionId, pollTitle, pollCategory } = body;

    if (action === 'create' || (!action && name)) {
      if (!name) {
        return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
      }

      const { data: group, error: groupError } = await supabaseAdmin
        .from('groups')
        .insert({
          name,
          description: description || '',
          created_by: user.id,
          creator_id: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      await supabaseAdmin
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
        });

      return NextResponse.json({ group });
    }

    if (action === 'delete_group') {
      if (!groupId) {
        return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
      }

      const isCreator = await verifyGroupCreator(user.id, groupId);
      if (!isCreator) {
        return NextResponse.json({ error: 'Only the group creator can delete the group' }, { status: 403 });
      }

      await supabaseAdmin.from('group_messages').delete().eq('group_id', groupId);
      await supabaseAdmin.from('group_invites').delete().eq('group_id', groupId);

      const { data: polls } = await supabaseAdmin
        .from('polls')
        .select('id')
        .eq('group_id', groupId);
      if (polls && polls.length > 0) {
        const pollIds = polls.map(p => p.id);
        await supabaseAdmin.from('poll_votes').delete().in('poll_id', pollIds);
        await supabaseAdmin.from('poll_options').delete().in('poll_id', pollIds);
        await supabaseAdmin.from('polls').delete().eq('group_id', groupId);
      }

      await supabaseAdmin.from('group_members').delete().eq('group_id', groupId);
      await supabaseAdmin.from('groups').delete().eq('id', groupId);

      return NextResponse.json({ success: true, message: 'Group deleted' });
    }

    if (action === 'remove_member') {
      if (!groupId || !userId) {
        return NextResponse.json({ error: 'Group ID and user ID are required' }, { status: 400 });
      }

      const isCreator = await verifyGroupCreator(user.id, groupId);
      if (!isCreator) {
        return NextResponse.json({ error: 'Only the group creator can remove members' }, { status: 403 });
      }

      if (userId === user.id) {
        return NextResponse.json({ error: 'Cannot remove yourself. Delete the group instead.' }, { status: 400 });
      }

      await supabaseAdmin
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      return NextResponse.json({ success: true, message: 'Member removed' });
    }

    if (action === 'leave_group') {
      if (!groupId) {
        return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
      }

      const isCreator = await verifyGroupCreator(user.id, groupId);
      if (isCreator) {
        return NextResponse.json({ error: 'Group creators cannot leave. Delete the group instead.' }, { status: 400 });
      }

      await supabaseAdmin
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      return NextResponse.json({ success: true, message: 'Left group' });
    }

    if (action === 'invite') {
      if (!groupId || !userId) {
        return NextResponse.json({ error: 'Group ID and user ID are required' }, { status: 400 });
      }

      const isMember = await verifyGroupMembership(user.id, groupId);
      if (!isMember) {
        return NextResponse.json({ error: 'You must be a member to invite others' }, { status: 403 });
      }

      const { data: existingInvite } = await supabaseAdmin
        .from('group_invites')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        return NextResponse.json({ error: 'User already invited' }, { status: 400 });
      }

      const { data: existingMember } = await supabaseAdmin
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('group_invites')
        .insert({
          group_id: groupId,
          user_id: userId,
          invited_by: user.id,
          status: 'pending',
        });

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Invite sent' });
    }

    if (action === 'accept_invite') {
      if (!inviteId) {
        return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 });
      }

      const { data: invite } = await supabaseAdmin
        .from('group_invites')
        .select('group_id')
        .eq('id', inviteId)
        .eq('user_id', user.id)
        .single();

      if (!invite) {
        return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
      }

      await supabaseAdmin
        .from('group_members')
        .insert({
          group_id: invite.group_id,
          user_id: user.id,
        });

      await supabaseAdmin
        .from('group_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);

      return NextResponse.json({ success: true, message: 'Joined group' });
    }

    if (action === 'reject_invite') {
      if (!inviteId) {
        return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 });
      }

      await supabaseAdmin
        .from('group_invites')
        .update({ status: 'rejected' })
        .eq('id', inviteId)
        .eq('user_id', user.id);

      return NextResponse.json({ success: true, message: 'Invite declined' });
    }

    if (action === 'message') {
      if (!groupId || !content) {
        return NextResponse.json({ error: 'Group ID and content are required' }, { status: 400 });
      }

      const isMember = await verifyGroupMembership(user.id, groupId);
      if (!isMember) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { data: message, error } = await supabaseAdmin
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content,
          poll_id: pollId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ 
        message: {
          ...message,
          sender_name: profile?.full_name || 'Unknown',
        }
      });
    }

    if (action === 'create_poll') {
      if (!groupId || !pollTitle) {
        return NextResponse.json({ error: 'Group ID and poll title are required' }, { status: 400 });
      }

      const isMember = await verifyGroupMembership(user.id, groupId);
      if (!isMember) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }

      const { data: poll, error: pollError } = await supabaseAdmin
        .from('polls')
        .insert({
          group_id: groupId,
          title: pollTitle,
          category: pollCategory || 'restaurants',
          created_by: user.id,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      let aiOptions: any[] = [];
      try {
        const { data: memberData } = await supabaseAdmin
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId);

        const memberIds = memberData?.map(m => m.user_id) || [];
        const { data: memberProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, taste_profile')
          .in('id', memberIds);

        const { data: memberRatings } = await supabaseAdmin
          .from('ratings')
          .select('user_id, item_title, category, score')
          .in('user_id', memberIds)
          .eq('category', pollCategory || 'restaurants')
          .order('score', { ascending: false })
          .limit(50);

        const profileSummary = memberProfiles?.map(p => {
          const userRatings = memberRatings?.filter(r => r.user_id === p.id) || [];
          const topRated = userRatings.slice(0, 5).map(r => `${r.item_title} (${Number(r.score)}★)`).join(', ');
          return `${p.full_name}: taste=${JSON.stringify(p.taste_profile || {})}${topRated ? `, top rated: ${topRated}` : ''}`;
        }).join('\n') || 'No profiles available';

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const aiResponse = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `You are helping a group of friends decide on ${pollCategory || 'restaurants'}. The poll question is: "${pollTitle}"

Group members and their preferences:
${profileSummary}

Generate exactly 4 options that would appeal to the group. For each option, provide a title, brief description (1 sentence), and a personalized score (0-100) based on how well it matches the group's combined preferences.

Respond in JSON format only:
[
  {"title": "Option Name", "description": "Brief description", "personalized_score": 85},
  ...
]`
          }],
        });

        const responseText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '';
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          aiOptions = JSON.parse(jsonMatch[0]);
        }
      } catch (aiErr) {
        console.error('AI poll options error:', aiErr);
        aiOptions = [
          { title: 'Option A', description: 'First suggestion', personalized_score: 75 },
          { title: 'Option B', description: 'Second suggestion', personalized_score: 70 },
          { title: 'Option C', description: 'Third suggestion', personalized_score: 65 },
          { title: 'Option D', description: 'Fourth suggestion', personalized_score: 60 },
        ];
      }

      const optionRows = aiOptions.map((opt: any) => ({
        poll_id: poll.id,
        title: opt.title || 'Option',
        description: opt.description || '',
        personalized_score: opt.personalized_score || 50,
        votes: 0,
      }));

      if (optionRows.length > 0) {
        await supabaseAdmin.from('poll_options').insert(optionRows);
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      await supabaseAdmin
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: `📊 Created a poll: "${pollTitle}"`,
          poll_id: poll.id,
        });

      const { data: insertedOptions } = await supabaseAdmin
        .from('poll_options')
        .select('*')
        .eq('poll_id', poll.id);

      return NextResponse.json({ 
        poll: {
          ...poll,
          description: undefined,
          creator_name: profile?.full_name || 'Unknown',
          options: (insertedOptions || []).map((opt: any) => ({
            ...opt,
            votes: 0,
          })),
          votes: [],
          user_voted: false,
        }
      });
    }

    if (action === 'vote_poll') {
      if (!pollId || !optionId) {
        return NextResponse.json({ error: 'Poll ID and option ID are required' }, { status: 400 });
      }

      const { data: poll } = await supabaseAdmin
        .from('polls')
        .select('group_id')
        .eq('id', pollId)
        .single();

      if (!poll) {
        return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
      }

      const isMember = await verifyGroupMembership(user.id, poll.group_id);
      if (!isMember) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }

      const { data: existingVote } = await supabaseAdmin
        .from('poll_votes')
        .select('id, option_id')
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .single();

      if (existingVote) {
        if (existingVote.option_id === optionId) {
          return NextResponse.json({ error: 'Already voted for this option' }, { status: 400 });
        }
        await supabaseAdmin.from('poll_votes').delete().eq('id', existingVote.id);
      }

      const { error: voteError } = await supabaseAdmin
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id,
        });

      if (voteError) throw voteError;

      const { data: pollData } = await supabaseAdmin
        .from('polls')
        .select('description')
        .eq('id', pollId)
        .single();

      let aiOptions: any[] = [];
      try {
        aiOptions = JSON.parse(pollData?.description || '[]');
      } catch {}

      const { data: updatedDbOptions } = await supabaseAdmin
        .from('poll_options')
        .select('*')
        .eq('poll_id', pollId);

      const { data: allVotes } = await supabaseAdmin
        .from('poll_votes')
        .select('option_id')
        .eq('poll_id', pollId);

      const voteCounts: Record<string, number> = {};
      (allVotes || []).forEach((v: any) => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
      });

      const enrichedOptions = (updatedDbOptions || []).map((opt: any, idx: number) => ({
        ...opt,
        title: aiOptions[idx]?.title || `Option ${idx + 1}`,
        description: aiOptions[idx]?.description || '',
        personalized_score: aiOptions[idx]?.personalized_score || 50,
        votes: voteCounts[opt.id] || 0,
      }));

      return NextResponse.json({ success: true, options: enrichedOptions });
    }

    if (action === 'get_recommendations') {
      if (!groupId || !pollCategory) {
        return NextResponse.json({ error: 'Group ID and category are required' }, { status: 400 });
      }

      const isMember = await verifyGroupMembership(user.id, groupId);
      if (!isMember) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }

      const { data: memberData } = await supabaseAdmin
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      const memberIds = memberData?.map(m => m.user_id) || [];

      const { data: memberProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, taste_profile, location')
        .in('id', memberIds);

      const { data: memberRatings } = await supabaseAdmin
        .from('ratings')
        .select('user_id, item_title, category, score, description')
        .in('user_id', memberIds)
        .eq('category', pollCategory)
        .order('score', { ascending: false })
        .limit(100);

      const profileSummary = memberProfiles?.map(p => {
        const userRatings = memberRatings?.filter(r => r.user_id === p.id) || [];
        const loved = userRatings.filter(r => Number(r.score) >= 4).map(r => r.item_title).join(', ');
        const disliked = userRatings.filter(r => Number(r.score) <= 2).map(r => r.item_title).join(', ');
        return `${p.full_name}: preferences=${JSON.stringify(p.taste_profile || {})}${loved ? `, loved: ${loved}` : ''}${disliked ? `, disliked: ${disliked}` : ''}`;
      }).join('\n') || 'No profiles available';

      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const aiResponse = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: `You are an AI recommendation engine for a group of friends looking for ${pollCategory} recommendations.

Group members and their preferences:
${profileSummary}

Generate 5 personalized ${pollCategory} recommendations that would satisfy everyone in the group. For each recommendation, provide:
- title: Name of the recommendation
- description: 2-3 sentence description of why this is great for the group
- match_score: 0-100 score for how well it matches group preferences
- reasoning: Brief explanation of why this works for the group

Respond in JSON format only:
[
  {"title": "...", "description": "...", "match_score": 85, "reasoning": "..."},
  ...
]`
          }],
        });

        const responseText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '';
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const recommendations = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ recommendations });
        }
      } catch (aiErr) {
        console.error('AI recommendation error:', aiErr);
      }

      return NextResponse.json({ recommendations: [] });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error with group action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');

  if (!groupId) {
    return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
  }

  const isCreator = await verifyGroupCreator(user.id, groupId);
  if (!isCreator) {
    return NextResponse.json({ error: 'Only the group creator can delete the group' }, { status: 403 });
  }

  try {
    await supabaseAdmin.from('group_messages').delete().eq('group_id', groupId);
    await supabaseAdmin.from('group_invites').delete().eq('group_id', groupId);

    const { data: polls } = await supabaseAdmin
      .from('polls')
      .select('id')
      .eq('group_id', groupId);
    if (polls && polls.length > 0) {
      const pollIds = polls.map(p => p.id);
      await supabaseAdmin.from('poll_votes').delete().in('poll_id', pollIds);
      await supabaseAdmin.from('poll_options').delete().in('poll_id', pollIds);
      await supabaseAdmin.from('polls').delete().eq('group_id', groupId);
    }

    await supabaseAdmin.from('group_members').delete().eq('group_id', groupId);
    await supabaseAdmin.from('groups').delete().eq('id', groupId);

    return NextResponse.json({ success: true, message: 'Group deleted' });
  } catch (error: any) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
