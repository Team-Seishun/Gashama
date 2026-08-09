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

  useEffect(() => {
    if (!gachaponId) {
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

  const handleSubmit = async () => {
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .single();

      const userName = profile?.nickname || '匿名ユーザー';

      const { error: dbError } = await supabase.from('trades').insert({
        user_id: user.id,
        report_id: reportId || null,
        store_id: storeId || null,
        gachapon_id: gachaponId || null,
        have_item_id: haveItem.id,
        want_item_id: wantItem.id,
        status: 1, 
        photo_url: photoUrl || null,
        user_name: userName,
        item_give: haveItem.name,
        item_want: wantItem.name,
      });

      if (dbError) throw new Error(`トレード作成失敗: ${dbError.message}`);

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
          {loading ? (
            <ActivityIndicator size="large" color="#FF6F00" />
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
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
