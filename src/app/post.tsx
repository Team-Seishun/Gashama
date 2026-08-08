import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';

// ----------------------------------------------------
// モックデータ (トレード用)
// ----------------------------------------------------
const TRADE_BASES = [
  {
    user: 'Kaito_Gacha',
    place: '池袋サンシャイン付近',
    distTime: '200m • 5分前',
    offer: 'ハチワレ (おやすみ)',
    request: 'うさぎ (スポーツ)',
    status: 'active',
    info: '※相手が申請を承認するとマッチングが成立し、チャットが解放されます',
    userColor: '#E1F5FE',
  },
  {
    user: 'Mina_Chan',
    place: '渋谷駅',
    distTime: '1.2km • 15分前',
    offer: 'モモンガ (立ち姿)',
    request: 'ちいかわ (ラーメン)',
    status: 'trading',
    userColor: '#FCE4EC',
  },
  {
    user: 'GachaMaster_99',
    place: '秋葉原駅周辺',
    distTime: '3.6km • 1時間前',
    offer: 'サンリオコラボ A',
    request: 'サンリオコラボ D',
    status: 'active',
    userColor: '#E8F5E9',
  },
];

const MOCK_TRADES = Array.from({ length: 20 }).map((_, i) => ({
  id: `trade_${i}`,
  ...TRADE_BASES[i % 3],
}));

// Supabase 在庫報告データ型
type ReportItem = {
  id: string;
  created_at: string;
  photo_url: string;
  stock_status: number; // 0: 売り切れ, 1: 残りわずか, 2: 在庫あり
  stores: { name: string } | null;
  gachapons: { name: string } | null;
  gachapon_items: { name: string } | null;
  profiles: { nickname: string } | null;
};

// ----------------------------------------------------
// メインコンポーネント
// ----------------------------------------------------
export default function PostScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'inventory' | 'trade'>('trade');
  const [inventories, setInventories] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 検索キーワードの状態
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Supabaseから在庫報告一覧を取得
  const fetchInventoryReports = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          created_at,
          photo_url,
          stock_status,
          stores ( name ),
          gachapons ( name ),
          gachapon_items ( name ),
          profiles ( nickname )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInventories((data as unknown as ReportItem[]) || []);
    } catch (error) {
      console.error('在庫報告の取得に失敗しました:', error);
      setLoadError('在庫報告の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 画面フォーカス時に最新の投稿を取得
  useFocusEffect(
    useCallback(() => {
      fetchInventoryReports();
    }, [])
  );

  // 検索フィルター処理 (店舗名、ガチャ名、アイテム名のいずれかに部分一致)
  const filteredInventories = inventories.filter((item) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.trim().toLowerCase();
    const storeName = item.stores?.name?.toLowerCase() || '';
    const gachaponName = item.gachapons?.name?.toLowerCase() || '';
    const itemName = item.gachapon_items?.name?.toLowerCase() || '';

    return (
      storeName.includes(query) ||
      gachaponName.includes(query) ||
      itemName.includes(query)
    );
  });

  // ステータス表示の変換ヘルパー
  const getStockStatusInfo = (status: number) => {
    switch (status) {
      case 2:
        return { text: '在庫あり', color: '#FF7A00' };
      case 1:
        return { text: '残りわずか', color: '#007AFF' };
      case 0:
      default:
        return { text: '売り切れ', color: '#8E8E93' };
    }
  };

  // 経過時間表示の簡易ヘルパー
  const formatTimeAgo = (dateString: string) => {
    const diffMin = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60));
    if (diffMin < 1) return 'たった今';
    if (diffMin < 60) return `${diffMin}分前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}時間前`;
    return `${Math.floor(diffHour / 24)}日前`;
  };

  // トレードカードの描画 (変更なし)
  const renderTradeCard = ({ item }: { item: typeof MOCK_TRADES[0] }) => (
    <View style={styles.card}>
      {/* ユーザー情報ヘッダー */}
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: item.userColor }]}>
            <Ionicons name="person" size={20} color="#999" />
          </View>
          <View style={styles.userNameContainer}>
            <Text style={styles.userName}>{item.user}</Text>
            <View style={styles.placeBadge}>
              <Text style={styles.placeBadgeText}>{item.place}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color="#D95C14" />
        </TouchableOpacity>
      </View>
      <Text style={styles.distTimeText}>{item.distTime}</Text>

      {/* 出・求 コンテンツ */}
      <View style={styles.tradeContentRow}>
        {/* 出 (Offer) */}
        <View style={styles.tradeItemBox}>
          <View style={styles.tradeItemBadgeOffer}>
            <Text style={styles.tradeItemBadgeText}>出</Text>
          </View>
          <Text style={styles.tradeItemName} numberOfLines={1}>{item.offer}</Text>
          <Image
            source={{ uri: `https://picsum.photos/seed/${item.id}_offer/200/200` }}
            style={[styles.itemImagePlaceholder, { overflow: 'hidden' }]}
            contentFit="cover"
          />
        </View>

        {/* 矢印・リフレッシュアイコン */}
        <View style={styles.tradeExchangeIcon}>
          <Ionicons name="swap-horizontal" size={24} color="#D95C14" />
        </View>

        {/* 求 (Request) */}
        <View style={styles.tradeItemBox}>
          <View style={styles.tradeItemBadgeRequest}>
            <Text style={styles.tradeItemBadgeTextRequest}>求</Text>
          </View>
          <Text style={styles.tradeItemName} numberOfLines={1}>{item.request}</Text>
          <Image
            source={{ uri: `https://picsum.photos/seed/${item.id}_req/200/200` }}
            style={[styles.itemImagePlaceholder, { overflow: 'hidden' }]}
            contentFit="cover"
          />
        </View>
      </View>

      {/* アクションボタン */}
      {item.status === 'active' ? (
        <>
          <TouchableOpacity 
            style={styles.actionButtonActive}
            onPress={() =>
              router.push({
                pathname: '/chat-room' as any,
                params: { type: 'sent' },
              })
            }
          >
            <Text style={styles.actionButtonTextActive}>交換申請を送る</Text>
          </TouchableOpacity>
          {item.info && (
            <Text style={styles.infoText}>{item.info}</Text>
          )}
        </>
      ) : (
        <View style={styles.actionButtonDisabled}>
          <Text style={styles.actionButtonTextDisabled}>他の方と取引中</Text>
        </View>
      )}
    </View>
  );

  // 在庫カードの描画 (Supabase 実データ)
  const renderInventoryCard = ({ item }: { item: ReportItem }) => {
    const statusInfo = getStockStatusInfo(item.stock_status);
    const itemName = item.gachapon_items?.name 
      ? `${item.gachapons?.name || ''} (${item.gachapon_items.name})`
      : item.gachapons?.name || 'ガチャガチャ名なし';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#F0F0F0' }]}>
              <Ionicons name="person" size={20} color="#999" />
            </View>
            <View style={styles.userNameContainer}>
              <Text style={styles.userName}>{item.profiles?.nickname || 'ユーザー'}</Text>
              <View style={styles.placeBadge}>
                <Text style={styles.placeBadgeText}>{item.stores?.name || '店舗名未設定'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={20} color="#D95C14" />
          </TouchableOpacity>
        </View>
        <Text style={styles.distTimeText}>{formatTimeAgo(item.created_at)}</Text>

        <View style={styles.inventoryContent}>
          <Image
            source={{ uri: item.photo_url || 'https://via.placeholder.com/200' }}
            style={[styles.itemImagePlaceholderInv, { overflow: 'hidden' }]}
            contentFit="cover"
          />
          <View style={styles.inventoryInfo}>
            <Text style={styles.inventoryItemName}>{itemName}</Text>
            <Text style={[styles.inventoryStatus, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
        </View>
      </View>
    );
  };

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

        {/* 検索バー */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="店舗名・ガチャガチャ名で検索..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearButtonText}>クリア</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* フィルタータグ (タップで検索欄に入力) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
            <TouchableOpacity 
              style={styles.tag} 
              onPress={() => setSearchQuery('ちいかわ')}
            >
              <Ionicons name="search" size={14} color="#666" style={{ marginRight: 4 }} />
              <Text style={styles.tagText}>ちいかわ</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.tag} 
              onPress={() => setSearchQuery('サンリオ')}
            >
              <Ionicons name="search" size={14} color="#666" style={{ marginRight: 4 }} />
              <Text style={styles.tagText}>サンリオ</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.tag} 
              onPress={() => setSearchQuery('ガシャポン')}
            >
              <Ionicons name="search" size={14} color="#666" style={{ marginRight: 4 }} />
              <Text style={styles.tagText}>ガシャポン</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* リスト表示 */}
        {activeTab === 'trade' ? (
          <FlatList
            data={MOCK_TRADES}
            keyExtractor={(item) => item.id}
            renderItem={renderTradeCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF7A00" />
          </View>
        ) : loadError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>読み込みに失敗しました</Text>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchInventoryReports}>
              <Text style={styles.retryButtonText}>再読み込み</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredInventories}
            keyExtractor={(item) => item.id}
            renderItem={renderInventoryCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? `「${searchQuery}」に一致する在庫報告は見つかりませんでした`
                    : '在庫報告の投稿がまだありません'}
                </Text>
              </View>
            }
          />
        )}
      </View>
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
    backgroundColor: '#F5F5F5',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
  clearButton: {
    backgroundColor: '#8E8E93',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },

  // リスト
  listContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF7A00',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
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
    marginLeft: 52,
    marginBottom: 16,
  },

  // トレード コンテンツ
  tradeContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tradeItemBox: {
    flex: 1,
    alignItems: 'center',
  },
  tradeItemBadgeOffer: {
    backgroundColor: '#FF7A00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tradeItemBadgeRequest: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tradeItemBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tradeItemBadgeTextRequest: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tradeItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  itemImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeExchangeIcon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  // トレード アクションボタン
  actionButtonActive: {
    backgroundColor: '#8D6E63',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonTextActive: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#E0E0E0',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonTextDisabled: {
    color: '#999',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // 在庫報告 コンテンツ
  inventoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 12,
  },
  itemImagePlaceholderInv: {
    width: 60,
    height: 60,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    marginRight: 16,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryItemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  inventoryStatus: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});