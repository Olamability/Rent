// Service for managing platform announcements
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetAudience: 'all' | 'landlords' | 'tenants' | 'admins';
  startDate: string;
  endDate?: string;
  active: boolean;
  authorId: string;
  authorIdName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all announcements with optional filters
 */
export async function fetchAnnouncements(
  filters?: {
    active?: boolean;
    targetAudience?: string;
  }
): Promise<PlatformAnnouncement[]> {
  try {
    let query = supabase
      .from('platform_announcements')
      .select(`
        id,
        title,
        content,
        announcement_type,
        target_audience,
        start_date,
        end_date,
        is_active,
        author_id,
        created_at,
        updated_at,
        creator:users!platform_announcements_author_id_fkey (
          name
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.active !== undefined) {
      query = query.eq('is_active', filters.active);
    }
    if (filters?.targetAudience && filters.targetAudience !== 'all') {
      query = query.in('target_audience', ['all', filters.targetAudience]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }

    return (data || []).map((announcement: any) => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.announcement_type,
      targetAudience: announcement.target_audience,
      startDate: announcement.start_date,
      endDate: announcement.end_date || undefined,
      active: announcement.is_active,
      authorId: announcement.author_id,
      authorIdName: announcement.creator?.name || 'Unknown',
      createdAt: announcement.created_at,
      updatedAt: announcement.updated_at,
    }));
  } catch (error) {
    console.error('Error in fetchAnnouncements:', error);
    throw error;
  }
}

/**
 * Fetch active announcements for a specific user role
 */
export async function fetchActiveAnnouncementsForRole(
  role: 'tenant' | 'landlord' | 'admin' | 'super_admin'
): Promise<PlatformAnnouncement[]> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('platform_announcements')
      .select(`
        id,
        title,
        content,
        announcement_type,
        target_audience,
        start_date,
        end_date,
        is_active,
        author_id,
        created_at,
        updated_at
      `)
      .eq('is_active', true)
      .lte('start_date', now)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .in('target_audience', ['all', role === 'tenant' ? 'tenants' : role === 'landlord' ? 'landlords' : 'admins'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active announcements:', error);
      throw error;
    }

    return (data || []).map((announcement: any) => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.announcement_type,
      targetAudience: announcement.target_audience,
      startDate: announcement.start_date,
      endDate: announcement.end_date || undefined,
      active: announcement.is_active,
      authorId: announcement.author_id,
      createdAt: announcement.created_at,
      updatedAt: announcement.updated_at,
    }));
  } catch (error) {
    console.error('Error in fetchActiveAnnouncementsForRole:', error);
    throw error;
  }
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(
  announcement: Omit<PlatformAnnouncement, 'id' | 'createdAt' | 'updatedAt' | 'authorIdName'>,
  userId: string
): Promise<PlatformAnnouncement> {
  try {
    const { data, error } = await supabase
      .from('platform_announcements')
      .insert({
        title: announcement.title,
        content: announcement.content,
        announcement_type: announcement.type,
        target_audience: announcement.targetAudience,
        start_date: announcement.startDate,
        end_date: announcement.endDate || null,
        is_active: announcement.active,
        author_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      type: data.announcement_type,
      targetAudience: data.target_audience,
      startDate: data.start_date,
      endDate: data.end_date || undefined,
      active: data.is_active,
      authorId: data.author_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error in createAnnouncement:', error);
    throw error;
  }
}

/**
 * Update an existing announcement
 */
export async function updateAnnouncement(
  announcementId: string,
  updates: Partial<Omit<PlatformAnnouncement, 'id' | 'authorId' | 'createdAt' | 'updatedAt' | 'authorIdName'>>
): Promise<void> {
  try {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.type !== undefined) updateData.announcement_type = updates.type;
    if (updates.targetAudience !== undefined) updateData.target_audience = updates.targetAudience;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate || null;
    if (updates.active !== undefined) updateData.is_active = updates.active;

    const { error } = await supabase
      .from('platform_announcements')
      .update(updateData)
      .eq('id', announcementId);

    if (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateAnnouncement:', error);
    throw error;
  }
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(announcementId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('platform_announcements')
      .delete()
      .eq('id', announcementId);

    if (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteAnnouncement:', error);
    throw error;
  }
}

/**
 * Toggle announcement active status
 */
export async function toggleAnnouncementStatus(
  announcementId: string,
  active: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('platform_announcements')
      .update({
        is_active: active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', announcementId);

    if (error) {
      console.error('Error toggling announcement status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in toggleAnnouncementStatus:', error);
    throw error;
  }
}
