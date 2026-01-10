/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Error Handling Utilities
 * Provides standardized error handling and logging for the application
 */

/**
 * Standard error codes for the application
 */
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Database errors
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Business logic errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Application error class with additional context
 */
export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: any;
  isOperational: boolean;
  
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where our error was thrown
    // Error.captureStackTrace is not available in all environments (e.g., Safari/WebKit)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Parse Supabase errors into AppError
 */
export function parseSupabaseError(error: any): AppError {
  // Handle PostgreSQL error codes
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique constraint violation
        return new AppError(
          'This record already exists',
          ErrorCode.DUPLICATE_ENTRY,
          409,
          error
        );
      
      case '23503': // Foreign key constraint violation
        return new AppError(
          'Referenced record does not exist',
          ErrorCode.CONSTRAINT_VIOLATION,
          400,
          error
        );
      
      case '42703': // Column does not exist
        return new AppError(
          'Invalid field in query - please contact support',
          ErrorCode.DATABASE_ERROR,
          500,
          error
        );
      
      case 'PGRST200': // Foreign key relationship not found
        return new AppError(
          'Database relationship error - please contact support',
          ErrorCode.DATABASE_ERROR,
          500,
          error
        );
      
      case '22P02': // Invalid text representation
        return new AppError(
          'Invalid data format',
          ErrorCode.INVALID_FORMAT,
          400,
          error
        );
      
      case '42P01': // Table does not exist
        return new AppError(
          'Database table not found - please contact support',
          ErrorCode.DATABASE_ERROR,
          500,
          error
        );
      
      case 'PGRST116': // No rows returned
        return new AppError(
          'Record not found',
          ErrorCode.NOT_FOUND,
          404,
          error
        );
        
      default:
        return new AppError(
          error.message || 'Database operation failed',
          ErrorCode.DATABASE_ERROR,
          500,
          error
        );
    }
  }
  
  // Handle authentication errors
  if (error.message?.includes('JWT') || error.message?.includes('auth')) {
    return new AppError(
      'Authentication failed',
      ErrorCode.UNAUTHORIZED,
      401,
      error
    );
  }
  
  // Handle network errors
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return new AppError(
      'Network error - please check your connection',
      ErrorCode.NETWORK_ERROR,
      503,
      error
    );
  }
  
  // Default error
  return new AppError(
    error.message || 'An unexpected error occurred',
    ErrorCode.UNKNOWN_ERROR,
    500,
    error
  );
}

/**
 * Log error to console and potentially to external service
 */
export function logError(error: Error | AppError, context?: Record<string, any>): void {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
  };
  
  if (error instanceof AppError) {
    errorInfo['code'] = error.code;
    errorInfo['statusCode'] = error.statusCode;
    errorInfo['details'] = error.details;
    errorInfo['isOperational'] = error.isOperational;
  }
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('Error:', errorInfo);
  }
  
  // In production, you might want to send to an error tracking service
  // e.g., Sentry, LogRocket, etc.
  // if (import.meta.env.PROD) {
  //   sendToErrorTrackingService(errorInfo);
  // }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error | AppError): string {
  if (error instanceof AppError) {
    // Return the message directly for operational errors
    if (error.isOperational) {
      return error.message;
    }
  }
  
  // For unexpected errors, return a generic message
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}

/**
 * Handle async errors in a consistent way
 */
export async function handleAsync<T>(
  promise: Promise<T>,
  errorContext?: string
): Promise<[T | null, AppError | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    const appError = error instanceof AppError 
      ? error 
      : parseSupabaseError(error);
    
    logError(appError, { context: errorContext });
    return [null, appError];
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
  } = options;
  
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry operational errors that won't succeed
      if (error instanceof AppError && error.code !== ErrorCode.NETWORK_ERROR) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, i),
        maxDelayMs
      );
      
      // Don't wait on the last retry
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Validate and throw if validation fails
 */
export function validateOrThrow(
  condition: boolean,
  message: string,
  code: ErrorCode = ErrorCode.INVALID_INPUT
): void {
  if (!condition) {
    throw new AppError(message, code, 400);
  }
}

/**
 * Assert that a value is not null/undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  fieldName: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new AppError(
      `Required field '${fieldName}' is missing`,
      ErrorCode.MISSING_REQUIRED_FIELD,
      400
    );
  }
}
