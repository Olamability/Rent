import { supabase } from './supabase';

export const getUserRole = async (): Promise<string | null> => {
  // Get currently logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  // Fetch role from the 'users' table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;

  return profile.role;
};
