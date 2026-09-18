import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { profileApi } from '@/features/profile/api/api';
import {
  computeMaxPointsUsed,
  decrementPointsUsed as computeDecrementedPointsUsed,
  incrementPointsUsed as computeIncrementedPointsUsed,
  isPointsUnavailable as computeIsPointsUnavailable,
  isStepperDecrementDisabled,
  isStepperIncrementDisabled,
  isSubmitBlockedByPoints as computeIsSubmitBlockedByPoints,
  resolvePointsBalance,
} from '@/features/points/pointsLogic';
import { supabase } from '../utils/supabase';

type ItemType = {
  id: string;
  name: string;
};

export default function TradeCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    reportId?: string;
    gachaponId?: string;
    storeId?: string;
    haveItemId?: string;
    photoUrl?: string;
  }>();

  const parseParam = (param?: string | string[]) => {
    const raw = Array.isArray(param) ? param[0] : param;
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  };

  const reportId = parseParam(params.reportId);
  const gachaponId = parseParam(params.gachaponId);
  const storeId = parseParam(params.storeId);
  const paramHaveItemId = parseParam(params.haveItemId);
  const photoUrl = parseParam(params.photoUrl);

  const [items, setItems] = useState<ItemType[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [haveItem, setHaveItem] = useState<ItemType | null>(null);
  const [wantItem, setWantItem] = useState<ItemType | null>(null);

  const [loading, setLoading] = useState(false);

  const [nickname, setNickname] = useState('');
  // マウント時にnicknameを取得した相手のuser_id。送信時のuser.idと突き合わせ、
  // アカウント切り替え等で別人のnicknameを誤って使わないようにするためのガード。
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  // nullは「未取得」を表す。0(残高0pt)と区別するため、初期値をnullにしている。
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  // 未ログインでpointsBalanceがnullのままのケースを、取得失敗によるnullと区別するためのフラグ。
  // 未ログイン時はポイント不足ではなく認証エラーとして扱いたいため、送信ボタンの無効化条件から除外する
  // （handleSubmit内の`ログイン状態が確認できません`エラーへ到達できるようにするため）。
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  // null/0のいずれも「ステッパーを無効化する」対象（表示文言のみ原因別に分ける）
  const isPointsUnavailable = computeIsPointsUnavailable(pointsBalance);
  // 送信ボタンは、未ログインの場合はhandleSubmit側の認証エラーに委ねるため無効化しない
  const isSubmitBlockedByPoints = computeIsSubmitBlockedByPoints(pointsBalance, isLoggedOut);
  const maxPointsUsed = computeMaxPointsUsed(pointsBalance);
  const [pointsUsed, setPointsUsed] = useState(1);

  useEffect(() => {
    // 画面を離れた後に非同期処理が完了してもsetStateしないためのガード
    let cancelled = false;

    (async () => {
      // 表示専用の読み取りなので、ネットワーク往復を伴うgetUser()ではなく
      // ローカルセッションを読むだけのgetSession()を使う（実際の書き込み直前の
      // 認証検証はhandleSubmit内のgetUser()が別途行う）。
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        if (!cancelled) {
          setIsLoggedOut(true);
          setLoadingProfile(false);
        }
        return;
      }

      const { data, error } = await profileApi.getProfileByUserId(user.id);
      if (cancelled) return;

      if (error) {
        console.error('プロフィール取得エラー:', error);
      } else if (data) {
        setNickname(data.nickname ?? '');
        setPointsBalance(resolvePointsBalance(data.points));
        setProfileUserId(user.id);
      }
      setLoadingProfile(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gachaponId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingItems(false);
      return;
    }

    supabase
      .from('gachapon_items')
      .select('id, name')
      .eq('gachapon_id', gachaponId)
      .then(({ data, error }) => {
        if (data && !error) {
          setItems(data);
          if (paramHaveItemId) {
            const initialHave = data.find(i => i.id === paramHaveItemId);
            if (initialHave) setHaveItem(initialHave);
          }
        }
        setLoadingItems(false);
      });
  }, [gachaponId, paramHaveItemId]);

  const isDecrementDisabled = isStepperDecrementDisabled(pointsBalance, pointsUsed);
  const isIncrementDisabled = isStepperIncrementDisabled(pointsBalance, pointsUsed, maxPointsUsed);

  const decrementPointsUsed = () => {
    setPointsUsed(prev => computeDecrementedPointsUsed(prev));
  };

  const incrementPointsUsed = () => {
    setPointsUsed(prev => computeIncrementedPointsUsed(prev, maxPointsUsed));
  };

  const handleSubmit = async () => {
    if (loadingProfile) {
      Alert.alert('読み込み中です', 'プロフィール情報を読み込み中です。少し待ってから再度お試しください。');
      return;
    }
    if (!haveItem) {
      Alert.alert('入力エラー', '譲るアイテム（出）を選択してください。');
      return;
    }
    if (!wantItem) {
      Alert.alert('入力エラー', '欲しいアイテム（求）を選択してください。');
      return;
    }
    if (haveItem.id === wantItem.id) {
      Alert.alert('入力エラー', '「譲るアイテム」と「欲しいアイテム」が同じです。');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログイン状態が確認できません。再度ログインしてください。');

      // マウント時に取得したnicknameが今送信しようとしている本人のものか確認する。
      // 画面を開いたままアカウントが切り替わっていた場合、別人のnicknameを
      // 誤って使ってしまうことを防ぐ。
      if (user.id !== profileUserId) {
        throw new Error('プロフィール情報が最新ではありません。画面を開き直してから再度お試しください。');
      }

      // nicknameはマウント時に取得済みの値を再利用する（同じデータの二重取得を避ける）
      const userName = nickname || '匿名ユーザー';

      // ポイント消費とtradesへのinsertをRPC内でまとめて行う（片方だけ成功する
      // 不整合を防ぐため）。user_id/statusはRPC内部（auth.uid()・固定値）で
      // 設定されるため渡さない。
      const { error: rpcError } = await supabase.rpc('create_trade_with_points', {
        p_points_used: pointsUsed,
        p_have_item_id: haveItem.id,
        p_want_item_id: wantItem.id,
        p_user_name: userName,
        p_item_give: haveItem.name,
        p_item_want: wantItem.name,
        p_report_id: reportId,
        p_store_id: storeId,
        p_gachapon_id: gachaponId,
        p_photo_url: photoUrl,
      });

      if (rpcError) throw new Error(`トレード作成失敗: ${rpcError.message}`);

      Alert.alert('募集完了', 'トレードの募集を開始しました！', [
        {
          text: 'OK',
          onPress: () => router.replace({ pathname: '/(tabs)/post', params: { tab: 'trade' } }),
        },
      ]);
    } catch (error: any) {
      console.error('トレード作成エラー:', error);
      Alert.alert('エラー', error.message || 'トレード募集に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 150 }}
      >
        <Text style={styles.pageTitle}>トレード募集を作成</Text>
        <Text style={styles.pageDescription}>
          在庫報告のアイテムから、トレードに出すアイテムと欲しいアイテムを選択してください。
        </Text>

        <View style={styles.pointsBalanceRow}>
          {loadingProfile ? (
            <ActivityIndicator size="small" color="#FF7A00" />
          ) : pointsBalance === null ? (
            // 取得失敗時は0ptと区別し、その旨を明示する
            // （残高0のユーザーと誤解されないようにするため）
            <Text style={styles.pointsBalanceText}>保有ポイントを取得できませんでした</Text>
          ) : (
            <Text style={styles.pointsBalanceText}>
              保有ポイント: {pointsBalance}pt
            </Text>
          )}
        </View>

        {!loadingProfile && pointsBalance === 0 && (
          <Text style={styles.pointsInsufficientText}>
            ポイントが不足しています。在庫投稿でポイントを獲得してください。
          </Text>
        )}

        <View style={styles.formCard}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldTitle}>消費ポイント</Text>
          </View>
          <Text style={styles.fieldDescription}>
            このトレード募集に使用するポイント数を選択してください。
          </Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperButton, isDecrementDisabled && styles.stepperButtonDisabled]}
              onPress={decrementPointsUsed}
              disabled={isDecrementDisabled}
            >
              <Ionicons name="remove" size={20} color={isDecrementDisabled ? '#CCC' : '#FF6F00'} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{isPointsUnavailable ? 0 : pointsUsed}pt</Text>
            <TouchableOpacity
              style={[styles.stepperButton, isIncrementDisabled && styles.stepperButtonDisabled]}
              onPress={incrementPointsUsed}
              disabled={isIncrementDisabled}
            >
              <Ionicons name="add" size={20} color={isIncrementDisabled ? '#CCC' : '#FF6F00'} />
            </TouchableOpacity>
          </View>
        </View>

        {photoUrl && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: photoUrl }} style={styles.uploadedImage} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <Text style={styles.imageOverlayText}>プレイ証明写真</Text>
            </View>
          </View>
        )}

        <View style={styles.formCard}>
          <View style={styles.fieldSection}>
            <View style={styles.fieldHeader}>
              <View style={styles.badgeOffer}><Text style={styles.badgeText}>出</Text></View>
              <Text style={styles.fieldTitle}>譲るアイテム <Text style={styles.requiredMark}>*</Text></Text>
            </View>
            
            {loadingItems ? (
              <ActivityIndicator size="small" color="#FF7A00" style={{ marginTop: 8 }} />
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>アイテム情報がありません</Text>
            ) : paramHaveItemId ? (
              <View style={styles.chipContainer}>
                <View style={[styles.chip, styles.chipSelectedOffer]}>
                  <Text style={[styles.chipText, styles.chipTextSelectedOffer]}>
                    {haveItem?.name || ''}
                  </Text>
                </View>
                <Text style={styles.fixedHint}>※在庫報告で選択したアイテムで固定されています</Text>
              </View>
            ) : (
              <View style={styles.chipContainer}>
                {items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, haveItem?.id === item.id && styles.chipSelectedOffer]}
                    onPress={() => setHaveItem(item)}
                  >
                    <Text style={[styles.chipText, haveItem?.id === item.id && styles.chipTextSelectedOffer]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.separator} />

          <View style={styles.fieldSection}>
            <View style={styles.fieldHeader}>
              <View style={styles.badgeRequest}><Text style={styles.badgeText}>求</Text></View>
              <Text style={styles.fieldTitle}>欲しいアイテム <Text style={styles.requiredMark}>*</Text></Text>
            </View>
            
            {loadingItems ? (
              <ActivityIndicator size="small" color="#00A2FD" style={{ marginTop: 8 }} />
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>アイテム情報がありません</Text>
            ) : (
              <View style={styles.chipContainer}>
                {items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.chip,
                      wantItem?.id === item.id && styles.chipSelectedRequest,
                      haveItem?.id === item.id && styles.chipDisabled
                    ]}
                    disabled={haveItem?.id === item.id}
                    onPress={() => setWantItem(item)}
                  >
                    <Text style={[
                      styles.chipText,
                      wantItem?.id === item.id && styles.chipTextSelectedRequest,
                      haveItem?.id === item.id && styles.chipTextDisabled
                    ]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.submitArea}>
          {loading || loadingProfile ? (
            <ActivityIndicator size="large" color="#FF6F00" />
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, isSubmitBlockedByPoints && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitBlockedByPoints}
            >
              <Ionicons name="swap-horizontal" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>トレードを募集する</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  pageDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  pointsBalanceRow: {
    marginBottom: 16,
  },
  pointsBalanceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  pointsInsufficientText: {
    fontSize: 13,
    color: '#D32F2F',
    marginBottom: 16,
  },
  fieldDescription: {
    fontSize: 12,
    color: '#777',
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6F00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    backgroundColor: '#F9F9F9',
    opacity: 0.5,
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 60,
    textAlign: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.5,
  },
  imageContainer: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#EEEEF0',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageOverlayText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  fieldSection: {
    paddingVertical: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeOffer: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeRequest: {
    backgroundColor: '#F44336',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  fieldTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  requiredMark: {
    color: '#D32F2F',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipDisabled: {
    backgroundColor: '#F9F9F9',
    opacity: 0.5,
  },
  chipSelectedOffer: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  chipSelectedRequest: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  chipText: {
    fontSize: 13,
    color: '#333',
  },
  chipTextDisabled: {
    color: '#AAA',
  },
  chipTextSelectedOffer: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  chipTextSelectedRequest: {
    color: '#C62828',
    fontWeight: 'bold',
  },
  fixedHint: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
    width: '100%',
  },
  separator: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginVertical: 16,
  },
  submitArea: {
    marginTop: 28,
  },
  submitButton: {
    backgroundColor: '#FF6F00',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
