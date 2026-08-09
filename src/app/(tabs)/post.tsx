import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, ActivityIndicator, Modal } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { InventoryCard, ReportItem } from '@/components/InventoryCard';
import TradeList from '@/components/TradeList';
import SearchBar from '@/components/SearchBar';
import ReportDetailModal from '@/components/ReportDetailModal';

// ----------------------------------------------------
// メインコンポーネント
// ----------------------------------------------------
export default function PostScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { tab, filterType, filterId, filterName } = useLocalSearchParams<{
    tab: string;
    filterType: string;
    filterId: string;
    filterName: string;
  }>();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'trade'>(tab === 'trade' ? 'trade' : 'inventory');

  useEffect(() => {
    if (tab === 'trade' || tab === 'inventory') {
      setActiveTab(tab);
    }
  }, [tab]);

  const [inventories, setInventories] = useState<ReportItem[]>([]);
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  // 在庫報告（reportsテーブル）の実データを取得
  const fetchInventories = async () => {
    setLoadingInventories(true);
    setPage(0);
    setHasMore(true);
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          profiles!reports_user_id_fkey(nickname, icon_image),
          stores(*),
          gachapons(*),
          gachapon_items(*)
        `)
        .order('created_at', { ascending: false });
        
      if (filterType === 'store' && filterId) {
        query = query.eq('store_id', filterId);
      } else if (filterType === 'gachapon' && filterId) {
        query = query.eq('gachapon_id', filterId);
      } else if (filterType === 'item' && filterId) {
        query = query.eq('gachapon_item_id', filterId);
      }

      const { data, error } = await query.range(0, ITEMS_PER_PAGE - 1);

      if (error) {
        console.error('在庫情報の取得エラー:', error);
      } else if (data) {
        setInventories(data as any as ReportItem[]);
        if (data.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInventories(false);
    }
  };

  const fetchMoreInventories = async () => {
    if (!hasMore || loadingMore || loadingInventories) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    const from = nextPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          profiles!reports_user_id_fkey(nickname, icon_image),
          stores(*),
          gachapons(*),
          gachapon_items(*)
        `)
        .order('created_at', { ascending: false });
        
      if (filterType === 'store' && filterId) {
        query = query.eq('store_id', filterId);
      } else if (filterType === 'gachapon' && filterId) {
        query = query.eq('gachapon_id', filterId);
      } else if (filterType === 'item' && filterId) {
        query = query.eq('gachapon_item_id', filterId);
      }

      const { data, error } = await query.range(from, to);

      if (error) {
        console.error('追加の在庫情報取得エラー:', error);
      } else if (data) {
        setInventories(prev => [...prev, ...data as any as ReportItem[]]);
        setPage(nextPage);
        if (data.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  // fetchInventoriesに依存配列を設定
  useEffect(() => {
    fetchInventories();
  }, [filterType, filterId]);

  const renderInventoryItem = useCallback(({ item }: { item: ReportItem }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => setSelectedReport(item)}
    >
      <InventoryCard item={item} />
    </TouchableOpacity>
  ), []);


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* 上部タブ (Segmented Control) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'inventory' && styles.tabButtonActive]}
            onPress={() => setActiveTab('inventory')}
          >
            <Text style={[styles.tabText, activeTab === 'inventory' && styles.tabTextActive]}>在庫報告</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'trade' && styles.tabButtonActive]}
            onPress={() => setActiveTab('trade')}
          >
            <Text style={[styles.tabText, activeTab === 'trade' && styles.tabTextActive]}>トレード</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'inventory' && (
          <>
            {/* 検索バー */}
            <View style={styles.searchSection}>
              <SearchBar
                value={filterName || ''}
                onPress={() => router.push({ pathname: '/search', params: { returnTo: 'post', activeTab: 'inventory' } })}
                onClear={() => router.setParams({ filterType: '', filterId: '', filterName: '' })}
              />
            </View>

            {/* リスト表示 */}
            {loadingInventories && inventories.length === 0 ? (
              <ActivityIndicator size="large" color="#FF7A00" style={{ marginTop: 40 }} />
            ) : (
              <FlashList
                data={inventories}
                keyExtractor={(item) => item.id}
                renderItem={renderInventoryItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshing={loadingInventories && inventories.length > 0}
                onRefresh={fetchInventories}
                onEndReached={fetchMoreInventories}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  loadingMore ? (
                    <ActivityIndicator size="small" color="#FF7A00" style={{ marginVertical: 20 }} />
                  ) : null
                }
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>在庫報告がありません。</Text>
                }
              />
            )}
          </>
        )}

        {activeTab === 'trade' && <TradeList />}

      </View>

      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // タブ
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 25,
    marginHorizontal: 5,
    backgroundColor: '#F5F5F5', // アクティブじゃない時は背景と同化
  },
  tabButtonActive: {
    backgroundColor: '#FF7A00',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },

  // 検索
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  // リスト
  listContent: {
    padding: 20,
  },

  // 共通カードスタイル
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  placeBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  placeBadgeText: {
    fontSize: 11,
    color: '#666',
  },
  distTimeText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 52, // アバターの幅+margin分インデント
    marginBottom: 16,
  },

});
