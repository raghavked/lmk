import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

export async function GET(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get groups where user is a member
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

    // Get pending invites for user
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
    const { action, name, description, groupId, userId, inviteId, content, pollId, pollTitle, pollCategory } = body;

    // Create a new group
    if (action === 'create' || (!action && name)) {
      if (!name) {
        return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
      }

      const { data: group, error: groupError } = await supabaseAdmin
        .from('groups')
        .insert({
          name,
          description: description || '',
          creator_id: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabaseAdmin
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
        });

      if (memberError) {
        console.error('Error adding creator as member:', memberError);
      }

      return NextResponse.json({ group });
    }

    // Invite a friend to a group
    if (action === 'invite') {
      if (!groupId || !userId) {
        return NextResponse.json({ error: 'Group ID and user ID are required' }, { status: 400 });
      }

      // Check if already invited or member
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

    // Accept a group invite
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

      // Add user to group members
      await supabaseAdmin
        .from('group_members')
        .insert({
          group_id: invite.group_id,
          user_id: user.id,
        });

      // Update invite status
      await supabaseAdmin
        .from('group_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);

      return NextResponse.json({ success: true, message: 'Joined group' });
    }

    // Reject a group invite
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

    // Send a message to a group
    if (action === 'message') {
      if (!groupId || !content) {
        return NextResponse.json({ error: 'Group ID and content are required' }, { status: 400 });
      }

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
      return NextResponse.json({ message });
    }

    // Create a poll
    if (action === 'create_poll') {
      if (!groupId || !pollTitle) {
        return NextResponse.json({ error: 'Group ID and poll title are required' }, { status: 400 });
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

      // Send a message about the poll
      await supabaseAdmin
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: `Created a poll: ${pollTitle}`,
          poll_id: poll.id,
        });

      return NextResponse.json({ poll });
    }

    // Get messages for a group
    if (action === 'get_messages') {
      if (!groupId) {
        return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
      }

      const { data: messages, error } = await supabaseAdmin
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ messages: messages || [] });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error with group action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
