import { Ionicons } from '@expo/vector-icons';
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
import { InventoryCard, ReportItem } from '../components/InventoryCard';
import { TradeCard, TradeItem } from '../components/TradeCard';
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

const MOCK_TRADES: TradeItem[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `trade_${i}`,
  ...TRADE_BASES[i % 3],
}));

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
        .order('created_at', { ascending: false })
        .limit(50); // ★ 最新50件のみ取得するように上限を追加

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
            renderItem={({ item }) => <TradeCard item={item} />}
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
            renderItem={({ item }) => <InventoryCard item={item} />}
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
});