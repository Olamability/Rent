/**
 * Unified Registration API Route - Next.js Server-Side Handler
 * 
 * This replaces the Supabase Edge Function with a stable Next.js API route.
 * Handles user registration for all roles:
 * - Tenant: Free registration without code
 * - Landlord: Free registration without code
 * - Admin: Registration with verification code (code determines role)
 * - Super Admin: Registration with verification code (code determines role)
 * 
 * Security Features:
 * - Server-side admin code verification
 * - Role is ALWAYS determined by the code, NOT user input
 * - Atomic user creation (Auth + public.users)
 * - Service Role key used only server-side
 * - No orphan users
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RegistrationRequest {
  email: string
  password: string
  name: string
  phone?: string
  role: 'tenant' | 'landlord' | 'admin' | 'super_admin'
  adminCode?: string // Required for admin/super_admin roles
}

interface RegistrationResponse {
  success: boolean
  message: string
  data?: {
    userId: string
    email: string
    role: string
    requiresEmailConfirmation: boolean
    requiresApproval: boolean
  }
  error?: string
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * Handle POST request for user registration
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body: RegistrationRequest = await request.json()

    // 2. Validate required fields
    if (!body.email || !body.password || !body.name || !body.role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: email, password, name, and role are required',
        } as RegistrationResponse,
        { status: 400, headers: corsHeaders }
      )
    }

    // 3. Validate role
    const validRoles = ['tenant', 'landlord', 'admin', 'super_admin']
    if (!validRoles.includes(body.role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role. Must be one of: tenant, landlord, admin, super_admin',
        } as RegistrationResponse,
        { status: 400, headers: corsHeaders }
      )
    }

    // 4. Validate email format
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email address format',
        } as RegistrationResponse,
        { status: 400, headers: corsHeaders }
      )
    }

    // 5. Validate password strength
    if (body.password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password must be at least 8 characters long',
        } as RegistrationResponse,
        { status: 400, headers: corsHeaders }
      )
    }

    // 6. Initialize Supabase client with service role (server-side only)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing')
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error. Please contact support.',
        } as RegistrationResponse,
        { status: 500, headers: corsHeaders }
      )
    }

    // Create Supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 7. Role-specific validation and verification
    let actualRole = body.role
    let adminCodePrefix: string | undefined

    if (body.role === 'admin' || body.role === 'super_admin') {
      // Admin/Super Admin MUST provide verification code
      if (!body.adminCode || body.adminCode.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: 'Admin verification code is required for admin and super admin registration',
          } as RegistrationResponse,
          { status: 400, headers: corsHeaders }
        )
      }

      // Verify the admin code using the database function
      const { data: verifiedRole, error: verifyError } = await supabase.rpc(
        'verify_admin_code',
        { code_to_verify: body.adminCode }
      )

      if (verifyError) {
        console.error('Error verifying admin code:', verifyError)
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to verify admin code. Please try again.',
          } as RegistrationResponse,
          { status: 400, headers: corsHeaders }
        )
      }

      // If no role returned, code is invalid
      if (!verifiedRole) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid or expired verification code. Please check your code and try again.',
          } as RegistrationResponse,
          { status: 400, headers: corsHeaders }
        )
      }

      // Use the role from the verified code as the source of truth
      actualRole = verifiedRole as 'admin' | 'super_admin'
      adminCodePrefix = body.adminCode.substring(0, 4)

      console.log(`Admin code verified. Requested: ${body.role}, Actual: ${actualRole}`)

      if (body.role !== actualRole) {
        console.warn(`Role mismatch! User requested: ${body.role}, code grants: ${actualRole}`)
      }
    } else {
      console.log(`Public registration for role: ${actualRole}`)
    }

    // 8. Create user in Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: false, // Require email confirmation
      user_metadata: {
        name: body.name,
        phone: body.phone || '',
        role: actualRole,
      },
    })

    if (signUpError) {
      console.error('Auth signup error:', signUpError)

      const errorMessage = signUpError.message.toLowerCase()
      if (errorMessage.includes('already') || errorMessage.includes('exists')) {
        return NextResponse.json(
          {
            success: false,
            error: 'This email is already registered. Please try logging in instead.',
          } as RegistrationResponse,
          { status: 409, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: `Registration failed: ${signUpError.message}`,
        } as RegistrationResponse,
        { status: 500, headers: corsHeaders }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Registration failed - no user data returned',
        } as RegistrationResponse,
        { status: 500, headers: corsHeaders }
      )
    }

    console.log(`User created in Auth: ${authData.user.id} with role: ${actualRole}`)

    // 9. Create user profile in public.users table (atomic operation)
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
    })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      
      // Critical: Auth user created but profile failed
      // We should clean up the auth user to prevent orphan
      try {
        await supabase.auth.admin.deleteUser(authData.user.id)
        console.log('Cleaned up auth user after profile creation failure')
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError)
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create user profile. Please try again.',
        } as RegistrationResponse,
        { status: 500, headers: corsHeaders }
      )
    }

    console.log(`User profile created in public.users: ${authData.user.id}`)

    // 10. Mark admin code as used if applicable
    if (body.adminCode && (actualRole === 'admin' || actualRole === 'super_admin')) {
      const { error: codeError } = await supabase
        .from('admin_codes')
        .update({
          is_used: true,
          used_by: authData.user.id,
          used_at: new Date().toISOString(),
        })
        .eq('code', body.adminCode)

      if (codeError) {
        console.error('Error marking admin code as used:', codeError)
        // Log error but don't fail registration since user is already created
        console.error(`CRITICAL: Code ${adminCodePrefix}*** not marked as used for user ${authData.user.id}`)
      } else {
        console.log(`Admin code ${adminCodePrefix}*** marked as used successfully`)
      }
    }

    // 11. Create audit log
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
      })
    } catch (auditError) {
      // Log but don't fail
      console.error('Failed to create audit log:', auditError)
    }

    // 12. Return success response
    const requiresApproval = true
    const requiresEmailConfirmation = !authData.user.email_confirmed_at

    return NextResponse.json(
      {
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
      } as RegistrationResponse,
      { status: 201, headers: corsHeaders }
    )
  } catch (err) {
    console.error('Unexpected error in registration:', err)
    
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    
    return NextResponse.json(
      {
        success: false,
        error: `Registration failed: ${errorMessage}`,
      } as RegistrationResponse,
      { status: 500, headers: corsHeaders }
    )
  }
}
