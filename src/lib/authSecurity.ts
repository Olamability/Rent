// Authentication Security Utilities
// Provides CSRF protection, session validation, and security headers

/**
 * Generate a CSRF token for form submissions
 * Uses crypto.randomUUID() for secure random token generation
 */
export function generateCSRFToken(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  
  // ✅ For older browsers, use crypto.getRandomValues with safe base64 encoding
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const array = new Uint8Array(32); // 32 bytes = 256 bits of entropy
    window.crypto.getRandomValues(array);
    
    // ✅ Safe base64 encoding that works with large arrays
    let base64 = '';
    const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, Math.min(i + chunkSize, array.length));
      base64 += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return `csrf-${btoa(base64)}`;
  }
  
  // ✅ If no crypto available, throw error instead of using weak fallback
  throw new Error('Secure random number generator not available. Cannot generate CSRF token.');
}

/**
 * Store CSRF token in sessionStorage
 * Each tab gets its own CSRF token
 */
export function storeCSRFToken(token: string): void {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.setItem('csrf_token', token);
  }
}

/**
 * Retrieve CSRF token from sessionStorage
 */
export function getCSRFToken(): string | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return sessionStorage.getItem('csrf_token');
  }
  return null;
}

/**
 * Validate CSRF token matches stored token
 */
export function validateCSRFToken(token: string): boolean {
  const storedToken = getCSRFToken();
  return storedToken !== null && storedToken === token;
}

/**
 * Initialize CSRF token for a new session
 * Should be called on login or app initialization
 */
export function initializeCSRFToken(): string {
  const token = generateCSRFToken();
  storeCSRFToken(token);
  return token;
}

/**
 * Clear CSRF token on logout
 */
export function clearCSRFToken(): void {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.removeItem('csrf_token');
  }
}

/**
 * Add security headers to fetch requests
 */
export function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  };

  // Add CSRF token if available
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  return headers;
}

/**
 * Validate session expiry
 * Returns true if session is still valid, false if expired
 */
export function isSessionValid(expiresAt: number): boolean {
  const now = Date.now() / 1000; // Convert to seconds
  const bufferTime = 60; // 60 second buffer before expiry
  return expiresAt > (now + bufferTime);
}

/**
 * Calculate time until session expires
 * Returns time in seconds, or 0 if already expired
 */
export function getSessionTimeRemaining(expiresAt: number): number {
  const now = Date.now() / 1000;
  const remaining = expiresAt - now;
  return Math.max(0, remaining);
}

// Configuration constants
const SESSION_REFRESH_THRESHOLD_SECONDS = 5 * 60; // 5 minutes
export const DEFAULT_MAX_ATTEMPTS = 5; // Default rate limit attempts
export const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // Default rate limit window (15 minutes)

// ✅ Type definition for rate limit data
interface RateLimitData {
  attempts: number[];
  firstAttempt: number;
}

/**
 * Check if we should refresh the session
 * Refresh if less than 5 minutes remaining
 */
export function shouldRefreshSession(expiresAt: number): boolean {
  const timeRemaining = getSessionTimeRemaining(expiresAt);
  return timeRemaining > 0 && timeRemaining < SESSION_REFRESH_THRESHOLD_SECONDS;
}

/**
 * Sanitize user input to prevent XSS attacks
 * Basic sanitization - for display only, not for storage
 */
export function sanitizeForDisplay(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate redirect URLs to prevent open redirect vulnerabilities
 * Only allows relative URLs or same-origin URLs with safe paths
 */
export function isValidRedirectUrl(url: string): boolean {
  try {
    // Allow relative URLs (starts with /)
    if (url.startsWith('/')) {
      // Prevent protocol-relative URLs
      if (url.startsWith('//')) return false;
      
      // ✅ Validate path doesn't contain suspicious patterns
      const dangerousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /<script/i,
      ];
      if (dangerousPatterns.some(pattern => pattern.test(url))) {
        return false;
      }
      
      return true;
    }

    // For absolute URLs, check if same origin
    const targetUrl = new URL(url);
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    
    if (targetUrl.origin !== currentOrigin) {
      return false;
    }
    
    // ✅ Additional validation for same-origin URLs
    // Prevent redirects to potentially dangerous endpoints
    const dangerousPaths = [
      '/api/admin',
      '/admin/delete',
      '/admin/reset',
    ];
    if (dangerousPaths.some(path => targetUrl.pathname.startsWith(path))) {
      return false;
    }
    
    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Rate limiting check for sensitive operations
 * Returns true if operation should be allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return true; // Allow if storage not available
  }

  const storageKey = `rate_limit_${key}`;
  const now = Date.now();
  
  try {
    const stored = localStorage.getItem(storageKey);
    
    // ✅ Validate parsed data structure with proper typing
    let data: RateLimitData;
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // ✅ Validate structure matches interface
        if (typeof parsed === 'object' && 
            Array.isArray(parsed.attempts) && 
            typeof parsed.firstAttempt === 'number') {
          data = parsed as RateLimitData;
        } else {
          // Invalid structure, reset
          data = { attempts: [], firstAttempt: now };
        }
      } catch (parseError) {
        // ✅ Malformed JSON, reset
        console.warn('Rate limit data corrupted, resetting:', parseError);
        data = { attempts: [], firstAttempt: now };
      }
    } else {
      data = { attempts: [], firstAttempt: now };
    }
    
    // ✅ Filter with type-safe validation
    data.attempts = data.attempts.filter((timestamp: number) => 
      typeof timestamp === 'number' && !isNaN(timestamp) && now - timestamp < windowMs
    );
    
    // Check if rate limited
    if (data.attempts.length >= maxAttempts) {
      return false;
    }
    
    // Record this attempt
    data.attempts.push(now);
    localStorage.setItem(storageKey, JSON.stringify(data));
    
    return true;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Allow on error
  }
}

/**
 * Clear rate limit data for a key
 */
export function clearRateLimit(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storageKey = `rate_limit_${key}`;
    localStorage.removeItem(storageKey);
  }
}
