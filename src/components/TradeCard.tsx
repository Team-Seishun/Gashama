import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type TradeItem = {
  id: string;
  user: string;
  place: string;
  distTime: string;
  offer: string;
  request: string;
  status: string;
  info?: string;
  userColor: string;
};

type TradeCardProps = {
  item: TradeItem;
};

export const TradeCard: React.FC<TradeCardProps> = ({ item }) => {
  const router = useRouter();

  return (
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
          <Text style={styles.tradeItemName} numberOfLines={1}>
            {item.offer}
          </Text>
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
          <Text style={styles.tradeItemName} numberOfLines={1}>
            {item.request}
          </Text>
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
            onPress={() =>
              router.push({
                pathname: '/chat-room' as any,
                params: { type: 'sent' },
              })
            }
          >
            <Text style={styles.actionButtonTextActive}>交換申請を送る</Text>
          </TouchableOpacity>
          {item.info && <Text style={styles.infoText}>{item.info}</Text>}
        </>
      ) : (
        <View style={styles.actionButtonDisabled}>
          <Text style={styles.actionButtonTextDisabled}>他の方と取引中</Text>
        </View>
      )}
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
  actionButtonActive: {
    backgroundColor: '#8D6E63',
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
});
