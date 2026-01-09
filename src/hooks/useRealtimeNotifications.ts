/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';

interface WebSocketMessage {
  type: 'notification' | 'payment' | 'maintenance' | 'message';
  data: any;
}

/**
 * Hook for real-time notifications using WebSocket
 * Falls back to polling if WebSocket is not available
 */
export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connectWebSocket = useCallback(() => {
    if (!user) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts.current = 0;

        // Authenticate the WebSocket connection
        ws.send(JSON.stringify({
          type: 'auth',
          token: getAuthToken(),
          userId: user.id,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'notification':
              addNotification({
                userId: user.id,
                title: message.data.title,
                message: message.data.message,
                type: message.data.type || 'info',
                actionUrl: message.data.actionUrl,
              });
              break;

            case 'payment':
              addNotification({
                userId: user.id,
                title: 'Payment Update',
                message: message.data.message,
                type: 'success',
                actionUrl: '/payments',
              });
              break;

            case 'maintenance':
              addNotification({
                userId: user.id,
                title: 'Maintenance Update',
                message: message.data.message,
                type: 'info',
                actionUrl: message.data.requestUrl,
              });
              break;

            default:
              // Unknown message type - ignore
              break;
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        } else {
          // Max reconnection attempts reached, fallback to polling
          startPolling();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      startPolling();
    }
  }, [user, addNotification]);

  const startPolling = useCallback(() => {
    if (!user) return;

    // Fallback to polling every 30 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/notifications/poll`, {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
          },
        });

        if (response.ok) {
          const notifications = await response.json();
          notifications.forEach((notif: any) => {
            addNotification({
              userId: user.id,
              title: notif.title,
              message: notif.message,
              type: notif.type,
              actionUrl: notif.actionUrl,
            });
          });
        }
      } catch (error) {
        console.error('Error polling notifications:', error);
      }
    }, 30000); // Poll every 30 seconds

    return pollInterval;
  }, [user, addNotification]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Try WebSocket first
      connectWebSocket();
    }

    return () => {
      disconnect();
    };
  }, [user, connectWebSocket, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    disconnect,
  };
};

/**
 * Get auth token from localStorage
 */
const getAuthToken = (): string | null => {
  try {
    const stored = localStorage.getItem('rentflow_auth');
    if (stored) {
      const { token } = JSON.parse(stored);
      return token;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return null;
};

/**
 * Hook for sending real-time messages
 */
export const useRealtimeMessaging = () => {
  const sendMessage = useCallback(async (recipientId: string, message: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          recipientId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, []);

  return { sendMessage };
};
