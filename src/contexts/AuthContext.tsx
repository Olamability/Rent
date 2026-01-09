// src/contexts/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { User, UserRole } from '@/types';
import { VALID_USER_ROLES } from '@/types';
import { calculateProfileCompleteness } from '@/lib/profileUtils';
import { syncUserProfile } from '@/services/profileSyncService';
import { updateLastLogin } from '@/services/userService';
import { 
  initializeCSRFToken, 
  clearCSRFToken, 
  checkRateLimit, 
  clearRateLimit,
  shouldRefreshSession,
  isSessionValid,
  getCSRFToken,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_WINDOW_MS
} from '@/lib/authSecurity';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, selectedRole?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role: UserRole
  ) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  getProfileCompleteness: () => number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'rentflow_auth';

// ✅ Configuration constants
const PROFILE_SYNC_TIMEOUT_MS = 15000; // 15 seconds
const KNOWN_AUTH_KEYS = [
  'rentflow_auth',
  'rentflow_supabase_auth',
  'csrf_token',
  'profile_redirect_done'
];

// ✅ Utility to clear all auth-related storage
const clearAllAuthStorage = () => {
  try {
    // Clear custom auth storage
    localStorage.removeItem(AUTH_STORAGE_KEY);
    
    // ✅ Clear only specific auth-related session storage keys
    KNOWN_AUTH_KEYS.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    // ✅ Clear profile redirect keys separately (more efficient O(n) vs O(n*m))
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('profile_redirect_done_'))
      .forEach(k => sessionStorage.removeItem(k));
    
    // Clear CSRF token
    clearCSRFToken();
    
    // Clear Supabase auth storage (using the custom key we set)
    localStorage.removeItem('rentflow_supabase_auth');
    
    // ✅ Also clear known Supabase default keys with safe URL parsing
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl && typeof supabaseUrl === 'string') {
        const urlParts = supabaseUrl.split('//');
        if (urlParts.length > 1) {
          const domain = urlParts[1]?.split('.')[0];
          if (domain) {
            localStorage.removeItem(`sb-${domain}-auth-token`);
          }
        }
      }
    } catch (urlError) {
      console.warn('[AuthContext] Could not parse Supabase URL for cleanup:', urlError);
    }
    
    // Also remove common default keys
    const knownSupabaseKeys = [
      'sb-auth-token',
      'supabase.auth.token',
    ];
    knownSupabaseKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('[AuthContext] All auth storage cleared');
  } catch (error) {
    console.error('[AuthContext] Error clearing auth storage:', error);
  }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to fetch user role and basic data from database
  const fetchUserRoleFromDatabase = async (userId: string, baseUser: User) => {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, account_status, phone')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Failed to fetch user role from database:', userError);
      // Check if user doesn't exist in database
      if (userError.code === 'PGRST116') {
        throw new Error('User account not found in database. Please contact support.');
      }
      throw new Error('Failed to verify user role. Please try logging in again.');
    }
    
    if (!userData) {
      throw new Error('User data not found in database. Please contact support.');
    }
    
    // Validate role is a valid UserRole value
    if (userData.role && VALID_USER_ROLES.includes(userData.role as UserRole)) {
      baseUser.role = userData.role as UserRole;
    } else {
      console.error('Invalid role in database:', userData.role);
      throw new Error('Invalid user role in database. Please contact support.');
    }
    
    if (userData.account_status) {
      baseUser.accountStatus = userData.account_status;
    }
    if (userData.phone) {
      baseUser.phone = userData.phone;
    }
  };

  // Build user object from Supabase session
  const buildUserFromSession = async (sessionUser: { 
    id: string; 
    email?: string; 
    created_at: string; 
    email_confirmed_at?: string; 
    user_metadata?: { name?: string; role?: string }; 
  }): Promise<User> => {
    // ✅ SECURITY: Role is ALWAYS fetched from database
    // Use role from user_metadata as fallback (set during registration)
    const fallbackRole = (sessionUser.user_metadata?.role as UserRole) || 'tenant';

    const baseUser: User = {
      id: sessionUser.id,
      email: sessionUser.email ?? '',
      name: sessionUser.user_metadata?.name ?? '',
      role: fallbackRole,
      createdAt: new Date(sessionUser.created_at),
      isVerified: !!sessionUser.email_confirmed_at,
      profileCompleteness: 0,
      profileComplete: false,
    };

    // ✅ MUST sync profile from database - role is the source of truth
    try {
      // ✅ Log user info without exposing sensitive IDs in production
      const isDev = import.meta.env.DEV;
      if (isDev) {
        console.log('[AuthContext] Starting profile sync for user:', sessionUser.id);
      } else {
        console.log('[AuthContext] Starting profile sync for user');
      }
      
      // Create a timeout promise that rejects after configured timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile sync timeout')), PROFILE_SYNC_TIMEOUT_MS);
      });
      
      // Race between profile sync and timeout
      const updates = await Promise.race([
        syncUserProfile(baseUser),
        timeoutPromise
      ]);
      
      if (updates && Object.keys(updates).length > 0) {
        console.log('[AuthContext] Profile sync updates received:', Object.keys(updates));
        
        // ✅ Database role ALWAYS overrides fallback role
        if (updates.role) {
          baseUser.role = updates.role;
          console.log('[AuthContext] Role updated from database:', baseUser.role);
          
          // Refresh the session to update JWT with correct role for future logins
          // This is async and non-blocking
          supabase.auth.refreshSession().catch((err) => {
            console.error('[AuthContext] Failed to refresh session after role sync:', err);
          });
        }
        
        // Apply other updates
        Object.assign(baseUser, updates);
        
        // Recalculate profile completeness
        baseUser.profileCompleteness = calculateProfileCompleteness(baseUser);
        baseUser.profileComplete = baseUser.profileCompleteness >= 100;
      } else {
        // If no updates received, fetch role directly from database as critical fallback
        // Note: This is different from syncUserProfile failure - this handles the case where
        // syncUserProfile returns successfully but with empty updates (no role change).
        // This is a safety net to ensure we always have the correct role from the database.
        console.warn('[AuthContext] No updates from syncUserProfile, fetching role directly...');
        await fetchUserRoleFromDatabase(sessionUser.id, baseUser);
        console.log('[AuthContext] Role fetched directly:', baseUser.role);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Profile sync timeout') {
          console.warn(`[AuthContext] Profile sync timed out after ${PROFILE_SYNC_TIMEOUT_MS}ms, attempting direct role fetch...`);
          // Attempt to fetch role directly from database as a fallback
          try {
            await fetchUserRoleFromDatabase(sessionUser.id, baseUser);
            // Successfully recovered from timeout
            console.info('[AuthContext] Successfully fetched role after timeout:', baseUser.role);
          } catch (fallbackError) {
            console.error('[AuthContext] Fallback role fetch also failed:', fallbackError);
            // If fallback also fails, re-throw the error from the helper function
            throw fallbackError;
          }
        } else {
          console.error('[AuthContext] Profile sync error:', error.message);
          // For non-timeout errors, re-throw
          throw error;
        }
      } else {
        console.error('[AuthContext] Unknown profile sync error:', error);
        throw error;
      }
    }

    console.log('[AuthContext] User profile built successfully:', baseUser.email, baseUser.role);
    return baseUser;
  };

  // Initial session load
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        console.log('[AuthContext] Initializing session...');
        
        // ✅ Get session from Supabase (checks localStorage automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthContext] Session error:', sessionError);
          throw sessionError;
        }

        if (session?.user && isMounted) {
          // ✅ Validate session expiry
          const expiresAt = session.expires_at || 0;
          if (!isSessionValid(expiresAt)) {
            console.warn('[AuthContext] Session expired, clearing auth state');
            setUser(null);
            clearAllAuthStorage();
            await supabase.auth.signOut();
            return;
          }

          // ✅ Check if session should be refreshed
          if (shouldRefreshSession(expiresAt)) {
            console.log('[AuthContext] Session expiring soon, refreshing...');
            try {
              await supabase.auth.refreshSession();
            } catch (refreshError) {
              console.error('[AuthContext] Failed to refresh session:', refreshError);
              // Continue with existing session
            }
          }

          console.log('[AuthContext] Session found, building user profile...');
          const userData = await buildUserFromSession(session.user);
          setUser(userData);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: userData }));
          
          // ✅ Initialize CSRF token if not present (using utility function)
          if (!getCSRFToken()) {
            initializeCSRFToken();
          }
          
          console.log('[AuthContext] User logged in:', userData.email, userData.role);
        } else if (isMounted) {
          console.log('[AuthContext] No active session found');
          setUser(null);
          clearAllAuthStorage();
        }
      } catch (error) {
        console.error('[AuthContext] Session initialization error:', error);
        if (isMounted) {
          // ✅ Clear all auth state on initialization error
          setUser(null);
          clearAllAuthStorage();
          
          // ✅ Try to sign out to clear any invalid session
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.error('[AuthContext] Error signing out after init failure:', signOutError);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    init();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('[AuthContext] Auth state change:', event, session ? 'Session exists' : 'No session');

        // ✅ Handle SIGNED_OUT - clear everything
        if (event === 'SIGNED_OUT') {
          setUser(null);
          clearAllAuthStorage();
          return;
        }

        // ✅ Handle SIGNED_IN - but only if we don't already have a user AND we're not loading
        // This prevents duplicate profile syncs and race conditions
        // isLoading check prevents race conditions during ongoing operations
        if (event === 'SIGNED_IN' && session?.user && !user && !isLoading) {
          try {
            setIsLoading(true); // Lock to prevent concurrent syncs
            const userData = await buildUserFromSession(session.user);
            setUser(userData);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: userData }));
          } catch (error) {
            console.error('[AuthContext] Failed to build user from session:', error);
            // On error, clear auth state to prevent stuck state
            setUser(null);
            clearAllAuthStorage();
          } finally {
            setIsLoading(false);
          }
          return;
        }

        // ✅ Handle TOKEN_REFRESHED - silently update, don't rebuild profile
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('[AuthContext] Token refreshed successfully');
          // Don't rebuild profile, just log success
          return;
        }

        // ✅ Handle USER_UPDATED - rebuild profile as user data changed
        if (event === 'USER_UPDATED' && session?.user) {
          try {
            const userData = await buildUserFromSession(session.user);
            setUser(userData);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: userData }));
          } catch (error) {
            console.error('[AuthContext] Failed to handle user update:', error);
          }
          return;
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);


  // Login function - ONLY authenticate, no role validation or redirects
  const login = async (email: string, password: string, selectedRole?: UserRole) => {
    setIsLoading(true);
    
    try {
      console.log('[AuthContext] Login attempt for:', email, 'as role:', selectedRole);
      
      // ✅ Rate limiting - prevent brute force attacks
      const rateLimitKey = `login_${email}`;
      if (!checkRateLimit(rateLimitKey, DEFAULT_MAX_ATTEMPTS, DEFAULT_WINDOW_MS)) {
        throw new Error('Too many login attempts. Please try again in 15 minutes.');
      }
      
      // ✅ REMOVED signOut() - it was causing login to fail by immediately clearing the session
      // Supabase automatically handles switching between sessions when signInWithPassword is called
      
      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('[AuthContext] Login error:', error);
        throw error;
      }
      if (!data.user || !data.session) {
        throw new Error('Invalid credentials');
      }

      console.log('[AuthContext] Authentication successful, building user profile...');

      // Build user object from session
      const userData = await buildUserFromSession(data.user);
      
      console.log('[AuthContext] User profile built:', userData.email, userData.role, 'Status:', userData.accountStatus);
      
      // Validate account status before allowing login
      // ✅ CHANGED: Allow 'pending' users to login (they need to complete profile first)
      // Block only suspended and banned users
      if (userData.accountStatus === 'suspended') {
        await supabase.auth.signOut();
        throw new Error('Your account has been suspended. Please contact support for more information.');
      }
      
      if (userData.accountStatus === 'banned') {
        await supabase.auth.signOut();
        throw new Error('Your account has been banned. Please contact support if you believe this is an error.');
      }
      
      // Validate role if specified
      if (selectedRole && userData.role !== selectedRole) {
        // Sign out and throw error with correct role
        await supabase.auth.signOut();
        const err = new Error(
          `You are registered as ${userData.role}, not ${selectedRole}.`
        ) as Error & { correctRole: UserRole };
        err.correctRole = userData.role;
        throw err;
      }

      // ✅ Initialize CSRF token for this session
      const csrfToken = initializeCSRFToken();
      console.log('[AuthContext] CSRF token initialized');

      // ✅ Clear rate limit on successful login
      clearRateLimit(`login_${email}`);

      // Set user in state (this will trigger redirect in Login page)
      setUser(userData);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: userData }));
      
      console.log('[AuthContext] Login complete, user state set');
      
      // Update last login in background
      updateLastLogin(userData.id).catch((err) => {
        console.warn('[AuthContext] Failed to update last login:', err);
      });
      
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      // Make sure user is cleared on any error
      setUser(null);
      clearAllAuthStorage();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function - sends role to database trigger for proper profile creation
  const register = async (
    email: string,
    password: string,
    name: string,
    role: UserRole  // Role is sent to database trigger which handles profile creation
  ) => {
    setIsLoading(true);

    // ✅ Send role to database trigger - it will create the appropriate profile
    // For tenant/landlord: role is set directly
    // For admin/super_admin: admin_code must be provided and will override this
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }  // Database trigger uses this to create correct profile type
      },
    });

    setIsLoading(false);

    if (error) throw error;
  };

  // Logout function
  const logout = async () => {
    try {
      console.log('[AuthContext] Logout initiated');
      setIsLoading(true);
      
      // Step 1: Sign out from Supabase first
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AuthContext] Logout error from Supabase:', error);
        // Continue anyway - we'll clear local state
      }
      
      // Step 2: Clear local state after Supabase logout
      setUser(null);
      clearAllAuthStorage();
      
      console.log('[AuthContext] Logout complete, navigating to login');
      
      // Step 3: Navigate to login (this triggers the onAuthStateChange SIGNED_OUT event)
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      // Even if signOut fails, ensure local state is cleared
      setUser(null);
      clearAllAuthStorage();
      navigate('/login', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  // Update user object
  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    updated.profileCompleteness = calculateProfileCompleteness(updated);
    updated.profileComplete = updated.profileCompleteness >= 100;
    setUser(updated);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: updated }));
  };

  // Return profile completeness
  const getProfileCompleteness = () =>
    user ? calculateProfileCompleteness(user) : 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
        updateUser,
        getProfileCompleteness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};