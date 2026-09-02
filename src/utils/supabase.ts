import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // windowが存在する環境（ブラウザ）のみAsyncStorageを使用する設定に変更
    storage: typeof window !== 'undefined' ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// RNはバックグラウンド中にタイマーが止まるため、フォアグラウンド復帰時のみ
// 自動更新を回す。これがないとバックグラウンド復帰直後にトークン更新が
// 間に合わず、一時的にセッションがnullになることがある。
//
// このファイル自体は開発中のFast Refreshで再評価されることがあり、その
// たびに素朴に addEventListener すると古いリスナーが解除されないまま
// 積み重なってしまう。モジュールのローカル変数は再評価のたびにリセット
// されるため、モジュールをまたいで生き続ける globalThis 側に購読を
// 保持し、登録し直す前に必ず前回分を解除する。
const appStateSubscriptionKey = '__supabaseAppStateSubscription';
type AppStateSubscription = { remove: () => void };

if (typeof window !== 'undefined') {
  const globalWithSubscription = globalThis as typeof globalThis & {
    [appStateSubscriptionKey]?: AppStateSubscription;
  };

  globalWithSubscription[appStateSubscriptionKey]?.remove();
  globalWithSubscription[appStateSubscriptionKey] = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}