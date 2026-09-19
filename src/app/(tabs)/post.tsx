import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, StatusBar, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/utils/supabase';
import { InventoryCard, ReportItem, unwrapRelation } from '@/components/InventoryCard';
import TradeList from '@/components/TradeList';
import SearchBar from '@/components/SearchBar';
import ReportDetailModal from '@/components/ReportDetailModal';
import { commonStyles } from '@/styles/common';
import { useRequestGuard } from '@/hooks/useRequestGuard';
import { fetchMyInventories, fetchMyTradedReportIds } from '@/features/trade/api';
import { filterTradeableInventories } from '@/features/trade/myInventoryLogic';

// reports(*) には gachapon_id / store_id / item_id が生のFKカラムとして
// 含まれる（gachapon_items(id, name)はアイテム名表示用に別途joinしたもの）。
// trade-create画面への遷移にはこれらの生FKカラムをそのまま使う。
type MyInventoryItem = ReportItem & {
  gachapon_id: string | null;
  store_id: string | null;
  item_id: string | null;
};

// ----------------------------------------------------
// メインコンポーネント
// ----------------------------------------------------
export default function PostScreen() {
  const router = useRouter();
  const { tab, filterType, filterId, filterName } = useLocalSearchParams<{
    tab: string;
    filterType: string;
    filterId: string;
    filterName: string;
  }>();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'trade'>(tab === 'trade' ? 'trade' : 'inventory');
  const [prevTab, setPrevTab] = useState(tab);

  if (tab !== prevTab) {
    setPrevTab(tab);
    if (tab === 'trade' || tab === 'inventory') {
      setActiveTab(tab);
    }
  }

  const [inventories, setInventories] = useState<ReportItem[]>([]);
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  // トレードタブのボタンを押すたびに値を変え、TradeList側で必ず再取得させるためのキー
  const [tradeReloadKey, setTradeReloadKey] = useState(0);

  // 連打などでfetchInventoriesが重なって呼ばれた際に、古いリクエストの応答が新しい応答を
  // 上書きしないようにするためのガード
  const inventoryRequestGuard = useRequestGuard();

  // ----------------------------------------------------
  // 「+」ボタン（在庫投稿/トレード投稿の選択シート）関連
  // ----------------------------------------------------
  const createSheetRef = useRef<BottomSheet>(null);
  const createSheetSnapPoints = useMemo(() => ['32%', '75%'], []);
  // 'choose': 在庫投稿/トレード投稿の選択画面、'inventory': トレードに出す在庫の選択画面
  const [createSheetMode, setCreateSheetMode] = useState<'choose' | 'inventory'>('choose');
  const [myUntradedInventories, setMyUntradedInventories] = useState<MyInventoryItem[]>([]);
  const [loadingMyInventories, setLoadingMyInventories] = useState(false);
  const [myInventoriesError, setMyInventoriesError] = useState<string | null>(null);
  // handleSelectTradePostの連打・素早い戻る→再選択で古いレスポンスが新しい状態を
  // 上書きしないようにするためのガード（inventoryRequestGuardと同じ仕組み）
  const myInventoriesRequestGuard = useRequestGuard();

  // シートを「選択」画面に戻す（トレード用在庫の取得中/取得結果もリセットする）
  const resetCreateSheetToChoose = () => {
    setCreateSheetMode('choose');
    setLoadingMyInventories(false);
    setMyInventoriesError(null);
    setMyUntradedInventories([]);
    myInventoriesRequestGuard.invalidate();
  };

  const openCreateSheet = () => {
    resetCreateSheetToChoose();
    createSheetRef.current?.snapToIndex(0);
  };

  const handleSelectInventoryPost = () => {
    createSheetRef.current?.close();
    router.push('/camera');
  };

  const handleSelectTradePost = async () => {
    const myRequestId = myInventoriesRequestGuard.start();
    setCreateSheetMode('inventory');
    createSheetRef.current?.snapToIndex(1);
    setLoadingMyInventories(true);
    setMyInventoriesError(null);
    setMyUntradedInventories([]);
    try {
      // 読み取り専用の一覧取得なので、ネットワーク往復を伴うgetUser()ではなく
      // ローカルセッションを読むだけのgetSession()を使う
      // （trade-create.tsxの表示専用処理と同じ方針）
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        if (myInventoriesRequestGuard.isStale(myRequestId)) return;
        setMyInventoriesError('ログインしていないため在庫を取得できませんでした。');
        return;
      }

      const [{ data: inventories, error: invError }, { data: tradedReportIds, error: tradedError }] =
        await Promise.all([fetchMyInventories(user.id), fetchMyTradedReportIds(user.id)]);

      if (myInventoriesRequestGuard.isStale(myRequestId)) return;

      if (invError || tradedError) {
        console.error('自分の在庫取得エラー:', invError || tradedError);
        setMyInventoriesError('在庫の取得に失敗しました。もう一度お試しください。');
        return;
      }

      const tradeable = filterTradeableInventories(
        (inventories ?? []) as unknown as MyInventoryItem[],
        tradedReportIds ?? []
      );
      setMyUntradedInventories(tradeable);
    } catch (e) {
      if (myInventoriesRequestGuard.isStale(myRequestId)) return;
      console.error('自分の在庫取得エラー:', e);
      setMyInventoriesError('在庫の取得に失敗しました。もう一度お試しください。');
    } finally {
      if (!myInventoriesRequestGuard.isStale(myRequestId)) {
        setLoadingMyInventories(false);
      }
    }
  };

  const handleBackToChoose = () => {
    resetCreateSheetToChoose();
    createSheetRef.current?.snapToIndex(0);
  };

  const handlePickInventoryForTrade = (item: MyInventoryItem) => {
    createSheetRef.current?.close();
    router.push({
      pathname: '/trade-create',
      params: {
        reportId: item.id,
        gachaponId: item.gachapon_id ?? undefined,
        storeId: item.store_id ?? undefined,
        haveItemId: item.item_id ?? undefined,
        photoUrl: item.photo_url,
      },
    });
  };

  // 在庫報告（reportsテーブル）の実データを取得
  const fetchInventories = async () => {
    const myRequestId = inventoryRequestGuard.start();
    setLoadingInventories(true);
    setPage(0);
    setHasMore(true);
    // fetchMoreInventoriesが進行中だった場合、このリセットで無効化されるため
    // ローディング表示が残り続けないようここでも解除しておく
    setLoadingMore(false);
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

      if (inventoryRequestGuard.isStale(myRequestId)) return;

      if (error) {
        console.error('在庫情報の取得エラー:', error);
      } else if (data) {
        setInventories(data as any as ReportItem[]);
        if (data.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
      }
    } catch (e) {
      if (inventoryRequestGuard.isStale(myRequestId)) return;
      console.error(e);
    } finally {
      if (!inventoryRequestGuard.isStale(myRequestId)) {
        setLoadingInventories(false);
      }
    }
  };

  const fetchMoreInventories = async () => {
    if (!hasMore || loadingMore || loadingInventories) return;

    // fetchInventories（タブ再押下等によるリセット）が後から発行された場合、
    // このリクエストの応答は捨てて新しい1ページ目のリストへの追記を防ぐ
    const myRequestId = inventoryRequestGuard.start();
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

      if (inventoryRequestGuard.isStale(myRequestId)) return;

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
      if (inventoryRequestGuard.isStale(myRequestId)) return;
      console.error(e);
    } finally {
      if (!inventoryRequestGuard.isStale(myRequestId)) {
        setLoadingMore(false);
      }
    }
  };

  // fetchInventoriesに依存配列を設定
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInventories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterId]);

  // 在庫報告タブのボタン: 既に在庫報告タブにいる場合でも必ず再取得する
  const handleInventoryTabPress = () => {
    setActiveTab('inventory');
    fetchInventories();
  };

  // トレードタブのボタン: 既にトレードタブにいる場合でもTradeList側の再取得を必ず走らせる
  const handleTradeTabPress = () => {
    setActiveTab('trade');
    setTradeReloadKey((prev) => prev + 1);
  };

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
            onPress={handleInventoryTabPress}
          >
            <Text style={[styles.tabText, activeTab === 'inventory' && styles.tabTextActive]}>在庫報告</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'trade' && styles.tabButtonActive]}
            onPress={handleTradeTabPress}
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
              <View style={commonStyles.centerContainer}>
                <ActivityIndicator size="large" color="#FF7A00" />
              </View>
            ) : (
              <FlashList
                data={inventories}
                keyExtractor={(item) => item.id}
                renderItem={renderInventoryItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={loadingInventories && inventories.length > 0}
                    onRefresh={fetchInventories}
                    colors={['#FF7A00']}
                    tintColor="#FF7A00"
                  />
                }
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

        {activeTab === 'trade' && <TradeList reloadKey={tradeReloadKey} />}

        {/* 投稿作成ボタン（+）: 在庫投稿/トレード投稿を選んで投稿を開始する */}
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={openCreateSheet}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        {/* 投稿作成シート */}
        <BottomSheet
          ref={createSheetRef}
          index={-1}
          snapPoints={createSheetSnapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose={true}
          onClose={resetCreateSheetToChoose}
          backgroundStyle={styles.createSheetBackground}
          handleIndicatorStyle={styles.createSheetHandleIndicator}
        >
          <BottomSheetScrollView contentContainerStyle={styles.createSheetContent}>
            {createSheetMode === 'choose' ? (
              <View>
                <Text style={styles.createSheetTitle}>投稿の種類を選択</Text>

                <TouchableOpacity style={styles.createSheetChoiceButton} onPress={handleSelectInventoryPost}>
                  <View style={[styles.createSheetChoiceIcon, { backgroundColor: '#FFF2E5' }]}>
                    <Ionicons name="camera-outline" size={24} color="#FF7A00" />
                  </View>
                  <View style={styles.createSheetChoiceTextArea}>
                    <Text style={styles.createSheetChoiceTitle}>在庫投稿</Text>
                    <Text style={styles.createSheetChoiceDescription}>カメラで撮影して在庫を報告します</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.createSheetChoiceButton} onPress={handleSelectTradePost}>
                  <View style={[styles.createSheetChoiceIcon, { backgroundColor: '#E5F1FF' }]}>
                    <Ionicons name="swap-horizontal-outline" size={24} color="#007AFF" />
                  </View>
                  <View style={styles.createSheetChoiceTextArea}>
                    <Text style={styles.createSheetChoiceTitle}>トレード投稿</Text>
                    <Text style={styles.createSheetChoiceDescription}>自分の在庫からトレードを募集します</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.createSheetInventoryHeader}>
                  <TouchableOpacity onPress={handleBackToChoose} accessibilityRole="button" accessibilityLabel="戻る">
                    <Ionicons name="chevron-back" size={22} color="#333" />
                  </TouchableOpacity>
                  <Text style={styles.createSheetTitle}>トレードに出す在庫を選択</Text>
                  <View style={{ width: 22 }} />
                </View>

                {loadingMyInventories ? (
                  <ActivityIndicator size="large" color="#FF7A00" style={{ marginVertical: 32 }} />
                ) : myInventoriesError ? (
                  <Text style={styles.createSheetEmptyText}>{myInventoriesError}</Text>
                ) : myUntradedInventories.length === 0 ? (
                  <Text style={styles.createSheetEmptyText}>
                    トレードに出せる在庫がありません。まずは在庫投稿をしてください。
                  </Text>
                ) : (
                  myUntradedInventories.map((inv) => {
                    const gachaponItem = unwrapRelation(inv.gachapon_items);
                    return (
                      <TouchableOpacity
                        key={inv.id}
                        style={styles.createSheetInventoryItem}
                        onPress={() => handlePickInventoryForTrade(inv)}
                      >
                        <Image
                          source={{ uri: inv.photo_url || 'https://via.placeholder.com/200' }}
                          style={styles.createSheetInventoryImage}
                        />
                        <Text style={styles.createSheetInventoryName}>
                          {gachaponItem?.name || '不明なアイテム'}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color="#CCC" />
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
          </BottomSheetScrollView>
        </BottomSheet>

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
    paddingTop: 6,
    paddingBottom: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
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
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    paddingBottom: 15,
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

  // 投稿作成ボタン（+）
  fab: {
    position: 'absolute',
    bottom: 150, // タブバー等に隠れないように少し高めに設定
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    zIndex: 999,
  },

  // 投稿作成シート
  createSheetBackground: {
    backgroundColor: '#fff',
    borderRadius: 24,
  },
  createSheetHandleIndicator: {
    width: 40,
    backgroundColor: '#DDDDDD',
  },
  createSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  createSheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  createSheetChoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  createSheetChoiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createSheetChoiceTextArea: {
    flex: 1,
    marginLeft: 16,
  },
  createSheetChoiceTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  createSheetChoiceDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  createSheetInventoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  createSheetInventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEF0',
  },
  createSheetInventoryImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EEEEF0',
  },
  createSheetInventoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  createSheetEmptyText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 32,
  },

});
