import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../utils/supabase';

export type StoreItem = { id: string; name: string };
export type GachaponItem = { id: string; name: string };
export type ItemType = { id: string; name: string };

type InitialParams = {
  storeId?: string | null;
  gachaponId?: string | null;
  itemId?: string | null;
};

export function useMasterData(params?: InitialParams) {
  const [fetching, setFetching] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [selectedGachapon, setSelectedGachapon] = useState<GachaponItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);

  const storeId = params?.storeId;
  const gachaponId = params?.gachaponId;
  const itemId = params?.itemId;

  const fetchMasterData = useCallback(async () => {
    setFetching(true);
    setLoadError(null);
    try {
      const promises = [];

      if (storeId) {
        promises.push(
          supabase.from('stores').select('id, name').eq('id', storeId).single().then(res => {
            if (res.data) setSelectedStore(res.data);
          })
        );
      }
      
      if (gachaponId) {
        promises.push(
          supabase.from('gachapons').select('id, name').eq('id', gachaponId).single().then(res => {
            if (res.data) setSelectedGachapon(res.data);
          })
        );
      }

      if (itemId) {
        promises.push(
          supabase.from('gachapon_items').select('id, name').eq('id', itemId).single().then(res => {
            if (res.data) setSelectedItem(res.data);
          })
        );
      }

      await Promise.all(promises);

    } catch (error: any) {
      console.error('マスターデータ取得エラー:', error);
      setLoadError(error?.message ?? '店舗やガチャ情報の取得に失敗しました。');
      Alert.alert('データ取得失敗', '店舗やガチャ情報の取得に失敗しました。');
    } finally {
      setFetching(false);
    }
  }, [storeId, gachaponId, itemId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMasterData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMasterData]);

  return {
    fetching,
    loadError,
    selectedStore,
    setSelectedStore,
    selectedGachapon,
    setSelectedGachapon,
    selectedItem,
    setSelectedItem,
    fetchMasterData,
  };
}
