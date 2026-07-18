import { supabase } from '@/utils/supabase';

export type SaveProfileInput = {
  userId: string;
  nickname: string;
  iconImage: string;
};

export const profileApi = {
  getProfileByUserId: async (userId: string) => {
    return await supabase.from('profiles').select('id, nickname, icon_image').eq('id', userId).maybeSingle();
  },
  saveProfile: async ({ userId, nickname, iconImage }: SaveProfileInput) => {
    return await supabase.from('profiles').upsert({
      id: userId,
      nickname: nickname.trim(),
      icon_image: iconImage,
      updated_at: new Date().toISOString(),
    });
  },
};