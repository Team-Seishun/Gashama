import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, ActivityIndicator, Modal } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { InventoryCard, ReportItem } from '@/components/InventoryCard';
import TradeList from '@/components/TradeList';

// ----------------------------------------------------
// メインコンポーネント
// ----------------------------------------------------
export default function PostScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { tab } = useLocalSearchParams<{ tab: string }>();
  const [activeTab, setActiveTab] = useState<'inventory' | 'trade'>(tab === 'trade' ? 'trade' : 'inventory');

  useEffect(() => {
    if (tab === 'trade') {
      setActiveTab('trade');
    }
  }, [tab]);

  const [inventories, setInventories] = useState<ReportItem[]>([]);
  const [loadingInventories, setLoadingInventories] = useState(false);

  // 在庫報告（reportsテーブル）の実データを取得
  const fetchInventories = async () => {
    setLoadingInventories(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          photo_url,
          stock_status,
          created_at,
          profiles ( nickname, icon_image ),
          stores ( name ),
          gachapons ( name ),
          gachapon_items ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('在庫情報の取得エラー:', error);
      } else if (data) {
        setInventories(data as any as ReportItem[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInventories(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInventories();
    }, [])
  );


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
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="検索キーワードを入力..."
                  placeholderTextColor="#999"
                />
                <TouchableOpacity style={styles.searchButton}>
                  <Text style={styles.searchButtonText}>検索</Text>
                </TouchableOpacity>
              </View>

              {/* フィルタータグ */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
                <View style={styles.tag}>
                  <Ionicons name="search" size={14} color="#666" style={{ marginRight: 4 }} />
                  <Text style={styles.tagText}>ちいかわ (ハチワレ)</Text>
                </View>
                <View style={styles.tag}>
                  <Ionicons name="search" size={14} color="#666" style={{ marginRight: 4 }} />
                  <Text style={styles.tagText}>サンリオ (シナモロール)</Text>
                </View>
              </ScrollView>
            </View>

            {/* リスト表示 */}
            {loadingInventories && inventories.length === 0 ? (
              <ActivityIndicator size="large" color="#FF7A00" style={{ marginTop: 40 }} />
            ) : (
              <FlashList
                data={inventories}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <InventoryCard item={item} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshing={loadingInventories}
                onRefresh={fetchInventories}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>在庫報告がありません。</Text>
                }
              />
            )}
          </>
        )}

        {activeTab === 'trade' && <TradeList />}

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
  searchButton: {
    backgroundColor: '#C62828',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  searchButtonText: {
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
