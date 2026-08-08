import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, ScrollView, Platform, StatusBar, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ----------------------------------------------------
// モックデータの生成
// ----------------------------------------------------
const MOCK_GACHAPON_ID = 'c16c1902-ce13-452d-819e-386dc46b3abc';
const ITEM_MOCKS = [
  { id: '00f76fe1-6c85-49e6-8eed-cd93d2480001', gachapon_id: MOCK_GACHAPON_ID, name: 'アメ B' },
  { id: '2c1f8219-ff2d-462d-81db-2b0e298e0002', gachapon_id: MOCK_GACHAPON_ID, name: 'アメ A' },
  { id: '38961dd1-6fd2-4720-b1ab-4343c0d00003', gachapon_id: MOCK_GACHAPON_ID, name: 'ビーフ' },
  { id: '5e3b10c5-4394-4832-aae7-bf7065520004', gachapon_id: MOCK_GACHAPON_ID, name: 'カリエス A' },
  { id: '925ec6c6-2ee0-420e-9dd0-c101c9300005', gachapon_id: MOCK_GACHAPON_ID, name: 'ミカン' },
  { id: 'c9ef6bdd-806e-415b-b0b5-891e3e690006', gachapon_id: MOCK_GACHAPON_ID, name: 'カリエス B' },
];

const TRADE_BASES = [
  { 
    user: 'Kaito_Gacha', 
    place: '池袋サンシャイン付近', 
    distTime: '200m • 5分前', 
    offerItem: ITEM_MOCKS[0], 
    requestItem: ITEM_MOCKS[1], 
    gachapon_id: MOCK_GACHAPON_ID,
    status: 'active',
    info: '※相手が申請を承認するとマッチングが成立し、チャットが解放されます',
    userColor: '#E1F5FE'
  },
  { 
    user: 'Mina_Chan', 
    place: '渋谷駅', 
    distTime: '1.2km • 15分前', 
    offerItem: ITEM_MOCKS[4], 
    requestItem: ITEM_MOCKS[3], 
    gachapon_id: MOCK_GACHAPON_ID,
    status: 'trading',
    userColor: '#FCE4EC'
  },
  { 
    user: 'GachaMaster_99', 
    place: '秋葉原駅周辺', 
    distTime: '3.6km • 1時間前', 
    offerItem: ITEM_MOCKS[3], 
    requestItem: ITEM_MOCKS[5], 
    gachapon_id: MOCK_GACHAPON_ID,
    status: 'active',
    userColor: '#E8F5E9'
  },
];

const MY_INVENTORY_MOCKS = [
  { id: 'inv_1', item: ITEM_MOCKS[1], isUsed: false }, // アメ A
  { id: 'inv_2', item: ITEM_MOCKS[2], isUsed: true },  // ビーフ (他で申請中)
  { id: 'inv_3', item: ITEM_MOCKS[5], isUsed: false }, // カリエス B
];

const MOCK_TRADES = Array.from({ length: 20 }).map((_, i) => {
  const hex = i.toString(16).padStart(12, '0');
  return {
    id: `00000000-0000-0000-0000-${hex}`,
    ...TRADE_BASES[i % 3],
  };
});

const INVENTORY_BASES = [
  { shop: 'ガシャポンバンダイオフィシャルショップ', itemName: 'ちいかわ 目印チャーム2', status: '在庫あり', statusColor: '#FF7A00', time: '10分前', user: 'UserA' },
  { shop: 'ガシャポンのデパート', itemName: 'ハチワレ (うさぎ)', status: '残りわずか', statusColor: '#007AFF', time: '25分前', user: 'UserB' },
  { shop: 'ガチャガチャの森', itemName: 'うさぎ (楽器)', status: '売り切れ', statusColor: '#8E8E93', time: '1時間前', user: 'UserC' },
];

const MOCK_INVENTORIES = Array.from({ length: 20 }).map((_, i) => ({
  id: `inv_${i}`,
  ...INVENTORY_BASES[i % 3],
}));

// ----------------------------------------------------
// メインコンポーネント
// ----------------------------------------------------
export default function PostScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory' | 'trade'>('trade');
  const [isApplying, setIsApplying] = useState(false);
  const [selectedTradeForApply, setSelectedTradeForApply] = useState<typeof MOCK_TRADES[0] | null>(null);

  const handleConfirmApplyTrade = async (trade: typeof MOCK_TRADES[0], myItem: typeof ITEM_MOCKS[0]) => {
    // 1. gachapon_id が一致するか確認
    if (trade.gachapon_id !== myItem.gachapon_id) {
      alert('選択したアイテムのガシャポンシリーズが一致しません。');
      return;
    }
    // 2. アイテムID が一致するか確認 (相手が欲しいもの === 自分が提供するもの)
    if (trade.requestItem.id !== myItem.id) {
      alert(`相手が希望しているアイテム（${trade.requestItem.name}）と一致しません。`);
      return;
    }

    // 審査通過
    setSelectedTradeForApply(null);
    await handleApplyTrade(trade);
  };

  const handleApplyTrade = async (trade: typeof MOCK_TRADES[0]) => {
    if (!session?.user.id || isApplying) return;
    setIsApplying(true);
    try {
      // テスト用：DBから自分以外のユーザーを取得してランダムな相手とする
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id')
        .neq('id', session.user.id)
        .limit(10);
        
      // eslint-disable-next-line react-hooks/purity
      const randomIndex = profilesData ? Math.floor(Math.random() * profilesData.length) : 0;
      const partnerId = profilesData && profilesData.length > 0 
        ? profilesData[randomIndex].id 
        : session.user.id;

      // 外部キー制約エラー回避のため、既存の trades または chat_rooms から実在する trade_id を取得
      const { data: existingTrade } = await supabase
        .from('trades')
        .select('id')
        .limit(1)
        .single();
        
      let realTradeId = existingTrade?.id;
      
      if (!realTradeId) {
        const { data: validRoom } = await supabase
          .from('chat_rooms')
          .select('trade_id')
          .not('trade_id', 'is', null)
          .limit(1)
          .single();
        realTradeId = validRoom?.trade_id;
      }

      // どちらからも取得できない場合はエラーとする
      if (!realTradeId) {
        alert('DBに有効なtradeデータがありません。テスト用にSupabaseでtradesテーブルに1件データを作成してください。');
        setIsApplying(false);
        return;
      }

      // 既に同じ相手とのチャットがあるか確認（モックなのでtrade_idの重複を避けるため相手で判定）
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('user_1_id', session.user.id)
        .eq('user_2_id', partnerId)
        .single();

      if (existingRoom) {
        router.push(`/chat-room?roomId=${existingRoom.id}`);
        return;
      }

      // なければ新規作成
      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({
          trade_id: realTradeId,
          user_1_id: session.user.id,
          user_2_id: partnerId,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;

      // 最初のシステムメッセージを送信
      await supabase
        .from('chat_messages')
        .insert({
          room_id: newRoom.id,
          sender_id: session.user.id,
          message: '【システムメッセージ】\n交換申請を送りました。相手の承認をお待ちください。'
        });

      router.push(`/chat-room?roomId=${newRoom.id}`);
    } catch (e) {
      console.error(e);
      alert('交換申請の送信に失敗しました');
    } finally {
      setIsApplying(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      if (__DEV__) console.log('PostScreen: focused');
      return () => {
        if (__DEV__) console.log('PostScreen: blurred');
      };
    }, [])
  );

  // トレードカードの描画
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
          <Text style={styles.tradeItemName} numberOfLines={1}>{item.offerItem.name}</Text>
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
          <Text style={styles.tradeItemName} numberOfLines={1}>{item.requestItem.name}</Text>
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
            onPress={() => setSelectedTradeForApply(item)}
            disabled={isApplying}
          >
            {isApplying ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.actionButtonTextActive}>交換申請を送る</Text>
            )}
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

  // 在庫カードの描画
  const renderInventoryCard = ({ item }: { item: typeof MOCK_INVENTORIES[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: '#F0F0F0' }]}>
             <Ionicons name="person" size={20} color="#999" />
          </View>
          <View style={styles.userNameContainer}>
            <Text style={styles.userName}>{item.user}</Text>
            <View style={styles.placeBadge}>
              <Text style={styles.placeBadgeText}>{item.shop}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color="#D95C14" />
        </TouchableOpacity>
      </View>
      <Text style={styles.distTimeText}>{item.time}</Text>

      <View style={styles.inventoryContent}>
        <Image
          source={{ uri: `https://picsum.photos/seed/${item.id}_inv/200/200` }}
          style={[styles.itemImagePlaceholderInv, { overflow: 'hidden' }]}
          contentFit="cover"
        />
        <View style={styles.inventoryInfo}>
           <Text style={styles.inventoryItemName}>{item.itemName}</Text>
           <Text style={[styles.inventoryStatus, { color: item.statusColor }]}>{item.status}</Text>
        </View>
      </View>
    </View>
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
        {activeTab === 'trade' ? (
          <FlatList
            data={MOCK_TRADES}
            keyExtractor={(item) => item.id}
            renderItem={renderTradeCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={MOCK_INVENTORIES}
            keyExtractor={(item) => item.id}
            renderItem={renderInventoryCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

      </View>

      {/* 在庫選択モーダル */}
      <Modal
        visible={!!selectedTradeForApply}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTradeForApply(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setSelectedTradeForApply(null)} />
          <View style={styles.modalContentWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>提供するアイテムを選択</Text>
              <TouchableOpacity onPress={() => setSelectedTradeForApply(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              相手の希望: <Text style={{fontWeight: 'bold', color: '#D95C14'}}>{selectedTradeForApply?.requestItem.name}</Text>
            </Text>
            
            <ScrollView style={styles.inventoryList}>
              {MY_INVENTORY_MOCKS.map((inv) => (
                <TouchableOpacity 
                  key={inv.id} 
                  style={[styles.inventorySelectItem, inv.isUsed && { opacity: 0.5 }]}
                  disabled={inv.isUsed}
                  onPress={() => handleConfirmApplyTrade(selectedTradeForApply!, inv.item)}
                >
                  <Image
                    source={{ uri: `https://picsum.photos/seed/${inv.item.id}/100/100` }}
                    style={styles.inventorySelectItemImage}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inventorySelectItemName}>{inv.item.name}</Text>
                    {inv.isUsed && (
                      <Text style={{ fontSize: 12, color: '#D95C14', marginTop: 4, fontWeight: 'bold' }}>
                        ※他のトレードで申請中
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#8D6E63', // 茶色
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCloseArea: {
    flex: 1,
  },
  modalContentWrapper: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  inventoryList: {
    // ScrollViewの高さは親に依存させる
  },
  inventorySelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 12,
  },
  inventorySelectItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  inventorySelectItemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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
    justifyContent: 'center',
    alignItems: 'center',
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
  }
});
