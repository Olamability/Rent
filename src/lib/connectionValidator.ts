// Connection validator to check Supabase connectivity on app initialization
import { supabase } from './supabase';

export interface ConnectionStatus {
  isConnected: boolean;
  error?: string;
  latency?: number;
}

/**
 * Checks if an error message indicates a network connectivity issue
 */
export function isNetworkError(errorMessage: string): boolean {
  const lowerMessage = errorMessage.toLowerCase();
  return (
    lowerMessage.includes('connection timeout') ||
    lowerMessage.includes('network request failed') ||
    lowerMessage.includes('failed to fetch')
  );
}

/**
 * Validates connection to Supabase by making a simple database query
 * This ensures we're actually reaching the Supabase backend using the same fetch mechanism as other queries
 */
export async function validateSupabaseConnection(): Promise<ConnectionStatus> {
  const startTime = Date.now();
  
  try {
    // Make a lightweight RPC call to test connectivity
    // This uses the custom fetch wrapper with retry logic, just like other database queries
    // The RPC may not exist, but we only care about network connectivity, not the function itself
    const { error } = await supabase.rpc('ping');
    
    const latency = Date.now() - startTime;
    
    // Check if the error is a network/connection error
    if (error) {
      const errorMessage = error.message;
      // Network errors from custom fetch wrapper
      if (isNetworkError(errorMessage)) {
        return {
          isConnected: false,
          error: errorMessage,
          latency,
        };
      }
      // Function doesn't exist error means we CAN connect, but the RPC doesn't exist
      // This still counts as a successful connection test
      if (errorMessage.includes('function') && 
          (errorMessage.includes('does not exist') || errorMessage.includes('not found'))) {
        return {
          isConnected: true,
          latency,
        };
      }
      // Permission/schema errors mean we CAN connect, but have access issues
      if (errorMessage.includes('permission denied') || errorMessage.includes('relation')) {
        return {
          isConnected: true,
          latency,
        };
      }
      // Other errors - count as connection issues to be safe
      return {
        isConnected: false,
        error: errorMessage,
        latency,
      };
    }
    
    return {
      isConnected: true,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('❌ Failed to connect to Supabase:', errorMessage);
    return {
      isConnected: false,
      error: errorMessage,
      latency,
    };
  }
}

/**
 * Displays a user-friendly connection error message
 */
export function getConnectionErrorMessage(status: ConnectionStatus): string {
  if (!status.error) {
    return 'Unable to connect to the server.';
  }
  
  const error = status.error.toLowerCase();
  
  if (error.includes('fetch') || error.includes('network')) {
    return 'Network error detected. Please try again.';
  }
  
  if (error.includes('cors')) {
    return 'Connection blocked by browser security. Please ensure the app is properly configured.';
  }
  
  if (error.includes('timeout') || error.includes('abort')) {
    return 'Connection timeout. Please try again.';
  }
  
  return `Connection error: ${status.error}`;
}
