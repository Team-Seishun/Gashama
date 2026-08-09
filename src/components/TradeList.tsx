import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { getProfileIconSource } from '@/features/profile/profile-icons';
import SearchBar from '@/components/SearchBar';

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
  profiles?: any;
  stores?: any;
}

export default function TradeList() {
  const router = useRouter();
  const { filterType, filterId, filterName } = useLocalSearchParams<{
    filterType: string;
    filterId: string;
    filterName: string;
  }>();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [requestedTradeIds, setRequestedTradeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTrades = async () => {
    try {
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .select('id, user_id, store_id, item_give, item_want, user_name, status, created_at, gachapon_id, photo_url, profiles(icon_image), stores(name)')
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
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let filtered = trades;
    
    if (filterType === 'store' && filterId) {
      filtered = trades.filter(trade => trade.store_id === filterId);
    } else if (filterType === 'gachapon' && filterId) {
      filtered = trades.filter(trade => trade.gachapon_id === filterId);
    }

    setFilteredTrades(filtered);
    if (filtered.length === 0 && trades.length > 0) {
      setErrorMsg('条件に一致するトレードがありません');
    } else {
      setErrorMsg(null);
    }
  }, [filterType, filterId, trades]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrades();
  };

  const handleTradeAction = async (item: Trade) => {
    if (requestedTradeIds.has(item.id)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('trade_requests')
          .insert({
            trade_id: item.id,
            sender_id: user.id,
            status: '申請中',
          });
      }

      setRequestedTradeIds((prev) => new Set(prev).add(item.id));
      setTrades((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, is_requesting: true } : t))
      );
      setFilteredTrades((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, is_requesting: true } : t))
      );

      router.push({
        pathname: '/chat',
        params: { tradeId: item.id, userName: item.user_name || '匿名ユーザー' },
      });
    } catch (err) {
      console.error('Failed to send trade request:', err);
      router.push({
        pathname: '/chat',
        params: { tradeId: item.id, userName: item.user_name || '匿名ユーザー' },
      });
    }
  };

  const renderItem = ({ item }: { item: Trade }) => {
    const isRequesting = requestedTradeIds.has(item.id) || item.is_requesting;
    const colors = ['#E1F5FE', '#FCE4EC', '#E8F5E9', '#FFF3E0', '#F3E5F5'];
    const colorIndex = (item.user_name || '').length % colors.length;
    const userColor = colors[colorIndex];
    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    const store = Array.isArray(item.stores) ? item.stores[0] : item.stores;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.profileSection}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: userColor, overflow: 'hidden' }]}>
              {profile?.icon_image ? (
                <Image
                  source={getProfileIconSource(profile.icon_image)}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="person" size={20} color="#999" />
              )}
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{item.user_name || '匿名ユーザー'}</Text>
                {store?.name && (
                  <View style={styles.placeBadge}>
                    <Text style={styles.placeBadgeText} numberOfLines={1}>
                      {store.name}
                    </Text>
                  </View>
                )}
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
            <Ionicons name="ellipsis-vertical" size={20} color="#D95C14" />
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
                <Image source={{ uri: item.photo_url }} style={styles.itemImage} contentFit="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={30} color="#CCC" />
                </View>
              )}
            </View>
          </View>

          <View style={styles.connectorArrow}>
            <Ionicons name="swap-horizontal" size={16} color="#994700" />
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
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={30} color="#CCC" />
              </View>
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
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  placeBadge: {
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 120,
  },
  placeBadgeText: {
    fontSize: 10,
    color: '#D95C14',
    fontWeight: '600',
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
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEEEF0',
    justifyContent: 'center',
    alignItems: 'center',
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
