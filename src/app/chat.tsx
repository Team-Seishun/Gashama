import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MOCK_CHAT_LIST } from '@/features/chat/constants/mock-data';

export default function ChatListScreen() {
  const router = useRouter();

  const handlePress = (item: typeof MOCK_CHAT_LIST[0]) => {
    // typeが設定されているモックデータは、個別のチャットルームへ遷移する
    if (item.type) {
      router.push(`/chat-room?type=${item.type}`);
    } else {
      router.push('/chat-room?type=sent'); // デフォルト
    }
  };

  const renderItem = ({ item }: { item: typeof MOCK_CHAT_LIST[0] }) => (
    <TouchableOpacity style={styles.chatListItem} onPress={() => handlePress(item)}>
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: item.userColor }]}>
          {item.isTextAvatar ? (
            <Text style={styles.avatarInitial}>{item.textAvatarInitial}</Text>
          ) : (
            <Ionicons name="person" size={24} color={item.userColor === '#03A9F4' ? '#fff' : '#999'} />
          )}
        </View>
        {item.hasUnread && <View style={styles.unreadDot} />}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.userName}>{item.user}</Text>
          <Text style={[styles.timeText, item.hasUnread && styles.timeTextUnread]}>{item.time}</Text>
        </View>
        <Text style={styles.messageText} numberOfLines={1}>
          {item.message}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* シンプルなヘッダー（なくても良いが画面の余白として） */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>メッセージ</Text>
        </View>

        <FlatList
          data={MOCK_CHAT_LIST}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          windowSize={5}
          maxToRenderPerBatch={10}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // 少しグレーがかった背景色
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  chatListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  unreadDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF7A00', // オレンジのドット
    borderWidth: 2,
    borderColor: '#FAFAFA',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  timeTextUnread: {
    color: '#8D6E63', // 未読時の時間は少し茶色っぽく
    fontWeight: 'bold',
  },
  messageText: {
    fontSize: 14,
    color: '#666',
  },
});
