import { useEffect, useState } from 'react';
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
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [gachapons, setGachapons] = useState<GachaponItem[]>([]);
  const [items, setItems] = useState<ItemType[]>([]);
  const [fetching, setFetching] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [selectedGachapon, setSelectedGachapon] = useState<GachaponItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);

  const fetchMasterData = async () => {
    try {
      setFetching(true);
      setLoadError(null);

      const [storesRes, gachaponsRes, itemsRes] = await Promise.all([
        supabase.from('stores').select('id, name').limit(100),
        supabase.from('gachapons').select('id, name').limit(100),
        supabase.from('gachapon_items').select('id, name').limit(100),
      ]);

      if (storesRes.error) throw storesRes.error;
      if (gachaponsRes.error) throw gachaponsRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const storeData = storesRes.data || [];
      const gachaponData = gachaponsRes.data || [];
      const itemData = itemsRes.data || [];

      setStores(storeData);
      setGachapons(gachaponData);
      setItems(itemData);

      if (params?.storeId) {
        const matched = storeData.find((s) => s.id === params.storeId);
        if (matched) setSelectedStore(matched);
      } else if (storeData.length > 0) {
        setSelectedStore(storeData[0]);
      }

      if (params?.gachaponId) {
        const matched = gachaponData.find((g) => g.id === params.gachaponId);
        if (matched) setSelectedGachapon(matched);
      }

      if (params?.itemId) {
        const matched = itemData.find((i) => i.id === params.itemId);
        if (matched) setSelectedItem(matched);
      }
    } catch (error: any) {
      console.error('マスターデータ取得エラー:', error);
      setLoadError(error?.message ?? '店舗やガチャ情報の取得に失敗しました。');
      Alert.alert('データ取得失敗', '店舗やガチャ情報の取得に失敗しました。');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [params?.storeId, params?.gachaponId, params?.itemId]);

  return {
    stores,
    gachapons,
    items,
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
