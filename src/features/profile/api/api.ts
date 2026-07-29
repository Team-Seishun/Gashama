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
  uploadProfileIcon: async (userId: string, imageUri: string) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const fileExt = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        });

      if (error) {
        return { publicUrl: null, error };
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return { publicUrl: urlData.publicUrl, error: null };
    } catch (error: any) {
      return { publicUrl: null, error };
    }
  },
};