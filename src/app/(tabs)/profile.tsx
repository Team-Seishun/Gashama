import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// モックデータ：在庫投稿履歴
const MOCK_HISTORY = [
  {
    id: 'post_1',
    title: 'ちいかわ (おやすみ)',
    time: '10分前',
    status: '在庫あり',
    statusColor: '#FF7A00',
    bgColor: '#FCE4EC', // ピンク系のプレースホルダー
  },
  {
    id: 'post_2',
    title: 'ハチワレ (うさぎ)',
    time: '25分前',
    status: '残りわずか',
    statusColor: '#007AFF',
    bgColor: '#E1F5FE', // 水色系のプレースホルダー
  },
  {
    id: 'post_3',
    title: 'うさぎ (楽器)',
    time: '1時間前',
    status: '売り切れ',
    statusColor: '#8E8E93',
    bgColor: '#FFF9C4', // 黄色系のプレースホルダー
  },
];

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#D95C14" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>gacha_master_tokyo</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#D95C14" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* プロフィール情報 */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={50} color="#999" />
            </View>
          </View>
          
          <Text style={styles.username}>gacha_master_tokyo</Text>
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FF7A00" />
            <Text style={styles.ratingText}>4.9 (56件の評価)</Text>
          </View>
        </View>

        {/* フォロワー数などの行は要件により削除 */}

        {/* 在庫投稿履歴 */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>在庫投稿履歴 <Text style={styles.historyCount}>(12件)</Text></Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>すべて見る</Text>
            </TouchableOpacity>
          </View>

          {MOCK_HISTORY.map((item) => (
            <TouchableOpacity key={item.id} style={styles.historyCard}>
              <View style={[styles.itemImagePlaceholder, { backgroundColor: item.bgColor }]}>
                <Ionicons name="image-outline" size={32} color="#999" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemTime}>{item.time}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.statusColor }]}>
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  // ヘッダー
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  iconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D95C14',
  },
  
  // スクロールコンテンツ
  scrollContent: {
    paddingBottom: 40,
  },

  // プロフィール情報
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
    // 影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },

  // 在庫投稿履歴
  historySection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  historyCount: {
    fontSize: 16,
    color: '#D95C14',
  },
  seeAllText: {
    fontSize: 12,
    color: '#999',
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    // 影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
