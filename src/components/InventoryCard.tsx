import { getProfileIconSource } from '@/features/profile/profile-icons';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type Profile = {
  id?: string;
  nickname?: string;
  icon_image?: string;
};

export type Store = {
  id?: string;
  name?: string;
};

export type Gachapon = {
  id?: string;
  name?: string;
};

export type GachaponItem = {
  id?: string;
  name?: string;
};

export type ReportItem = {
  id: string;
  created_at: string;
  photo_url: string;
  stock_status: number; // 0: 売り切れ, 1: 残りわずか, 2: 在庫あり
  stores?: Store | Store[];
  gachapons?: Gachapon | Gachapon[];
  gachapon_items?: GachaponItem | GachaponItem[];
  profiles?: Profile | Profile[];
};

type InventoryCardProps = {
  item: ReportItem;
};

// Supabaseのjoin結果（単一オブジェクトまたは配列で返る）を単一オブジェクトに正規化する
export const unwrapRelation = <T,>(value: T | T[] | null | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : value ?? undefined;

// ステータス表示の変換ヘルパー
export const getStockStatusInfo = (status: number) => {
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

// 経過時間表示の簡易ヘルパー
export const formatTimeAgo = (dateString: string) => {
  const diffMin = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60));
  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  return `${Math.floor(diffHour / 24)}日前`;
};

export const InventoryCard: React.FC<InventoryCardProps> = ({ item }) => {
  const profile = unwrapRelation(item.profiles);
  const store = unwrapRelation(item.stores);
  const gachapon = unwrapRelation(item.gachapons);
  const gachaponItem = unwrapRelation(item.gachapon_items);

  const statusInfo = getStockStatusInfo(item.stock_status);
  const itemName = gachaponItem?.name
    ? `${gachapon?.name || ''} (${gachaponItem.name})`
    : gachapon?.name || 'ガチャガチャ名なし';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            {profile?.icon_image ? (
              <Image
                source={getProfileIconSource(profile.icon_image)}
                style={styles.avatarImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={profile.icon_image || profile.id}
                transition={200}
              />
            ) : (
              <Ionicons name="person" size={20} color="#999" />
            )}
          </View>
          <View style={styles.userNameContainer}>
            <Text style={styles.userName}>{profile?.nickname || 'ユーザー'}</Text>
            <View style={styles.placeBadge}>
              <Text style={styles.placeBadgeText}>{store?.name || '店舗名未設定'}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color="#D95C14" />
        </TouchableOpacity>
      </View>
      <Text style={styles.distTimeText}>{formatTimeAgo(item.created_at)}</Text>

      <View style={styles.inventoryContent}>
        <Image
          source={{ uri: item.photo_url || 'https://via.placeholder.com/200' }}
          style={styles.itemImagePlaceholderInv}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={item.photo_url || item.id}
          transition={200}
        />
        <View style={styles.inventoryInfo}>
          <Text style={styles.inventoryItemName}>{itemName}</Text>
          <Text style={[styles.inventoryStatus, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
    marginLeft: 52,
    marginBottom: 16,
  },
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
    marginRight: 16,
    overflow: 'hidden',
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
  },
});
