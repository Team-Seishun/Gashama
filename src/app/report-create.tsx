import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../utils/supabase';

export default function ReportCreateScreen() {
  const router = useRouter();

  // パラメータの取得（画像URI + 各種ID）
  const params = useLocalSearchParams<{
    imageUri?: string | string[];
    storeId?: string | string[];
    gachaponId?: string | string[];
    itemId?: string | string[];
  }>();

  // 単一文字列として安全にデコード抽出
  const parseParam = (param?: string | string[]) => {
    const raw = Array.isArray(param) ? param[0] : param;
    return raw ? decodeURIComponent(raw) : null;
  };

  const imageUri = parseParam(params.imageUri);
  const storeId = parseParam(params.storeId);
  const gachaponId = parseParam(params.gachaponId);
  const itemId = parseParam(params.itemId);

  if (__DEV__) {
    console.log('ReportCreateScreen Received Params:', {
      imageUri,
      storeId,
      gachaponId,
      itemId,
    });
  }

  // 画面内の状態（State）
  const [activeTab, setActiveTab] = useState<'report' | 'matching'>('report');
  const [stockStatus, setStockStatus] = useState<number>(2); // 2: 在庫あり, 1: 残りわずか, 0: 売り切れ
  const [loading, setLoading] = useState(false);

  // カメラ画面への遷移（撮影ボタン押下時）
  const handleTakePhoto = () => {
    router.push('/camera');
  };

  // 投稿処理
  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('写真が必要です', 'プレイ証明写真を撮影してください。');
      return;
    }

    try {
      setLoading(true);

      // 1. ログインユーザーの取得
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしていません。');

      // 2. Storage (photos バケット) へ画像をアップロード
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      const fileExt = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false,
        });

      if (uploadError) throw new Error(`画像アップロード失敗: ${uploadError.message}`);

      // 公開URLを取得
      const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      const photoUrl = publicUrlData.publicUrl;

      // 3. DB (reports テーブル) にインサート
      const { error: dbError } = await supabase.from('reports').insert({
        user_id: user.id,
        store_id: storeId ?? null,
        gachapon_id: gachaponId ?? null,
        item_id: itemId ?? null,
        buytime: new Date().toISOString(),
        photo_url: photoUrl,
        stock_status: stockStatus,
      });

      if (dbError) throw new Error(`DB保存失敗: ${dbError.message}`);

      Alert.alert('投稿完了', 'レポートを投稿してトレードが解禁されました！', [
  {
    text: 'OK',
    onPress: () => {
      // post.tsx へ遷移（戻るボタンで投稿画面に戻らせたくない場合は replace）
      router.replace('/post');
    },
  },
]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('投稿エラー', error.message || '投稿に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      {/* 1. ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={26} color="#A0522D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gashapon Explorer</Text>
        <TouchableOpacity>
          <Ionicons name="help-circle-outline" size={26} color="#A0522D" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* 2. タブ切り替え（在庫報告 / マッチング） */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'report' && styles.tabButtonActive]}
            onPress={() => setActiveTab('report')}
          >
            <Text style={[styles.tabText, activeTab === 'report' && styles.tabTextActive]}>
              在庫報告
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'matching' && styles.tabButtonActive]}
            onPress={() => setActiveTab('matching')}
          >
            <Text style={[styles.tabText, activeTab === 'matching' && styles.tabTextActive]}>
              マッチング
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. チェックイン中の店舗カード */}
        <View style={styles.storeCard}>
          <View style={styles.storeHeader}>
            <Ionicons name="location" size={18} color="#9E4D00" />
            <Text style={styles.storeLabel}>現在チェックイン中の店舗</Text>
          </View>
          <Text style={styles.storeName}>
            ガシャポンバンダイオフィシャルショップ{'\n'}池袋サンシャインシティ店
          </Text>
        </View>

        {/* 4. プレイ証明の撮影エリア */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>プレイ証明の撮影</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>必須</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.photoUploadArea} onPress={handleTakePhoto} activeOpacity={0.8}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.uploadedImage} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholderContainer}>
              <View style={styles.cameraCircleIcon}>
                <Ionicons name="camera" size={32} color="#FFF" />
              </View>
              <Text style={styles.photoMainText}>30分以内のプレイ証明写真を撮影</Text>
              <Text style={styles.photoSubText}>撮影するとトレード機能が解禁されます</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 5. セキュリティ注意事項 */}
        <View style={styles.securityBox}>
          <Ionicons name="shield-outline" size={20} color="#9E4D00" style={{ marginTop: 2 }} />
          <Text style={styles.securityText}>
            セキュリティのため、現在の場所と時間が記録されます。不正な投稿はアカウント凍結の対象となる場合があります。
          </Text>
        </View>

        {/* 6. 在庫状況選択（ボタン） */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>現在の在庫状況</Text>
        <View style={styles.stockGroup}>
          {/* 在庫あり (2) */}
          <TouchableOpacity
            style={[styles.stockCard, stockStatus === 2 && styles.stockCardSelected]}
            onPress={() => setStockStatus(2)}
          >
            <Ionicons name="checkmark-circle-outline" size={28} color="#007BFF" />
            <Text style={styles.stockText}>在庫あり</Text>
          </TouchableOpacity>

          {/* 残りわずか (1) */}
          <TouchableOpacity
            style={[styles.stockCard, stockStatus === 1 && styles.stockCardSelected]}
            onPress={() => setStockStatus(1)}
          >
            <Ionicons name="triangle-outline" size={26} color="#00C853" />
            <Text style={styles.stockText}>残りわずか</Text>
          </TouchableOpacity>

          {/* 売り切れ (0) */}
          <TouchableOpacity
            style={[styles.stockCard, stockStatus === 0 && styles.stockCardSelected]}
            onPress={() => setStockStatus(0)}
          >
            <Ionicons name="close-circle-outline" size={28} color="#D32F2F" />
            <Text style={styles.stockText}>売り切れ</Text>
          </TouchableOpacity>
        </View>

        {/* 7. 投稿ボタン */}
        <View style={styles.submitArea}>
          {loading ? (
            <ActivityIndicator size="large" color="#FF6F00" />
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Ionicons name="paper-plane" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>投稿してトレードを解禁する</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  container: {
    padding: 16,
  },
  /* タブ */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEA',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#9E4D00',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#FFF',
  },
  /* 店舗カード */
  storeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 20,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  storeLabel: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 22,
  },
  /* 撮影エリア */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  requiredBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  requiredText: {
    color: '#D32F2F',
    fontSize: 11,
    fontWeight: 'bold',
  },
  photoUploadArea: {
    height: 170,
    backgroundColor: '#F5EBE6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6D0C5',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoPlaceholderContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cameraCircleIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoMainText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  photoSubText: {
    fontSize: 11,
    color: '#777',
  },
  /* セキュリティ注記 */
  securityBox: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    alignItems: 'flex-start',
    gap: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
  /* 在庫ボタン */
  stockGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  stockCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#EFEFEF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  stockCardSelected: {
    borderColor: '#E6D0C5',
    backgroundColor: '#FFF8F5',
  },
  stockText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  /* 投稿ボタン */
  submitArea: {
    marginTop: 28,
    marginBottom: 20,
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