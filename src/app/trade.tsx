import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// 🕓 投稿時間を綺麗にフォーマットする関数
const formatTimeAgo = (dateString?: string) => {
  if (!dateString) return 'たった今';
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'たった今';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}分前`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}時間前`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}日前`;

  return past.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TradeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [trades, setTrades] = useState<any[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestedTradeIds, setRequestedTradeIds] = useState<string[]>([]);

  // ローカルで入力されたテキスト情報を一時保存する辞書
  const [customTradeDetails, setCustomTradeDetails] = useState<{
    [id: string]: { user_name: string; item_give: string; item_want: string };
  }>({});

  // 投稿モーダル用の状態
  const [modalVisible, setModalVisible] = useState(false);
  const [userName, setUserName] = useState('');
  const [itemGive, setItemGive] = useState('');
  const [itemWant, setItemWant] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Supabaseからトレード一覧＆自身の申請履歴を取得
  const fetchTrades = async () => {
    try {
      setLoading(true);

      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false });

      if (tradeError) {
        console.error('Supabase Error:', tradeError.message);
      } else if (tradeData) {
        setTrades(tradeData);
        setFilteredTrades(tradeData);
      }

      const { data: requestData, error: requestError } = await supabase
        .from('trade_requests')
        .select('trade_id');

      if (!requestError && requestData) {
        const ids = requestData.map((req) => req.trade_id);
        setRequestedTradeIds(ids);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();

    // Supabase Realtimeで自動更新
    const channel = supabase
      .channel('public:trades')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades' },
        () => {
          fetchTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 検索処理
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredTrades(trades);
      return;
    }

    const query = text.toLowerCase();
    const filtered = trades.filter((item) => {
      const details = customTradeDetails[item.id] || {};
      const give = details.item_give || item.item_give || '';
      const want = details.item_want || item.item_want || '';
      const user = details.user_name || item.user_name || '';

      return (
        give.toLowerCase().includes(query) ||
        want.toLowerCase().includes(query) ||
        user.toLowerCase().includes(query)
      );
    });

    setFilteredTrades(filtered);
  };

  // 新規トレードをSupabaseに投稿
  const handleCreateTrade = async () => {
    if (!itemGive.trim() || !itemWant.trim()) {
      const msg = '「譲るグッズ」と「求めるグッズ」を入力してください';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('入力エラー', msg);
      return;
    }

    try {
      setSubmitting(true);

      const payload: any = {
        status: 1,
        photo_url: photoUrl.trim() || 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=300',
      };

      const { data, error } = await supabase
        .from('trades')
        .insert([payload])
        .select();

      if (error) {
        console.error('Create Error Detail:', error);
        const errAlert = `投稿失敗: ${error.message}`;
        if (Platform.OS === 'web') window.alert(errAlert);
        else Alert.alert('エラー', errAlert);
      } else if (data && data[0]) {
        const createdItem = data[0];

        // 🌟 入力されたテキスト情報を ID に紐付けて保持
        setCustomTradeDetails((prev) => ({
          ...prev,
          [createdItem.id]: {
            user_name: userName.trim() || 'ガチャ好きトレーダー',
            item_give: itemGive.trim(),
            item_want: itemWant.trim(),
          },
        }));

        const successMsg = '出品が完了しました！';
        if (Platform.OS === 'web') window.alert(successMsg);
        else Alert.alert('完了', successMsg);

        setUserName('');
        setItemGive('');
        setItemWant('');
        setPhotoUrl('');
        setModalVisible(false);
      }
    } catch (err) {
      console.error('Create Catch:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Supabaseに交換申請を送信
  const sendTradeRequest = async (tradeId: string) => {
    try {
      setRequestingId(tradeId);

      const { error } = await supabase
        .from('trade_requests')
        .insert([{ trade_id: tradeId, status: 0 }]);

      if (error) {
        console.error('Request Error:', error.message);
        const errAlert = '申請の送信に失敗しました。';
        if (Platform.OS === 'web') window.alert(errAlert);
        else Alert.alert('エラー', errAlert);
      } else {
        setRequestedTradeIds((prev) => [...prev, tradeId]);

        const successMsg = '交換申請を送信しました！チャット画面へ移動します。';
        if (Platform.OS === 'web') {
          window.alert(successMsg);
          router.push('/chat');
        } else {
          Alert.alert('送信完了', successMsg, [
            {
              text: 'チャットを開く',
              onPress: () => router.push('/chat'),
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Send Request Catch:', err);
    } finally {
      setRequestingId(null);
    }
  };

  const handleTradeRequest = (item: any) => {
    const message = `このトレードに交換申請を送りますか？`;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        sendTradeRequest(item.id);
      }
    } else {
      Alert.alert('確認', message, [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '送信する',
          onPress: () => sendTradeRequest(item.id),
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerWrapper}>
        {/* 1. 検索バー ＆ 出品ボタン */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="検索キーワードを入力..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.postBtn}
            activeOpacity={0.8}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.postBtnText}>＋ 出品する</Text>
          </TouchableOpacity>
        </View>

        {/* 2. トレードカードリスト */}
        {loading ? (
          <ActivityIndicator size="large" color="#994700" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredTrades}
            keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>該当するトレードが見つかりません</Text>
            }
            renderItem={({ item }) => {
              const isRequested = requestedTradeIds.includes(item.id);
              
              // 🌟 入力されたテキストの反映（カスタム設定があれば優先）
              const details = customTradeDetails[item.id];
              const displayUserName = details?.user_name || item.user_name || 'ガチャ好きトレーダー';
              const displayItemGive = details?.item_give || item.item_give || '出品グッズ';
              const displayItemWant = details?.item_want || item.item_want || '交換希望品';

              const avatarInitial = displayUserName[0]?.toUpperCase() || 'U';
              const timeDisplay = formatTimeAgo(item.created_at);

              return (
                <View style={styles.tradeCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{avatarInitial}</Text>
                      </View>
                      <View>
                        <Text style={styles.userNameText}>{displayUserName}</Text>
                        <Text style={styles.timeText}>{timeDisplay}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.itemsSection}>
                    <View style={styles.itemBox}>
                      <View style={styles.badgeRow}>
                        <View style={styles.badgeGive}>
                          <Text style={styles.badgeText}>譲</Text>
                        </View>
                        <Text style={styles.itemTitleText} numberOfLines={1}>
                          {displayItemGive}
                        </Text>
                      </View>
                      <View style={styles.imageContainer}>
                        {item.photo_url ? (
                          <Image source={{ uri: item.photo_url }} style={styles.itemImage} />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <Text style={{ fontSize: 20, color: '#CCC' }}>🖼️</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.arrowCircle}>
                      <Text style={styles.arrowText}>⇅</Text>
                    </View>

                    <View style={styles.itemBox}>
                      <View style={[styles.badgeRow, { justifyContent: 'flex-end' }]}>
                        <Text style={styles.itemTitleText} numberOfLines={1}>
                          {displayItemWant}
                        </Text>
                        <View style={styles.badgeWant}>
                          <Text style={styles.badgeText}>求</Text>
                        </View>
                      </View>
                      <View style={styles.wantTextContainer}>
                        <Text style={styles.wantTitleText}>
                          {displayItemWant}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.btnPrimary,
                      isRequested && styles.btnDisabled,
                      requestingId === item.id && { opacity: 0.6 },
                    ]}
                    activeOpacity={0.8}
                    disabled={isRequested || requestingId === item.id}
                    onPress={() => handleTradeRequest(item)}
                  >
                    {requestingId === item.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.btnPrimaryText, isRequested && styles.btnDisabledText]}>
                        {isRequested ? '申請済み' : '交換申請を送る'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* 3. 新規出品用モーダル */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新規トレード出品</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>ユーザー名</Text>
              <TextInput
                style={styles.formInput}
                placeholder="例: ガチャ好き太郎"
                value={userName}
                onChangeText={setUserName}
              />

              <Text style={styles.label}>譲るグッズ (必須)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="例: ハチワレ（おやすみ）"
                value={itemGive}
                onChangeText={setItemGive}
              />

              <Text style={styles.label}>求めるグッズ (必須)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="例: うさぎ（スポーツ）"
                value={itemWant}
                onChangeText={setItemWant}
              />

              <Text style={styles.label}>画像URL (任意)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="https://..."
                value={photoUrl}
                onChangeText={setPhotoUrl}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>キャンセル</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCreateTrade}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>出品する</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centerWrapper: { flex: 1, maxWidth: 390, width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16 },
  searchSection: { marginBottom: 16, gap: 10 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F3F6', borderRadius: 9999, paddingLeft: 12, paddingRight: 12, height: 44 },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1C1E' },
  clearBtn: { padding: 4 },
  clearBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: 'bold' },
  postBtn: { backgroundColor: '#FF7A00', borderRadius: 9999, paddingVertical: 10, alignItems: 'center' },
  postBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  listContent: { gap: 16, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: '#8C7263', marginTop: 40, fontSize: 14 },
  tradeCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(224, 192, 175, 0.3)', borderRadius: 16, padding: 16, gap: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#00A8FF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  userNameText: { fontSize: 13, fontWeight: 'bold', color: '#1A1C1E' },
  timeText: { fontSize: 11, color: '#8C7263' },
  itemsSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative', marginVertical: 4 },
  itemBox: { flex: 1, gap: 6 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeGive: { backgroundColor: '#FF7A00', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeWant: { backgroundColor: '#00A2FD', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' },
  itemTitleText: { fontSize: 11, fontWeight: 'bold', color: '#1A1C1E' },
  imageContainer: { width: '100%', height: 110, borderRadius: 8, overflow: 'hidden' },
  itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#F3F3F6', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  wantTextContainer: { height: 110, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  wantTitleText: { fontSize: 13, fontWeight: 'bold', color: '#1A1C1E', textAlign: 'center' },
  arrowCircle: { position: 'absolute', left: '50%', top: '50%', transform: [{ translateX: -14 }, { translateY: -7 }], width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0C0AF', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  arrowText: { color: '#994700', fontWeight: 'bold', fontSize: 12 },
  btnPrimary: { backgroundColor: '#994700', borderRadius: 9999, paddingVertical: 10, alignItems: 'center' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  btnDisabled: { backgroundColor: '#E5E7EB' },
  btnDisabledText: { color: '#9CA3AF' },

  /* モーダルのスタイル */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360, maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1C1E', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#4B5563', marginTop: 10, marginBottom: 4 },
  formInput: { backgroundColor: '#F3F3F6', borderRadius: 8, paddingHorizontal: 12, height: 40, fontSize: 13, color: '#1A1C1E' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 9999, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
  cancelBtnText: { color: '#6B7280', fontSize: 12, fontWeight: 'bold' },
  submitBtn: { flex: 1, backgroundColor: '#FF7A00', paddingVertical: 10, borderRadius: 9999, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
});