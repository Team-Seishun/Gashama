import { supabase } from '@/utils/supabase';

export type SaveProfileInput = {
  userId: string;
  nickname: string;
  iconImage: string;
  selfIntrodution?: string;
};

export type ProfileRecord = {
  id: string;
  nickname?: string | null;
  icon_image?: string | null;
  self_introdution?: string | null;
  evaluate_star?: number | null;
  trade_history?: number | null;
  contribution_level?: number | null;
};

export const profileApi = {
  getProfileByUserId: async (userId: string) => {
    const res = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    console.log('[Profile API] getProfileByUserId result:', res.data, res.error);
    return res;
  },
  saveProfile: async ({ userId, nickname, iconImage, selfIntrodution }: SaveProfileInput) => {
    const trimmedNickname = nickname.trim();
    const payload: Record<string, any> = {
      id: userId,
      nickname: trimmedNickname,
      icon_image: iconImage,
      updated_at: new Date().toISOString(),
    };

    if (selfIntrodution !== undefined) {
      payload.self_introdution = selfIntrodution ? selfIntrodution.trim() : null;
    }

    let result = await supabase.from('profiles').upsert(payload);

    // self_introdution カラムが存在しない DB スキーマエラーのフォールバック
    if (result.error && result.error.message.includes('self_introdution')) {
      delete payload.self_introdution;
      result = await supabase.from('profiles').upsert(payload);
    }

    console.log('[Profile API] saveProfile result:', result.data, result.error);
    return result;
  },
  uploadProfileIcon: async (userId: string, imageUri: string) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const fileExt = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
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