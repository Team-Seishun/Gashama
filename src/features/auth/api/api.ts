import { supabase } from '@/utils/supabase';
import type { SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';

export const authApi = {
  signInWithEmail: async (credentials: SignInWithPasswordCredentials) => {
    return await supabase.auth.signInWithPassword(credentials);
  },
  signUpWithEmail: async (credentials: SignUpWithPasswordCredentials) => {
    return await supabase.auth.signUp(credentials);
  },
  signOut: async () => {
    return await supabase.auth.signOut();
  },
  updatePassword: async (password: string) => {
    return await supabase.auth.updateUser({ password });
  },
};
