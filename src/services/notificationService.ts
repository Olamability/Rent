// Service for managing notifications
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

/**
 * Fetch notifications for a user
 */
export async function fetchNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(notification => ({
      id: notification.id,
      userId: notification.user_id,
      title: notification.title,
      message: notification.message,
      type: notification.notification_type as 'info' | 'warning' | 'success' | 'error',
      isRead: notification.is_read,
      actionUrl: notification.action_url,
      createdAt: notification.created_at,
    }));
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    throw error;
  }
}

/**
 * Fetch unread notifications count
 */
export async function fetchUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread notifications count:', error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Failed to fetch unread notifications count:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

/**
 * Get the most recent unread notification for display in dashboard alerts
 */
export async function fetchLatestAlert(userId: string): Promise<Notification | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .in('notification_type', ['warning', 'error'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest alert:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      message: data.message,
      type: data.notification_type as 'info' | 'warning' | 'success' | 'error',
      isRead: data.is_read,
      actionUrl: data.action_url,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Failed to fetch latest alert:', error);
    return null;
  }
}

/**
 * Create a new notification for a user
 */
export async function createNotification(notification: {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  actionUrl?: string;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        title: notification.title,
        message: notification.message,
        notification_type: notification.type,
        action_url: notification.actionUrl,
        is_read: false,
      });

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}
