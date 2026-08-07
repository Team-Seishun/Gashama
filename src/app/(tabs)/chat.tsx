import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ChatRoomWithPartner } from '@/features/chat/types';

export default function ChatListScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoomWithPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id) return;

    const fetchChatRooms = async (userId: string) => {
      setIsLoading(true);
      try {
        // 1. 自分が参加しているチャットルーム一覧を取得
        const { data: roomsData, error: roomsError } = await supabase
          .from('chat_rooms')
          .select('*')
          .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
          .order('updated_at', { ascending: false });

        if (roomsError || !roomsData) throw roomsError;

        // 2. 各ルームの相手情報と最新メッセージを取得する
        const roomsWithDetails = await Promise.all(
          roomsData.map(async (room) => {
            const partnerId = room.user_1_id === userId ? room.user_2_id : room.user_1_id;
            
            // 相手のプロフィールを取得
            const { data: partnerData } = await supabase
              .from('profiles')
              .select('id, nickname, icon_image')
              .eq('id', partnerId)
              .single();

            // 最新のメッセージを1件取得
            const { data: messagesData } = await supabase
              .from('chat_messages')
              .select('message, created_at')
              .eq('room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1);

            return {
              ...room,
              partner: partnerData || null,
              latestMessage: messagesData && messagesData.length > 0 ? messagesData[0].message : 'まだメッセージはありません',
              latestMessageTime: messagesData && messagesData.length > 0 ? messagesData[0].created_at : room.created_at,
            } as ChatRoomWithPartner;
          })
        );

        // 最新メッセージの日時でソート
        roomsWithDetails.sort((a, b) => {
          const timeA = new Date(a.latestMessageTime || 0).getTime();
          const timeB = new Date(b.latestMessageTime || 0).getTime();
          return timeB - timeA;
        });

        setChatRooms(roomsWithDetails);
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
      } finally {
        setIsLoading(false);
      }
    };

      fetchChatRooms(session.user.id);
    }, [session?.user.id])
  );

  const handlePress = (roomId: string) => {
    router.push(`/chat-room?roomId=${roomId}`);
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return '';
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    return `${Math.floor(hours / 24)}日前`;
  };

  const renderItem = ({ item }: { item: ChatRoomWithPartner }) => {
    const isSystemMessage = item.latestMessage?.startsWith('【システムメッセージ】');
    const displayMessage = isSystemMessage 
      ? item.latestMessage?.replace('【システムメッセージ】\n', '') 
      : item.latestMessage;

    return (
      <TouchableOpacity style={styles.chatListItem} onPress={() => handlePress(item.id)}>
        <View style={styles.avatarContainer}>
          {item.partner?.icon_image && item.partner.icon_image.startsWith('http') ? (
            <Image source={{ uri: item.partner.icon_image }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#E1F5FE' }]}>
              <Ionicons name="person" size={24} color="#007AFF" />
            </View>
          )}
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.userName}>{item.partner?.nickname || '名無しさん'}</Text>
            <Text style={styles.timeText}>{formatTimeAgo(item.latestMessageTime)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isSystemMessage && (
              <Ionicons name="information-circle" size={14} color="#999" style={{ marginRight: 4 }} />
            )}
            <Text 
              style={[styles.messageText, isSystemMessage && { color: '#999', fontStyle: 'italic', flex: 1 }]} 
              numberOfLines={1}
            >
              {displayMessage}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>メッセージ</Text>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF7A00" />
          </View>
        ) : chatRooms.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="chatbubbles-outline" size={48} color="#ccc" style={{ marginBottom: 16 }} />
            <Text style={{ color: '#999', fontSize: 16 }}>チャット履歴がありません</Text>
          </View>
        ) : (
          <FlatList
            data={chatRooms}
            keyExtractor={(item) => item.id}
            initialNumToRender={10}
            windowSize={5}
            maxToRenderPerBatch={10}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
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
    backgroundColor: '#FAFAFA',
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
    paddingBottom: 20,
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
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
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
  messageText: {
    fontSize: 14,
    color: '#666',
  },
});
