import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely converts a string value to a number with validation
 * Returns undefined if the value is empty, invalid, or results in NaN
 * This is useful for form inputs where empty strings are common
 * 
 * @param value - The string value to convert
 * @param options - Optional configuration
 * @param options.allowZero - Whether to allow 0 as a valid value (default: true)
 * @param options.allowNegative - Whether to allow negative numbers (default: false)
 * @returns The parsed number or undefined if invalid
 * 
 * @example
 * safeParseFloat("123.45") // 123.45
 * safeParseFloat("") // undefined
 * safeParseFloat("abc") // undefined
 * safeParseFloat("0", { allowZero: false }) // undefined
 * safeParseFloat("-5", { allowNegative: true }) // -5
 */
export function safeParseFloat(
  value: string, 
  options: { allowZero?: boolean; allowNegative?: boolean } = {}
): number | undefined {
  const { allowZero = true, allowNegative = false } = options;
  
  // Return undefined for empty or whitespace-only strings
  if (!value || value.trim() === '') {
    return undefined;
  }
  
  const parsed = parseFloat(value);
  
  // Check if parsing resulted in NaN
  if (isNaN(parsed)) {
    return undefined;
  }
  
  // Check if zero is allowed
  if (!allowZero && parsed === 0) {
    return undefined;
  }
  
  // Check if negative is allowed
  if (!allowNegative && parsed < 0) {
    return undefined;
  }
  
  return parsed;
}

/**
 * Safely converts a string value to an integer with validation
 * Returns undefined if the value is empty, invalid, or results in NaN
 * 
 * @param value - The string value to convert
 * @param options - Optional configuration
 * @param options.allowZero - Whether to allow 0 as a valid value (default: true)
 * @param options.allowNegative - Whether to allow negative numbers (default: false)
 * @returns The parsed integer or undefined if invalid
 * 
 * @example
 * safeParseInt("123") // 123
 * safeParseInt("") // undefined
 * safeParseInt("abc") // undefined
 * safeParseInt("0", { allowZero: false }) // undefined
 */
export function safeParseInt(
  value: string, 
  options: { allowZero?: boolean; allowNegative?: boolean } = {}
): number | undefined {
  const { allowZero = true, allowNegative = false } = options;
  
  // Return undefined for empty or whitespace-only strings
  if (!value || value.trim() === '') {
    return undefined;
  }
  
  const parsed = parseInt(value, 10);
  
  // Check if parsing resulted in NaN
  if (isNaN(parsed)) {
    return undefined;
  }
  
  // Check if zero is allowed
  if (!allowZero && parsed === 0) {
    return undefined;
  }
  
  // Check if negative is allowed
  if (!allowNegative && parsed < 0) {
    return undefined;
  }
  
  return parsed;
}

/**
 * Format a number as Nigerian Naira currency
 * @param amount - The amount to format
 * @returns Formatted string with ₦ symbol
 * 
 * @example
 * formatCurrency(1000) // "₦1,000"
 * formatCurrency(1500.50) // "₦1,500.50"
 */
export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}
