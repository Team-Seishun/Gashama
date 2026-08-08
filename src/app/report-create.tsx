import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GachaponItem, ItemType, StoreItem, useMasterData } from '../hooks/useMasterData';
import { supabase } from '../utils/supabase';

// モーダル選択用共通型
type ModalOptionItem = {
  id: string;
  name: string;
  raw: StoreItem | GachaponItem | ItemType;
};

export default function ReportCreateScreen() {
  const router = useRouter();

  // URLパラメータからの初期値取得
  const params = useLocalSearchParams<{
    imageUri?: string | string[];
    imageFileName?: string | string[];
    imageMimeType?: string | string[];
    storeId?: string | string[];
    gachaponId?: string | string[];
    itemId?: string | string[];
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

  const imageUri = parseParam(params.imageUri);
  const imageFileName = parseParam(params.imageFileName);
  const imageMimeType = parseParam(params.imageMimeType);

  const paramStoreId = parseParam(params.storeId);
  const paramGachaponId = parseParam(params.gachaponId);
  const paramItemId = parseParam(params.itemId);

  // カスタムフックでマスターデータを取得・管理
  const {
    stores,
    gachapons,
    items,
    fetching,
    loadError,
    selectedStore,
    setSelectedStore,
    selectedGachapon,
    setSelectedGachapon,
    selectedItem,
    setSelectedItem,
    fetchMasterData,
  } = useMasterData({
    storeId: paramStoreId,
    gachaponId: paramGachaponId,
    itemId: paramItemId,
  });

  // モーダルの開閉状態
  const [modalType, setModalType] = useState<'store' | 'gachapon' | 'item' | null>(null);

  const [stockStatus, setStockStatus] = useState<number>(2); // 2: 在庫あり, 1: 残りわずか, 0: 売り切れ
  const [loading, setLoading] = useState(false);

  const isSupportedImageUri = (uri: string) =>
    uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('blob:') || uri.startsWith('data:image/');

  const inferImageExtension = (uri: string, fileName: string | null, mimeType: string | null) => {
    if (mimeType?.startsWith('image/')) {
      const mimeExtension = mimeType.split('/')[1]?.toLowerCase();
      if (mimeExtension === 'jpeg') return 'jpg';
      if (mimeExtension) return mimeExtension;
    }

    const sourceName = fileName || uri;
    const uriExtension = sourceName.split('.').pop()?.split('?')[0]?.toLowerCase();

    if (!uriExtension) return 'jpg';
    if (uriExtension === 'jpeg') return 'jpg';
    return uriExtension;
  };

  const handleTakePhoto = () => {
    router.replace('/camera');
  };

  // ----------------------------------------------------
  // 投稿処理 (reports テーブルへの INSERT)
  // ----------------------------------------------------
  const handleSubmit = async () => {
    // 1. バリデーションチェック
    if (!selectedStore) {
      Alert.alert('入力漏れ', '対象店舗を選択してください。');
      return;
    }

    if (!selectedGachapon) {
      Alert.alert('入力漏れ', 'ガチャガチャ（商品名）を選択してください。');
      return;
    }

    if (!imageUri) {
      Alert.alert('写真が必要です', 'プレイ証明写真を撮影してください。');
      return;
    }

    let uploadedFilePath: string | null = null;

    try {
      setLoading(true);

      // 認証ユーザー取得
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('ログイン状態が確認できません。再度ログインしてください。');

      if (!isSupportedImageUri(imageUri)) {
        throw new Error('画像の形式が正しくありません。撮影し直してください。');
      }

      // 画像のアップロード処理
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error('画像を読み込めませんでした。');
      }

      const arrayBuffer = await response.arrayBuffer();

      const fileExt = inferImageExtension(imageUri, imageFileName, imageMimeType);
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false,
        });

      if (uploadError) throw new Error(`画像アップロード失敗: ${uploadError.message}`);
      uploadedFilePath = filePath;

      // 公開URLの取得
      const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      const photoUrl = publicUrlData.publicUrl;

      // 2. reports テーブルへのデータ挿入
      const { error: dbError } = await supabase.from('reports').insert({
        user_id: user.id,               // uuid (FK)
        store_id: selectedStore.id,     // uuid (FK)
        gachapon_id: selectedGachapon.id, // uuid (FK)
        item_id: selectedItem?.id ?? null, // uuid (FK, 任意)
        buytime: new Date().toISOString(), // timestamp
        photo_url: photoUrl,            // string
        stock_status: stockStatus,      // int (0: 売り切れ, 1: 残りわずか, 2: 在庫あり)
      });

      if (dbError) {
        // ロールバック: DB保存に失敗した場合はStorageから画像を削除
        await supabase.storage.from('photos').remove([filePath]);
        throw new Error(`DB保存失敗: ${dbError.message}`);
      }

      Alert.alert('投稿完了', 'レポートを投稿してトレードが解禁されました！', [
        {
          text: 'OK',
          onPress: () => router.replace('/post'),
        },
      ]);
    } catch (error: any) {
      console.error('レポート投稿エラー:', error);

      if (uploadedFilePath) {
        await supabase.storage.from('photos').remove([uploadedFilePath]);
      }

      Alert.alert('投稿エラー', error.message || '投稿に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // モーダルで項目選択時
  const handleSelectModalItem = (rawItem: StoreItem | GachaponItem | ItemType) => {
    if (modalType === 'store') setSelectedStore(rawItem as StoreItem);
    if (modalType === 'gachapon') setSelectedGachapon(rawItem as GachaponItem);
    if (modalType === 'item') setSelectedItem(rawItem as ItemType);
    setModalType(null);
  };

  const getModalData = (): ModalOptionItem[] => {
    if (modalType === 'store') return stores.map((s) => ({ id: s.id, name: s.name, raw: s }));
    if (modalType === 'gachapon') return gachapons.map((g) => ({ id: g.id, name: g.name, raw: g }));
    if (modalType === 'item') return items.map((i) => ({ id: i.id, name: i.name, raw: i }));
    return [];
  };

  if (fetching) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF6F00" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.safeArea, styles.errorContainer]}>
        <Text style={styles.errorTitle}>データの読み込みに失敗しました</Text>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMasterData}>
          <Text style={styles.retryButtonText}>再読み込み</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >

      {/* スクロール可能なコンテンツエリア */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 150,
        }}
      >

        {/* 投稿情報選択 */}
        <Text style={styles.sectionTitle}>投稿情報の選択</Text>
        <View style={styles.selectGroup}>
          <TouchableOpacity style={styles.selectCard} onPress={() => setModalType('store')}>
            <View style={styles.selectCardLeft}>
              <Ionicons name="location" size={20} color="#9E4D00" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.selectLabel}>対象店舗 <Text style={styles.requiredMark}>*</Text></Text>
                <Text style={styles.selectValue} numberOfLines={1}>
                  {selectedStore ? selectedStore.name : '店舗を選択してください'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectCard} onPress={() => setModalType('gachapon')}>
            <View style={styles.selectCardLeft}>
              <Ionicons name="hardware-chip-outline" size={20} color="#9E4D00" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.selectLabel}>ガチャガチャ（商品名） <Text style={styles.requiredMark}>*</Text></Text>
                <Text style={styles.selectValue} numberOfLines={1}>
                  {selectedGachapon ? selectedGachapon.name : '商品を選択してください'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectCard} onPress={() => setModalType('item')}>
            <View style={styles.selectCardLeft}>
              <Ionicons name="gift-outline" size={20} color="#9E4D00" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.selectLabel}>出たアイテム（任意）</Text>
                <Text style={styles.selectValue} numberOfLines={1}>
                  {selectedItem ? selectedItem.name : '出た種類を選択してください'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
        </View>

        {/* 撮影エリア */}
        <View style={[styles.sectionHeader, { marginTop: 16 }]}>
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

        {/* 在庫状況選択 */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>現在の在庫状況</Text>
        <View style={styles.stockGroup}>
          <TouchableOpacity
            style={[styles.stockCard, stockStatus === 2 && styles.stockCardSelected]}
            onPress={() => setStockStatus(2)}
          >
            <Ionicons name="checkmark-circle-outline" size={28} color="#007BFF" />
            <Text style={styles.stockText}>在庫あり</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stockCard, stockStatus === 1 && styles.stockCardSelected]}
            onPress={() => setStockStatus(1)}
          >
            <Ionicons name="triangle-outline" size={26} color="#00C853" />
            <Text style={styles.stockText}>残りわずか</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stockCard, stockStatus === 0 && styles.stockCardSelected]}
            onPress={() => setStockStatus(0)}
          >
            <Ionicons name="close-circle-outline" size={28} color="#D32F2F" />
            <Text style={styles.stockText}>売り切れ</Text>
          </TouchableOpacity>
        </View>

        {/* 投稿ボタン */}
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

      {/* 選択モーダル */}
      <Modal visible={modalType !== null} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'store' && '店舗の選択'}
                {modalType === 'gachapon' && 'ガチャガチャ（商品）の選択'}
                {modalType === 'item' && '出たアイテムの選択'}
              </Text>
              <TouchableOpacity onPress={() => setModalType(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList<ModalOptionItem>
              data={getModalData()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelectModalItem(item.raw)}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
    marginBottom: 8,
  },
  requiredMark: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  selectGroup: {
    gap: 8,
    marginBottom: 16,
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 12,
    padding: 12,
  },
  selectCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectLabel: {
    fontSize: 11,
    color: '#888',
  },
  selectValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFEFEF',
  },
  modalItemText: {
    fontSize: 15,
    color: '#333',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});