import { supabase } from './supabase';

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { user: data.user };
}

export async function logout() {
  await supabase.auth.signOut();
}
