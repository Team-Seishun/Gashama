import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

interface Trade {
  id: string;
  user_id?: string | null;
  report_id?: string | null;
  store_id?: string | null;
  gachapon_id?: string | null;
  have_item_id?: string | null;
  want_item_id?: string | null;
  status?: number | null;
  buytime?: string | null;
  photo_url?: string | null;
  created_at?: string;
  updated_at?: string;
  user_name?: string | null;
  item_give?: string | null;
  item_want?: string | null;
  is_requesting?: boolean;
}

export default function TradeScreen() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [requestedTradeIds, setRequestedTradeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTrades = async () => {
    try {
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .select('id, item_give, item_want, user_name, status, created_at, gachapon_id, photo_url')
        .order('created_at', { ascending: false });

      if (tradeError) {
        console.error('Error fetching trades:', tradeError);
        setErrorMsg('データの取得に失敗しました');
      } else if (tradeData) {
        setTrades(tradeData as Trade[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrades();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
        },
        () => {
          fetchTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredTrades(trades);
    } else {
      const filtered = trades.filter((item) => {
        const query = text.toLowerCase();
        const give = item.item_give ? item.item_give.toLowerCase() : '';
        const want = item.item_want ? item.item_want.toLowerCase() : '';
        const user = item.user_name ? item.user_name.toLowerCase() : '';
        return give.includes(query) || want.includes(query) || user.includes(query);
      });
      setFilteredTrades(filtered);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrades();
  };

  // 🚀 トレード提案時の処理（確実にチャット画面に遷移するよう調整）
  const handleTradeAction = async (item: Trade) => {
    if (requestedTradeIds.has(item.id)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 申請データをDBに保存（失敗してもチャット遷移は止めない）
        await supabase
          .from('trade_requests')
          .insert({
            trade_id: item.id,
            sender_id: user.id,
            status: '申請中',
          });
      }

      // ローカルのUI状態を即時更新
      setRequestedTradeIds((prev) => new Set(prev).add(item.id));
      setTrades((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, is_requesting: true } : t))
      );
      setFilteredTrades((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, is_requesting: true } : t))
      );

      // チャット画面へ確実に遷移
      router.push({
        pathname: '/chat',
        params: { tradeId: item.id, userName: item.user_name || '匿名ユーザー' },
      });
    } catch (err) {
      console.error('Failed to send trade request:', err);
      // 万が一エラーになっても強制遷移
      router.push({
        pathname: '/chat',
        params: { tradeId: item.id, userName: item.user_name || '匿名ユーザー' },
      });
    }
  };

  const renderItem = ({ item }: { item: Trade }) => {
    const isRequesting = requestedTradeIds.has(item.id) || item.is_requesting;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.profileSection}>
            <View style={styles.avatarPlaceholder} />
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{item.user_name || '匿名ユーザー'}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {isRequesting ? 'リクエスト中' : '募集'}
                  </Text>
                </View>
              </View>
              <Text style={styles.timeText}>200m • 5分前</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Text style={styles.moreButtonText}>⋮</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tradeItemsContainer}>
          <View style={styles.itemSection}>
            <View style={styles.itemLabelRow}>
              <View style={styles.giveTag}>
                <Text style={styles.giveTagText}>譲</Text>
              </View>
              <Text style={styles.itemNameText} numberOfLines={1}>
                {item.item_give || 'なし'}
              </Text>
            </View>
            <View style={[styles.imageContainer, isRequesting && styles.dashedImageContainer]}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.itemImage} />
              ) : (
                <View style={styles.imagePlaceholder} />
              )}
            </View>
          </View>

          <View style={styles.connectorArrow}>
            <Text style={styles.arrowText}>⇄</Text>
          </View>

          <View style={styles.itemSection}>
            <View style={styles.itemLabelRowRight}>
              <Text style={styles.itemNameTextRight} numberOfLines={1}>
                {item.item_want || 'なし'}
              </Text>
              <View style={styles.wantTag}>
                <Text style={styles.wantTagText}>求</Text>
              </View>
            </View>
            <View style={styles.imageContainer}>
              <View style={styles.imagePlaceholder} />
            </View>
          </View>
        </View>

        <View style={styles.actionArea}>
          {isRequesting ? (
            <TouchableOpacity style={styles.applyingButton} disabled>
              <Text style={styles.applyingButtonText}>リクエスト中</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.tradeButton}
              onPress={() => handleTradeAction(item)}
            >
              <Text style={styles.tradeButtonText}>トレードを提案する</Text>
            </TouchableOpacity>
          )}

          {!isRequesting && (
            <Text style={styles.noticeText}>
              ※提案すると相手に通知が届きチャットが始まります
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF7A00" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.switchTabContainer}>
          <TouchableOpacity
            style={styles.inactiveTab}
            onPress={() => router.push('/post')}
          >
            <Text style={styles.inactiveTabText}>在庫報告</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activeTab}>
            <Text style={styles.activeTabText}>トレード</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="検索キーワードを入力..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchButtonText}>検索</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={searchQuery.trim() === '' ? trades : filteredTrades}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF7A00']}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {errorMsg ? errorMsg : '該当するトレード募集がありません'}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  switchTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E8E8EA',
    borderRadius: 9999,
    padding: 4,
    marginBottom: 16,
    height: 40,
  },
  inactiveTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
  },
  inactiveTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#584235',
  },
  activeTab: {
    flex: 1,
    backgroundColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C2800',
  },
  searchBarContainer: {
    position: 'relative',
    height: 48,
    marginBottom: 16,
    justifyContent: 'center',
  },
  searchInput: {
    height: 48,
    backgroundColor: '#F3F3F6',
    borderRadius: 9999,
    paddingLeft: 16,
    paddingRight: 70,
    fontSize: 14,
    color: '#1A1C1E',
  },
  searchButton: {
    position: 'absolute',
    right: 8,
    width: 56,
    height: 28,
    backgroundColor: '#994700',
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(224, 192, 175, 0.3)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: 'rgba(153, 71, 0, 0.1)',
    backgroundColor: '#EEEEF0',
  },
  userInfo: {
    justifyContent: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  statusBadge: {
    backgroundColor: '#EEEEF0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#584235',
  },
  timeText: {
    fontSize: 11,
    color: '#584235',
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  moreButtonText: {
    fontSize: 16,
    color: '#994700',
    fontWeight: '700',
  },
  tradeItemsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  itemSection: {
    flex: 1,
    gap: 8,
  },
  itemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemLabelRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  giveTag: {
    backgroundColor: '#FF7A00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  giveTagText: {
    color: '#5C2800',
    fontSize: 10,
    fontWeight: '700',
  },
  wantTag: {
    backgroundColor: '#00A2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  wantTagText: {
    color: '#003558',
    fontSize: 10,
    fontWeight: '700',
  },
  itemNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1C1E',
    flex: 1,
  },
  itemNameTextRight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1C1E',
    textAlign: 'right',
    flex: 1,
  },
  imageContainer: {
    height: 130,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EEEEF0',
  },
  dashedImageContainer: {
    borderWidth: 1,
    borderColor: '#E0C0AF',
    borderStyle: 'dashed',
    backgroundColor: '#F3F3F6',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEEEF0',
  },
  connectorArrow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -16,
    marginTop: -4,
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0C0AF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 3,
  },
  arrowText: {
    color: '#994700',
    fontSize: 14,
    fontWeight: '700',
  },
  actionArea: {
    gap: 8,
    alignItems: 'center',
  },
  tradeButton: {
    width: '100%',
    height: 36,
    backgroundColor: '#994700',
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  applyingButton: {
    width: '100%',
    height: 36,
    backgroundColor: '#E2E2E5',
    borderWidth: 1,
    borderColor: 'rgba(153, 71, 0, 0.2)',
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyingButtonText: {
    color: '#994700',
    fontSize: 12,
    fontWeight: '700',
  },
  noticeText: {
    fontSize: 10,
    color: '#584235',
    textAlign: 'center',
  },
  emptyText: {
    color: '#888888',
    fontSize: 14,
  },
});