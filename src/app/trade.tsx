import { supabase } from '@/utils/supabase'; // パスがapiの場合は '@/api/supabase' に書き換えてください
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Figma通りのデータ構成
const MOCK_TRADES = [
  {
    id: '1',
    user_name: 'Kaito_Gacha',
    location: '池袋サンシャイン付近',
    time: '200m • 5分前',
    item_give: 'ハチワレ（おやすみ）',
    item_want: 'うさぎ（スポーツ）',
    give_image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=300',
    status: 'open', // 交換申請を送る
  },
  {
    id: '2',
    user_name: 'Mina_Chan',
    location: '渋谷駅',
    time: '1.2km • 15分前',
    item_give: 'モモンガ（立ち姿）',
    item_want: 'ちいかわ（ラーメン）',
    give_image: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=300',
    status: 'in_progress', // 他の方と取引中
  },
  {
    id: '3',
    user_name: 'GachaMaster_99',
    location: '秋葉原駅周辺',
    time: '3.5km • 1時間前',
    item_give: 'サンリオコラボ A',
    item_want: 'サンリオコラボ D',
    give_image: null,
    status: 'applying', // 申請中
  },
];

export default function TradeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setTrades(data);
      } else {
        setTrades(MOCK_TRADES); // データがない場合はFigma完全再現モックを使用
      }
    } catch (err) {
      setTrades(MOCK_TRADES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerWrapper}>
        {/* 1. 検索バー & 検索キーワード候補 */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="検索キーワードを入力..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8}>
              <Text style={styles.searchBtnText}>検索</Text>
            </TouchableOpacity>
          </View>

          {/* キーワード候補 */}
          <View style={styles.suggestContainer}>
            <TouchableOpacity style={styles.suggestRow}>
              <Text style={styles.suggestIcon}>🔍</Text>
              <Text style={styles.suggestText}>ちいかわ（ハチワレ）</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.suggestRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.suggestIcon}>🔍</Text>
              <Text style={styles.suggestText}>サンリオ（シナモロール）</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. トレードカードリスト */}
        {loading ? (
          <ActivityIndicator size="large" color="#994700" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={trades}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.tradeCard}>
                {/* ユーザー情報ヘッダー */}
                <View style={styles.cardHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.user_name?.[0] || 'G'}</Text>
                    </View>
                    <View>
                      <View style={styles.userNameRow}>
                        <Text style={styles.userNameText}>{item.user_name}</Text>
                        {item.location && (
                          <View style={styles.locationBadge}>
                            <Text style={styles.locationText}>{item.location}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.timeText}>{item.time || '5分前'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.moreBtn}>
                    <Text style={styles.moreIcon}>⋮</Text>
                  </TouchableOpacity>
                </View>

                {/* アイテム交換表示エリア */}
                <View style={styles.itemsSection}>
                  {/* 譲アイテム */}
                  <View style={styles.itemBox}>
                    <View style={styles.badgeRow}>
                      <View style={styles.badgeGive}>
                        <Text style={styles.badgeText}>譲</Text>
                      </View>
                      <Text style={styles.itemTitleText} numberOfLines={1}>{item.item_give}</Text>
                    </View>
                    <View style={styles.imageContainer}>
                      {item.give_image ? (
                        <Image source={{ uri: item.give_image }} style={styles.itemImage} />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Text style={{ fontSize: 24, color: '#CCC' }}>🖼️</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* 中央の交換矢印 */}
                  <View style={styles.arrowCircle}>
                    <Text style={styles.arrowText}>⇅</Text>
                  </View>

                  {/* 求アイテム */}
                  <View style={styles.itemBox}>
                    <View style={[styles.badgeRow, { justifyContent: 'flex-end' }]}>
                      <Text style={styles.itemTitleText} numberOfLines={1}>{item.item_want}</Text>
                      <View style={styles.badgeWant}>
                        <Text style={styles.badgeText}>求</Text>
                      </View>
                    </View>
                    <View style={styles.wantTextContainer}>
                      <Text style={styles.wantTitleText}>{item.item_want}</Text>
                    </View>
                  </View>
                </View>

                {/* ボタン & 説明文 */}
                {item.status === 'open' && (
                  <View style={styles.actionArea}>
                    <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.8}>
                      <Text style={styles.btnPrimaryText}>交換申請を送る</Text>
                    </TouchableOpacity>
                    <Text style={styles.subNote}>
                      ※相手が申請を承認するとマッチングが成立し、チャットが開設されます
                    </Text>
                  </View>
                )}

                {item.status === 'in_progress' && (
                  <View style={styles.btnDisabled}>
                    <Text style={styles.btnDisabledText}>他の方と取引中</Text>
                  </View>
                )}

                {item.status === 'applying' && (
                  <View style={styles.btnApplying}>
                    <Text style={styles.btnApplyingText}>申請中</Text>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  // モバイルサイズ（最大幅390px）に固定して中央寄せ
  centerWrapper: {
    flex: 1,
    maxWidth: 390,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchSection: {
    gap: 8,
    marginBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F6',
    borderRadius: 9999,
    paddingLeft: 12,
    paddingRight: 6,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1A1C1E',
  },
  searchBtn: {
    backgroundColor: '#994700',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  suggestContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(224, 192, 175, 0.3)',
    paddingHorizontal: 12,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F6',
    gap: 8,
  },
  suggestIcon: {
    fontSize: 12,
    color: '#8C7263',
  },
  suggestText: {
    fontSize: 13,
    color: '#1A1C1E',
  },
  listContent: {
    gap: 16,
    paddingBottom: 40,
  },
  // カード
  tradeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(224, 192, 175, 0.3)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00A8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userNameText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A1C1E',
  },
  locationBadge: {
    backgroundColor: '#EEEEF0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  locationText: {
    fontSize: 10,
    color: '#584235',
  },
  timeText: {
    fontSize: 11,
    color: '#8C7263',
  },
  moreBtn: {
    padding: 4,
  },
  moreIcon: {
    fontSize: 16,
    color: '#994700',
    fontWeight: 'bold',
  },
  itemsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  itemBox: {
    flex: 1,
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeGive: {
    backgroundColor: '#FF7A00',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeWant: {
    backgroundColor: '#00A2FD',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  itemTitleText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1A1C1E',
  },
  imageContainer: {
    width: '100%',
    height: 110,
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F3F6',
    borderWidth: 1,
    borderColor: '#E0C0AF',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wantTextContainer: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  wantTitleText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A1C1E',
    textAlign: 'center',
  },
  arrowCircle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -14 }, { translateY: -7 }],
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0C0AF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  arrowText: {
    color: '#994700',
    fontWeight: 'bold',
    fontSize: 12,
  },
  actionArea: {
    gap: 6,
  },
  btnPrimary: {
    backgroundColor: '#994700',
    borderRadius: 9999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subNote: {
    fontSize: 10,
    color: '#584235',
    textAlign: 'center',
  },
  btnDisabled: {
    backgroundColor: '#E2E2E5',
    borderRadius: 9999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnDisabledText: {
    color: '#584235',
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.6,
  },
  btnApplying: {
    backgroundColor: '#E2E2E5',
    borderRadius: 9999,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(153, 71, 0, 0.2)',
  },
  btnApplyingText: {
    color: '#994700',
    fontSize: 12,
    fontWeight: 'bold',
  },
});