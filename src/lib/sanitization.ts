/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Input Sanitization and Validation Utilities
 * Provides functions to sanitize and validate user input to prevent security vulnerabilities
 */

/**
 * Sanitize string input to prevent XSS attacks
 * Removes or escapes potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  let sanitized = input.trim();
  
  // Remove angle brackets
  sanitized = sanitized.replace(/[<>]/g, '');
  
  // Remove dangerous protocols (multiple passes to catch nested attempts)
  for (let i = 0; i < 3; i++) {
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
  }
  
  // Remove event handlers - multiple passes to catch all patterns
  // This handles onclick, onload, onerror, etc.
  for (let i = 0; i < 3; i++) {
    sanitized = sanitized.replace(/\bon\w+\s*=/gi, '');
  }
  
  return sanitized;
}

/**
 * Escape and sanitize text content for display
 * Prevents XSS by escaping HTML entities
 * Note: Only works in browser environment
 */
export function sanitizeHTML(input: string): string {
  if (!input) return '';
  
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // Fallback for server-side: manual HTML entity escaping
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  // Browser environment: use DOM for escaping
  const temp = document.createElement('div');
  temp.textContent = input;
  return temp.innerHTML;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate and sanitize URL
 */
export function sanitizeURL(url: string): string | null {
  if (!url) return null;
  
  // First check for dangerous protocols before parsing
  const lowerUrl = url.toLowerCase().trim();
  const dangerousPatterns = [
    /^javascript:/i,
    /^data:/i,
    /^vbscript:/i,
    /^file:/i,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(lowerUrl)) {
      return null;
    }
  }
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    const allowedProtocols = ['http:', 'https:'];
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate numeric input
 */
export function isValidNumber(value: any, min?: number, max?: number): boolean {
  const num = Number(value);
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
}

/**
 * Sanitize and validate currency amount
 */
export function sanitizeCurrency(amount: any): number | null {
  const num = Number(amount);
  if (isNaN(num) || num < 0) return null;
  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
}

/**
 * Validate date string
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Sanitize object for database insertion
 * Removes undefined values and trims strings
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Validate array length
 */
export function isValidArrayLength(arr: any[], min?: number, max?: number): boolean {
  if (!Array.isArray(arr)) return false;
  if (min !== undefined && arr.length < min) return false;
  if (max !== undefined && arr.length > max) return false;
  return true;
}

/**
 * Rate limiting helper - tracks API calls per user
 */
class RateLimiter {
  private calls: Map<string, number[]> = new Map();
  
  /**
   * Check if user has exceeded rate limit
   * @param userId User identifier
   * @param limit Maximum number of calls
   * @param windowMs Time window in milliseconds
   */
  checkLimit(userId: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const userCalls = this.calls.get(userId) || [];
    
    // Remove calls outside the time window
    const recentCalls = userCalls.filter(time => now - time < windowMs);
    
    if (recentCalls.length >= limit) {
      return false; // Rate limit exceeded
    }
    
    // Add current call
    recentCalls.push(now);
    this.calls.set(userId, recentCalls);
    
    return true; // Within limit
  }
  
  /**
   * Clear rate limit data for a user
   */
  clear(userId: string): void {
    this.calls.delete(userId);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Validate file upload
 */
export function validateFile(
  file: File,
  options: {
    maxSizeBytes?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSizeBytes = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
  } = options;
  
  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeBytes / (1024 * 1024)}MB limit`
    };
  }
  
  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`
    };
  }
  
  // Check file extension
  const nameParts = file.name.split('.');
  const extension = nameParts.length > 1 
    ? '.' + nameParts[nameParts.length - 1].toLowerCase() 
    : '';
  
  if (allowedExtensions.length > 0 && extension && !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed`
    };
  }
  
  return { valid: true };
}

/**
 * Note: This function is deprecated and should not be used.
 * Supabase uses prepared statements which prevent SQL injection.
 * This function is kept for reference only.
 * 
 * @deprecated Use Supabase's built-in prepared statements instead
 */
export function escapeSQLString(str: string): string {
  if (!str) return '';
  // This is NOT comprehensive SQL escaping - use prepared statements instead
  return str.replace(/'/g, "''");
}

/**
 * Validate enum value
 */
export function isValidEnum<T extends string>(
  value: string,
  enumValues: readonly T[]
): value is T {
  return enumValues.includes(value as T);
}
