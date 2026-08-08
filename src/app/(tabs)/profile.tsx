import { authApi } from '@/features/auth/api/api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { profileApi, ProfileRecord } from '@/features/profile/api/api';
import { getProfileIconSource } from '@/features/profile/profile-icons';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// データ型定義
type InventoryReport = {
  id: string;
  created_at: string;
  photo_url: string;
  stock_status: number;
  stores: { name: string } | null;
  gachapons: { name: string } | null;
  gachapon_items: { name: string } | null;
};

type TradeRoomItem = {
  id: string;
  trade_id: string | null;
  status: string;
  created_at: string;
  partnerNickname?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { session, initialized } = useAuth();
  
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'activeTrade' | 'completedTrade'>('inventory');

  // データ一覧ステート
  const [inventoryReports, setInventoryReports] = useState<InventoryReport[]>([]);
  const [activeTrades, setActiveTrades] = useState<TradeRoomItem[]>([]);
  const [completedTrades, setCompletedTrades] = useState<TradeRoomItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // モーダルステート
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // 全データ取得
  const loadProfileData = useCallback(async () => {
    if (!session?.user.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const userId = session.user.id;

      // 1. プロフィール情報取得
      const { data: profileData } = await profileApi.getProfileByUserId(userId);
      if (profileData) {
        setProfile(profileData as ProfileRecord);
      }

      // 2. 在庫投稿履歴取得
      const { data: reportsData } = await supabase
        .from('reports')
        .select(`
          id,
          created_at,
          photo_url,
          stock_status,
          stores ( name ),
          gachapons ( name ),
          gachapon_items ( name )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (reportsData) {
        setInventoryReports(reportsData as unknown as InventoryReport[]);
      }

      // 3. トレード / チャットルーム履歴取得
      const { data: roomsData } = await supabase
        .from('chat_rooms')
        .select('id, trade_id, status, created_at, user_1_id, user_2_id')
        .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (roomsData) {
        const activeList: TradeRoomItem[] = [];
        const completedList: TradeRoomItem[] = [];

        for (const room of roomsData) {
          const partnerId = room.user_1_id === userId ? room.user_2_id : room.user_1_id;
          let partnerName = 'トレーダー';
          if (partnerId) {
            const { data: partnerProfile } = await profileApi.getProfileByUserId(partnerId);
            if (partnerProfile) {
              partnerName = partnerProfile.nickname || 'トレーダー';
            }
          }

          const item: TradeRoomItem = {
            id: room.id,
            trade_id: room.trade_id,
            status: room.status,
            created_at: room.created_at,
            partnerNickname: partnerName,
          };

          if (room.status === 'completed' || room.status === 'rejected') {
            completedList.push(item);
          } else {
            activeList.push(item);
          }
        }

        setActiveTrades(activeList);
        setCompletedTrades(completedList);
      }
    } catch (err) {
      console.error('プロフィールデータ読み込み失敗:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  // ログアウト処理
  const handleSignOut = async () => {
    setSettingsModalVisible(false);
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          await authApi.signOut();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  // パスワード変更処理
  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('エラー', '新しいパスワードを入力してください');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上で指定してください');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('エラー', '確認用パスワードが一致しません');
      return;
    }

    setUpdatingPassword(true);
    const { error } = await authApi.updatePassword(newPassword.trim());
    setUpdatingPassword(false);

    if (error) {
      Alert.alert('パスワード変更失敗', error.message);
    } else {
      Alert.alert('完了', 'パスワードを変更しました');
      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const getStockBadge = (status: number) => {
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

  const formatTimeAgo = (dateString: string) => {
    const diffMin = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60));
    if (diffMin < 1) return 'たった今';
    if (diffMin < 60) return `${diffMin}分前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}時間前`;
    return `${Math.floor(diffHour / 24)}日前`;
  };

  const displayName = profile?.nickname || (profile as any)?.name || 'ユーザー名未設定';
  const iconImageKey = profile?.icon_image || 'icon1';
  const bioText = profile?.self_introdution || '自己紹介文が設定されていません。';
  const starRating = profile?.evaluate_star != null ? profile.evaluate_star : 4.9;
  const tradeHistoryCount = profile?.trade_history != null ? profile.trade_history : completedTrades.length;
  const contributionLevel = profile?.contribution_level != null ? profile.contribution_level : 1;

  if (!initialized || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7A00" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>マイページ</Text>
        <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={styles.iconButton}>
          <Ionicons name="settings-outline" size={24} color="#D95C14" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7A00']} />}
      >
        {/* プロフィールメインカード */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={getProfileIconSource(iconImageKey)} style={styles.avatarImage} contentFit="cover" />
          </View>

          <Text style={styles.username}>{displayName}</Text>

          {/* 実績・スター評価・貢献度 */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FF7A00" />
                <Text style={styles.statValue}>{starRating}</Text>
              </View>
              <Text style={styles.statLabel}>評価</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tradeHistoryCount} 件</Text>
              <Text style={styles.statLabel}>トレード実績</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>Lv.{contributionLevel}</Text>
              <Text style={styles.statLabel}>貢献レベル</Text>
            </View>
          </View>

          {/* 自己紹介文 */}
          <View style={styles.bioBox}>
            <Text style={styles.bioText}>{bioText}</Text>
          </View>

          {/* プロフィール編集ボタン */}
          <TouchableOpacity style={styles.editButton} onPress={() => router.push('/profile-setup' as any)}>
            <Ionicons name="create-outline" size={18} color="#FF7A00" style={{ marginRight: 6 }} />
            <Text style={styles.editButtonText}>プロフィールを編集</Text>
          </TouchableOpacity>
        </View>

        {/* 投稿・トレード履歴 セグメントタブ */}
        <View style={styles.historySection}>
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segmentTab, activeTab === 'inventory' && styles.segmentTabActive]}
              onPress={() => setActiveTab('inventory')}
            >
              <Text style={[styles.segmentText, activeTab === 'inventory' && styles.segmentTextActive]}>
                在庫投稿 ({inventoryReports.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentTab, activeTab === 'activeTrade' && styles.segmentTabActive]}
              onPress={() => setActiveTab('activeTrade')}
            >
              <Text style={[styles.segmentText, activeTab === 'activeTrade' && styles.segmentTextActive]}>
                進行中 ({activeTrades.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentTab, activeTab === 'completedTrade' && styles.segmentTabActive]}
              onPress={() => setActiveTab('completedTrade')}
            >
              <Text style={[styles.segmentText, activeTab === 'completedTrade' && styles.segmentTextActive]}>
                終了 ({completedTrades.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* タブ別コンテンツ一覧 */}
          {activeTab === 'inventory' && (
            inventoryReports.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="document-text-outline" size={40} color="#CCC" />
                <Text style={styles.emptyText}>在庫投稿履歴がありません</Text>
              </View>
            ) : (
              inventoryReports.map((item) => {
                const badge = getStockBadge(item.stock_status);
                const title = item.gachapon_items?.name
                  ? `${item.gachapons?.name || ''} (${item.gachapon_items.name})`
                  : item.gachapons?.name || 'ガチャガチャ名未設定';

                return (
                  <View key={item.id} style={styles.historyCard}>
                    <Image
                      source={{ uri: item.photo_url || 'https://via.placeholder.com/200' }}
                      style={styles.itemImage}
                      contentFit="cover"
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {title}
                      </Text>
                      <Text style={styles.itemSubtitle}>{item.stores?.name || '店舗名未設定'}</Text>
                      <View style={styles.cardFooter}>
                        <Text style={styles.itemTime}>{formatTimeAgo(item.created_at)}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
                          <Text style={styles.statusBadgeText}>{badge.text}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )
          )}

          {activeTab === 'activeTrade' && (
            activeTrades.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="swap-horizontal-outline" size={40} color="#CCC" />
                <Text style={styles.emptyText}>進行中のトレードはありません</Text>
              </View>
            ) : (
              activeTrades.map((trade) => (
                <TouchableOpacity
                  key={trade.id}
                  style={styles.historyCard}
                  onPress={() => router.push(`/chat-room?roomId=${trade.id}` as any)}
                >
                  <View style={styles.tradeIconBox}>
                    <Ionicons name="chatbubbles" size={24} color="#FF7A00" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>取引相手: {trade.partnerNickname}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.itemTime}>{formatTimeAgo(trade.created_at)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: '#007AFF' }]}>
                        <Text style={styles.statusBadgeText}>
                          {trade.status === 'approved' ? '交渉中' : '申請中'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )
          )}

          {activeTab === 'completedTrade' && (
            completedTrades.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#CCC" />
                <Text style={styles.emptyText}>終了したトレードはありません</Text>
              </View>
            ) : (
              completedTrades.map((trade) => (
                <TouchableOpacity
                  key={trade.id}
                  style={styles.historyCard}
                  onPress={() => router.push(`/chat-room?roomId=${trade.id}` as any)}
                >
                  <View style={[styles.tradeIconBox, { backgroundColor: '#F0F0F0' }]}>
                    <Ionicons name="checkmark-done" size={24} color="#8E8E93" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>取引相手: {trade.partnerNickname}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.itemTime}>{formatTimeAgo(trade.created_at)}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: trade.status === 'completed' ? '#34C759' : '#8E8E93' },
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {trade.status === 'completed' ? 'トレード完了' : 'キャンセル/終了'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )
          )}
        </View>
      </ScrollView>

      {/* 設定メニューモーダル */}
      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSettingsModalVisible(false)}
        >
          <View style={styles.settingsMenuBox}>
            <Text style={styles.menuTitle}>アカウント設定</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setSettingsModalVisible(false);
                setPasswordModalVisible(true);
              }}
            >
              <Ionicons name="key-outline" size={20} color="#333" style={{ marginRight: 12 }} />
              <Text style={styles.menuItemText}>パスワードを変更</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setSettingsModalVisible(false);
                router.push('/privacy-policy' as any);
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#333" style={{ marginRight: 12 }} />
              <Text style={styles.menuItemText}>プライバシーポリシー</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.logoutMenuItem]} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" style={{ marginRight: 12 }} />
              <Text style={styles.logoutText}>ログアウト</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* パスワード変更モーダル */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.passwordCard}>
            <Text style={styles.passwordTitle}>パスワードの変更</Text>
            <Text style={styles.passwordDesc}>新しいパスワードを入力してください（6文字以上）。</Text>

            <TextInput
              style={styles.input}
              placeholder="新しいパスワード"
              placeholderTextColor="#999"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <TextInput
              style={styles.input}
              placeholder="新しいパスワード (確認用)"
              placeholderTextColor="#999"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>キャンセル</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitModalButton}
                onPress={handleUpdatePassword}
                disabled={updatingPassword}
              >
                {updatingPassword ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitModalButtonText}>変更する</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FAFAFA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D95C14',
  },
  iconButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F1F5F9',
    borderWidth: 3,
    borderColor: '#FF7A00',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#FFF9F5',
    borderRadius: 14,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#FFE0D1',
  },
  bioBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF7A00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF7A00',
  },
  historySection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEA',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentTabActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  segmentTextActive: {
    color: '#FF7A00',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFF',
    borderRadius: 16,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#E2E8F0',
  },
  tradeIconBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTime: {
    fontSize: 11,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settingsMenuBox: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
    marginTop: 6,
  },
  logoutText: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  passwordCard: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
  },
  passwordTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  passwordDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  cancelModalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelModalButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  submitModalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FF7A00',
  },
  submitModalButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
