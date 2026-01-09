// Service for fetching and managing support tickets
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import type { SupportTicket as AdminSupportTicket, TicketMessage as AdminTicketMessage } from '@/types/admin';

// Re-export admin types for backward compatibility
export type SupportTicket = AdminSupportTicket;
export type TicketMessage = AdminTicketMessage;

/**
 * Fetch all support tickets with pagination and filters
 */
export async function fetchSupportTickets(
  filters?: {
    status?: string;
    priority?: string;
    category?: string;
  },
  page: number = 1,
  pageSize: number = 10
): Promise<{ tickets: SupportTicket[]; total: number }> {
  try {
    let query = supabase
      .from('support_tickets')
      .select(`
        id,
        user_id,
        user_role,
        subject,
        description,
        priority,
        status,
        category,
        assigned_to,
        resolved_at,
        created_at,
        updated_at,
        users!support_tickets_user_id_fkey (
          name
        ),
        assigned:users!support_tickets_assigned_to_fkey (
          name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching support tickets:', error);
      throw error;
    }

    const tickets: SupportTicket[] = (data || []).map((ticket: any) => ({
      id: ticket.id,
      userId: ticket.user_id,
      user: ticket.users?.name || 'Unknown User',
      userName: ticket.users?.name || 'Unknown User',
      userRole: ticket.user_role || 'user',
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      category: ticket.category || undefined,
      date: ticket.created_at,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      assignedTo: ticket.assigned_to || undefined,
      assignedToName: ticket.assigned?.name || undefined,
      resolvedAt: ticket.resolved_at || undefined,
      messages: [], // Messages will be loaded separately if needed
    }));

    return {
      tickets,
      total: count || 0,
    };
  } catch (error) {
    console.error('Error in fetchSupportTickets:', error);
    throw error;
  }
}

/**
 * Fetch a single ticket with its messages
 */
export async function fetchTicketById(ticketId: string): Promise<SupportTicket | null> {
  try {
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        id,
        user_id,
        user_role,
        subject,
        description,
        priority,
        status,
        category,
        assigned_to,
        resolved_at,
        created_at,
        updated_at,
        users!support_tickets_user_id_fkey (
          name
        ),
        assigned:users!support_tickets_assigned_to_fkey (
          name
        )
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error('Error fetching ticket:', ticketError);
      return null;
    }

    // Fetch ticket messages
    const { data: messages, error: messagesError } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching ticket messages:', messagesError);
    }

    return {
      id: ticket.id,
      userId: ticket.user_id,
      user: ticket.users?.name || 'Unknown User',
      userName: ticket.users?.name || 'Unknown User',
      userRole: ticket.user_role || 'user',
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      category: ticket.category || undefined,
      date: ticket.created_at,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      assignedTo: ticket.assigned_to || undefined,
      assignedToName: ticket.assigned?.name || undefined,
      resolvedAt: ticket.resolved_at || undefined,
      messages: (messages || []).map((msg: any) => ({
        id: msg.id,
        ticketId: msg.ticket_id,
        from: msg.user_name || 'Unknown',
        userId: msg.user_id,
        userName: msg.user_name || 'Unknown',
        userRole: msg.user_role || 'user',
        message: msg.message,
        timestamp: msg.created_at,
        createdAt: msg.created_at,
        isInternal: msg.is_internal || false,
        attachments: msg.attachments || [],
      })),
    };
  } catch (error) {
    console.error('Error in fetchTicketById:', error);
    throw error;
  }
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
): Promise<void> {
  try {
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateTicketStatus:', error);
    throw error;
  }
}

/**
 * Assign ticket to an admin
 */
export async function assignTicket(ticketId: string, adminId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to: adminId,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) {
      console.error('Error assigning ticket:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in assignTicket:', error);
    throw error;
  }
}

/**
 * Add a message to a ticket
 */
export async function addTicketMessage(
  ticketId: string,
  userId: string,
  userName: string,
  userRole: string,
  message: string,
  attachments?: string[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        message,
        attachments: attachments || [],
      });

    if (error) {
      console.error('Error adding ticket message:', error);
      throw error;
    }

    // Update ticket's updated_at timestamp
    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);
  } catch (error) {
    console.error('Error in addTicketMessage:', error);
    throw error;
  }
}

/**
 * Get ticket statistics
 */
export async function getTicketStats(): Promise<{
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}> {
  try {
    const { count: total } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true });

    const { count: open } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    const { count: inProgress } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    const { count: resolved } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved');

    const { count: closed } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'closed');

    return {
      total: total || 0,
      open: open || 0,
      inProgress: inProgress || 0,
      resolved: resolved || 0,
      closed: closed || 0,
    };
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    throw error;
  }
}
