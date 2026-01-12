/**
 * Unified Registration Vercel Serverless Function
 * 
 * Handles user registration for all roles with proper security measures
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RegistrationRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'tenant' | 'landlord' | 'admin' | 'super_admin';
  adminCode?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body: RegistrationRequest = req.body;

    // Validate required fields
    if (!body.email || !body.password || !body.name || !body.role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, name, and role are required',
      });
    }

    // Validate role
    const validRoles = ['tenant', 'landlord', 'admin', 'super_admin'];
    if (!validRoles.includes(body.role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: tenant, landlord, admin, super_admin',
      });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(body.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address format',
      });
    }

    // Validate password strength
    if (body.password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
      });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error. Please contact support.',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Role-specific validation and verification
    let actualRole = body.role;
    let adminCodePrefix: string | undefined;

    if (body.role === 'admin' || body.role === 'super_admin') {
      if (!body.adminCode || body.adminCode.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Admin verification code is required for admin and super admin registration',
        });
      }

      // Verify the admin code
      const { data: verifiedRole, error: verifyError } = await supabase.rpc(
        'verify_admin_code',
        { code_to_verify: body.adminCode }
      );

      if (verifyError) {
        console.error('Error verifying admin code:', verifyError);
        return res.status(400).json({
          success: false,
          error: 'Failed to verify admin code. Please try again.',
        });
      }

      if (!verifiedRole) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired verification code. Please check your code and try again.',
        });
      }

      actualRole = verifiedRole as 'admin' | 'super_admin';
      adminCodePrefix = body.adminCode.substring(0, 4);

      console.log(`Admin code verified. Requested: ${body.role}, Actual: ${actualRole}`);
    }

    // Create user in Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: false,
      user_metadata: {
        name: body.name,
        phone: body.phone || '',
        role: actualRole,
      },
    });

    if (signUpError) {
      console.error('Auth signup error:', signUpError);

      const errorMessage = signUpError.message.toLowerCase();
      if (errorMessage.includes('already') || errorMessage.includes('exists')) {
        return res.status(409).json({
          success: false,
          error: 'This email is already registered. Please try logging in instead.',
        });
      }

      return res.status(500).json({
        success: false,
        error: `Registration failed: ${signUpError.message}`,
      });
    }

    if (!authData.user) {
      return res.status(500).json({
        success: false,
        error: 'Registration failed - no user data returned',
      });
    }

    console.log(`User created in Auth: ${authData.user.id} with role: ${actualRole}`);

    // Create user profile
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: body.email,
      name: body.name,
      phone: body.phone || '',
      role: actualRole,
      account_status: 'pending',
      is_verified: false,
      profile_complete: false,
      profile_completeness: 0,
    });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      
      // Cleanup auth user
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
        console.log('Cleaned up auth user after profile creation failure');
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to create user profile. Please try again.',
      });
    }

    console.log(`User profile created: ${authData.user.id}`);

    // Mark admin code as used
    if (body.adminCode && (actualRole === 'admin' || actualRole === 'super_admin')) {
      const { error: codeError } = await supabase
        .from('admin_codes')
        .update({
          is_used: true,
          used_by: authData.user.id,
          used_at: new Date().toISOString(),
        })
        .eq('code', body.adminCode);

      if (codeError) {
        console.error('Error marking admin code as used:', codeError);
      }
    }

    // Create audit log
    try {
      await supabase.from('audit_logs').insert({
        user_id: authData.user.id,
        action: actualRole === 'admin' || actualRole === 'super_admin' 
          ? 'admin_registration' 
          : 'user_registration',
        entity_type: 'user',
        entity_id: authData.user.id,
        changes: {
          email: body.email,
          role: actualRole,
          timestamp: new Date().toISOString(),
          admin_code_prefix: adminCodePrefix,
        },
        created_at: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    // Return success
    const requiresApproval = true;
    const requiresEmailConfirmation = !authData.user.email_confirmed_at;

    return res.status(201).json({
      success: true,
      message: requiresEmailConfirmation
        ? 'Registration successful! Please check your email to confirm your account. Your account will require administrator approval before you can login.'
        : 'Registration successful! Your account is pending administrator approval. You will be notified once approved.',
      data: {
        userId: authData.user.id,
        email: authData.user.email!,
        role: actualRole,
        requiresEmailConfirmation,
        requiresApproval,
      },
    });
  } catch (err) {
    console.error('Unexpected error in registration:', err);
    
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    
    return res.status(500).json({
      success: false,
      error: `Registration failed: ${errorMessage}`,
    });
  }
}
