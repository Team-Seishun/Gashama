import SearchBar from '@/components/SearchBar';
import { Profile, Store, formatTimeAgo } from '@/components/InventoryCard';
import { getProfileIconSource } from '@/features/profile/profile-icons';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';

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
  profiles?: Profile | Profile[];
  stores?: Store | Store[];
  gachapons?: { name: string } | { name: string }[];
}

export default function TradeList() {
  const router = useRouter();
  const { filterType, filterId, filterName } = useLocalSearchParams<{
    filterType: string;
    filterId: string;
    filterName: string;
  }>();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [requestedTradeIds, setRequestedTradeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);


  const fetchTrades = async () => {
    try {
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .select('id, user_id, store_id, item_give, item_want, user_name, status, created_at, gachapon_id, photo_url, profiles(icon_image), stores(name), gachapons(name)')
        .order('created_at', { ascending: false });

      if (tradeError) {
        console.error('Error fetching trades:', tradeError);
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
    const loadInitialData = async () => {
      await fetchTrades();
    };
    loadInitialData();

    const channel = supabase
      .channel('schema-db-changes-trades')
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
      channel.unsubscribe();
    };
  }, []);

  const filteredTrades = useMemo(() => {
    let filtered = trades;

    if (filterType === 'store' && filterId) {
      filtered = trades.filter(trade => trade.store_id === filterId);
    } else if (filterType === 'gachapon' && filterId) {
      filtered = trades.filter(trade => trade.gachapon_id === filterId);
    }

    return filtered;
  }, [filterType, filterId, trades]);

  const errorMsg = filteredTrades.length === 0 && trades.length > 0 
    ? '条件に一致するトレードがありません' 
    : null;

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrades();
  };

  const handleTradeAction = useCallback(async (item: Trade) => {
    if (requestedTradeIds.has(item.id)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      // 1. trade_requests に登録
      await supabase
        .from('trade_requests')
        .insert({
          trade_id: item.id,
          sender_id: user.id,
          status: '申請中',
        });

      // 2. 既存の chat_room を探す
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('trade_id', item.id)
        .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
        .maybeSingle();

      let targetRoomId = existingRoom?.id;

      // 3. なければ新規作成
      if (!targetRoomId) {
        const partnerId = item.user_id && item.user_id !== user.id ? item.user_id : user.id;

        const { data: newRoom, error: createError } = await supabase
          .from('chat_rooms')
          .insert({
            trade_id: item.id,
            user_1_id: user.id,
            user_2_id: partnerId,
            status: 'pending',
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating chat room:', createError);
        } else if (newRoom) {
          targetRoomId = newRoom.id;

          // 最初のシステムメッセージを送る
          await supabase.from('chat_messages').insert({
            room_id: newRoom.id,
            sender_id: user.id,
            message: '【システムメッセージ】\n交換申請を送りました。相手の承認をお待ちください。',
          });
        }
      }

      setRequestedTradeIds((prev) => new Set(prev).add(item.id));
      setTrades((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, is_requesting: true } : t))
      );

      if (targetRoomId) {
        router.push(`/chat-room?roomId=${targetRoomId}`);
      } else {
        router.push('/(tabs)/chat' as any);
      }
    } catch (err) {
      console.error('Failed to send trade request:', err);
      Alert.alert('エラー', 'トレードリクエストの送信に失敗しました');
    }
  }, [requestedTradeIds, router]);

  const renderItem = useCallback(({ item }: { item: Trade }) => {
    const isRequesting = requestedTradeIds.has(item.id) || item.is_requesting;
    const colors = ['#E1F5FE', '#FCE4EC', '#E8F5E9', '#FFF3E0', '#F3E5F5'];
    const colorIndex = (item.user_name || '').length % colors.length;
    const userColor = colors[colorIndex];
    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    const store = Array.isArray(item.stores) ? item.stores[0] : item.stores;
    const gachapon = Array.isArray(item.gachapons) ? item.gachapons[0] : item.gachapons;

    return (
      <View style={styles.card}>
        {/* 1段目: ユーザーヘッダー */}
        <View style={styles.cardHeader}>
          <View style={styles.profileSection}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: userColor }]}>
              {profile?.icon_image ? (
                <Image
                  source={getProfileIconSource(profile.icon_image)}
                  style={styles.avatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Ionicons name="person" size={18} color="#64748B" />
              )}
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName} numberOfLines={1}>{item.user_name || '匿名ユーザー'}</Text>
                <View style={[styles.statusBadge, isRequesting && styles.statusBadgeRequesting]}>
                  <Text style={[styles.statusBadgeText, isRequesting && styles.statusBadgeTextRequesting]}>
                    {isRequesting ? 'リクエスト中' : '募集'}
                  </Text>
                </View>
              </View>
              <Text style={styles.timeText}>
                200m • {item.created_at ? formatTimeAgo(item.created_at) : '不明'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 2段目: 店舗 & ガチャポン タグエリア (2行分離) */}
        {(store?.name || gachapon?.name) && (
          <View style={styles.tagColumn}>
            {store?.name && (
              <View style={styles.placeBadge}>
                <Ionicons name="location" size={11} color="#EA580C" style={{ marginRight: 3 }} />
                <Text style={styles.placeBadgeText} numberOfLines={1}>
                  {store.name}
                </Text>
              </View>
            )}
            {gachapon?.name && (
              <View style={styles.gachaponBadge}>
                <Ionicons name="cube" size={11} color="#2563EB" style={{ marginRight: 3 }} />
                <Text style={styles.gachaponBadgeText} numberOfLines={1}>
                  {gachapon.name}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 出・求 コンテンツ */}
        <View style={styles.tradeItemsContainer}>
          <View style={styles.itemSection}>
            <View style={[styles.imageContainer, isRequesting && styles.dashedImageContainer]}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.itemImage} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={28} color="#CBD5E1" />
                </View>
              )}
            </View>
            <View style={styles.itemLabelRow}>
              <View style={styles.giveTag}>
                <Text style={styles.giveTagText}>譲</Text>
              </View>
              <Text style={styles.itemNameText} numberOfLines={2}>
                {item.item_give || 'なし'}
              </Text>
            </View>
          </View>

          <View style={styles.connectorArrow}>
            <Ionicons name="swap-horizontal" size={18} color="#EA580C" />
          </View>

          <View style={styles.itemSection}>
            <View style={styles.imageContainer}>
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={28} color="#CBD5E1" />
              </View>
            </View>
            <View style={styles.itemLabelRow}>
              <View style={styles.wantTag}>
                <Text style={styles.wantTagText}>求</Text>
              </View>
              <Text style={styles.itemNameText} numberOfLines={2}>
                {item.item_want || 'なし'}
              </Text>
            </View>
          </View>
        </View>

        {/* アクションボタン */}
        <View style={styles.actionArea}>
          {isRequesting ? (
            <TouchableOpacity style={styles.applyingButton} disabled>
              <Text style={styles.applyingButtonText}>リクエスト中</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.tradeButton}
              activeOpacity={0.85}
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
  }, [requestedTradeIds, handleTradeAction]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF7A00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <SearchBar
          value={filterName || ''}
          onPress={() => router.push({ pathname: '/search', params: { returnTo: 'post', activeTab: 'trade' } })}
          onClear={() => router.setParams({ filterType: '', filterId: '', filterName: '' })}
        />
      </View>

      <FlashList
        data={filterType ? filteredTrades : trades}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    justifyContent: 'center',
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  tagColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: -2,
  },
  placeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    maxWidth: '100%',
  },
  placeBadgeText: {
    fontSize: 10,
    color: '#C2410C',
    fontWeight: '600',
    flexShrink: 1,
  },
  gachaponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    maxWidth: '100%',
  },
  gachaponBadgeText: {
    fontSize: 10,
    color: '#1D4ED8',
    fontWeight: '600',
    flexShrink: 1,
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '700',
  },
  statusBadgeRequesting: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusBadgeTextRequesting: {
    color: '#DC2626',
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  moreButton: {
    padding: 6,
    borderRadius: 20,
  },
  tradeItemsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
  },
  itemSection: {
    flex: 1,
    gap: 8,
  },
  itemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
  },
  giveTag: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  giveTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  wantTag: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  wantTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  itemNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    lineHeight: 16,
  },
  imageContainer: {
    height: 124,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  dashedImageContainer: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#F1F5F9',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectorArrow: {
    position: 'absolute',
    left: '50%',
    top: 74,
    marginLeft: -17,
    marginTop: -17,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionArea: {
    gap: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  tradeButton: {
    width: '100%',
    height: 42,
    backgroundColor: '#EA580C',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  tradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  applyingButton: {
    width: '100%',
    height: 42,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyingButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  noticeText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
