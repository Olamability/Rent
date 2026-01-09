#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * This script checks if your .env.development file is properly configured
 * for backend integration with RentFlow.
 * 
 * Usage: node validate-env.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(text) {
  console.log('\n' + colorize('='.repeat(60), 'cyan'));
  console.log(colorize(text, 'cyan'));
  console.log(colorize('='.repeat(60), 'cyan') + '\n');
}

function printSuccess(text) {
  console.log(colorize('✓ ', 'green') + text);
}

function printError(text) {
  console.log(colorize('✗ ', 'red') + text);
}

function printWarning(text) {
  console.log(colorize('⚠ ', 'yellow') + text);
}

function printInfo(text) {
  console.log(colorize('ℹ ', 'blue') + text);
}

// Check if a file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Parse .env file
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) return;
    
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    
    if (key && value) {
      env[key.trim()] = value;
    }
  });
  
  return env;
}

// Validate URL format
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Validate Supabase URL
function isValidSupabaseUrl(url) {
  return url && url.includes('supabase.co') && isValidUrl(url);
}

// Validate JWT token format (basic check)
function looksLikeJWT(token) {
  return token && token.split('.').length === 3;
}

// Main validation function
function validateEnvironment() {
  printHeader('RentFlow Environment Validation');
  
  let errors = 0;
  let warnings = 0;
  let success = 0;
  
  // Check if .env.development exists
  const envPath = path.join(process.cwd(), '.env.development');
  
  if (!fileExists(envPath)) {
    printError('.env.development file not found!');
    printInfo('Create it by running: cp .env.example .env.development');
    errors++;
    
    // Check if .env.example exists
    const examplePath = path.join(process.cwd(), '.env.example');
    if (fileExists(examplePath)) {
      printInfo('.env.example found - use it as a template');
    }
    
    return { errors, warnings, success };
  }
  
  printSuccess('.env.development file found');
  success++;
  
  // Parse the env file
  const env = parseEnvFile(envPath);
  
  printHeader('Required Variables');
  
  // Check VITE_SUPABASE_URL
  if (!env.VITE_SUPABASE_URL) {
    printError('VITE_SUPABASE_URL is not set');
    errors++;
  } else if (env.VITE_SUPABASE_URL.includes('your-project-id')) {
    printWarning('VITE_SUPABASE_URL contains placeholder value');
    printInfo('Update with your actual Supabase project URL');
    warnings++;
  } else if (!isValidSupabaseUrl(env.VITE_SUPABASE_URL)) {
    printError('VITE_SUPABASE_URL is not a valid Supabase URL');
    printInfo('Should be: https://your-project.supabase.co');
    errors++;
  } else {
    printSuccess('VITE_SUPABASE_URL is set correctly');
    success++;
  }
  
  // Check VITE_SUPABASE_ANON_KEY
  if (!env.VITE_SUPABASE_ANON_KEY) {
    printError('VITE_SUPABASE_ANON_KEY is not set');
    errors++;
  } else if (env.VITE_SUPABASE_ANON_KEY.includes('your_supabase_anon_key')) {
    printWarning('VITE_SUPABASE_ANON_KEY contains placeholder value');
    printInfo('Update with your actual Supabase anon key');
    warnings++;
  } else if (!looksLikeJWT(env.VITE_SUPABASE_ANON_KEY)) {
    printWarning('VITE_SUPABASE_ANON_KEY does not look like a JWT token');
    warnings++;
  } else {
    printSuccess('VITE_SUPABASE_ANON_KEY is set');
    success++;
  }
  
  printHeader('Backend Integration');
  
  // Check backend configuration
  const useBackend = env.VITE_USE_BACKEND_API === 'true';
  
  if (!env.VITE_USE_BACKEND_API) {
    printWarning('VITE_USE_BACKEND_API is not set (defaults to false)');
    printInfo('Backend integration is disabled - using direct Supabase mode');
    warnings++;
  } else if (useBackend) {
    printSuccess('Backend integration is enabled');
    success++;
    
    // Check backend URL if backend is enabled
    if (!env.VITE_API_BASE_URL) {
      printError('VITE_API_BASE_URL is not set (required when using backend)');
      errors++;
    } else if (!isValidUrl(env.VITE_API_BASE_URL)) {
      printError('VITE_API_BASE_URL is not a valid URL');
      errors++;
    } else {
      printSuccess(`Backend URL: ${env.VITE_API_BASE_URL}`);
      success++;
      
      // Check if it's localhost
      if (env.VITE_API_BASE_URL.includes('localhost')) {
        printInfo('Backend URL points to localhost - ensure backend is running');
      }
    }
  } else {
    printInfo('Backend integration is disabled');
    printInfo('Using direct Supabase connection mode');
  }
  
  printHeader('Optional Configuration');
  
  // Check Paystack key
  if (!env.VITE_PAYSTACK_PUBLIC_KEY) {
    printWarning('VITE_PAYSTACK_PUBLIC_KEY is not set');
    printInfo('Payment features will not work without this');
    warnings++;
  } else if (env.VITE_PAYSTACK_PUBLIC_KEY.includes('your_key')) {
    printWarning('VITE_PAYSTACK_PUBLIC_KEY contains placeholder value');
    warnings++;
  } else {
    const keyPrefix = env.VITE_PAYSTACK_PUBLIC_KEY.substring(0, 7);
    if (keyPrefix === 'pk_test') {
      printSuccess('Paystack key is set (test mode)');
    } else if (keyPrefix === 'pk_live') {
      printSuccess('Paystack key is set (live mode)');
    } else {
      printWarning('Paystack key format not recognized');
    }
    success++;
  }
  
  printHeader('Summary');
  
  console.log(`\n${colorize('Success:', 'green')} ${success} checks passed`);
  console.log(`${colorize('Warnings:', 'yellow')} ${warnings} warnings`);
  console.log(`${colorize('Errors:', 'red')} ${errors} errors\n`);
  
  if (errors > 0) {
    printError('Configuration has errors - please fix them before running the app');
    printInfo('See docs/ENVIRONMENT_CONFIGURATION.md for detailed setup guide');
  } else if (warnings > 0) {
    printWarning('Configuration has warnings - the app may not work as expected');
    printInfo('Review the warnings above and update your configuration');
  } else {
    printSuccess('Configuration looks good! You can start the development server.');
    printInfo('Run: npm run dev');
  }
  
  if (useBackend) {
    console.log('\n' + colorize('Backend Mode Active:', 'cyan'));
    printInfo('Make sure rentflow-backend is running on: ' + env.VITE_API_BASE_URL);
    printInfo('Test backend connection at: http://localhost:8080/backend-test');
  }
  
  console.log('\n' + colorize('Need help?', 'cyan'));
  printInfo('BACKEND_ERROR_FIXES.md - Quick fixes for common errors');
  printInfo('docs/BACKEND_TROUBLESHOOTING.md - Comprehensive troubleshooting');
  printInfo('docs/ENVIRONMENT_CONFIGURATION.md - Environment setup guide');
  console.log('');
  
  return { errors, warnings, success };
}

// Run validation
try {
  const result = validateEnvironment();
  
  // Exit with error code if there are errors
  if (result.errors > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error(colorize('\nValidation failed with error:', 'red'));
  console.error(error.message);
  process.exit(1);
}
