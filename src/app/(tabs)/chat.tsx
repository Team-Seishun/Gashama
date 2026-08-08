import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const fetchChatRooms = useCallback(async (userId: string) => {
    // 最初の読み込み時のみローディング表示（バックグラウンド更新では出さない）
    if (chatRooms.length === 0) setIsLoading(true);
    
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
              .select('message, image_url, created_at')
              .eq('room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1);

            let latestMessageText = 'まだメッセージはありません';
            if (messagesData && messagesData.length > 0) {
              const msg = messagesData[0];
              if (msg.message) {
                latestMessageText = msg.message;
              } else if (msg.image_url) {
                latestMessageText = '写真を送信しました';
              }
            }
            
            // 未読メッセージ件数を取得 (自分が受信者で未読のもの)
            const { count: unreadCount } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .eq('is_read', false)
              .neq('sender_id', userId);

            return {
              ...room,
              partner: partnerData || null,
              latestMessage: latestMessageText,
              latestMessageTime: messagesData && messagesData.length > 0 ? messagesData[0].created_at : room.created_at,
              unreadCount: unreadCount || 0,
            } as ChatRoomWithPartner;
          })
        );

        // 未読メッセージがあるものを優先し、その中で最新メッセージ順にソート
        roomsWithDetails.sort((a, b) => {
          const aHasUnread = (a.unreadCount || 0) > 0;
          const bHasUnread = (b.unreadCount || 0) > 0;

          // 片方だけ未読がある場合は未読を上にする
          if (aHasUnread && !bHasUnread) return -1;
          if (!aHasUnread && bHasUnread) return 1;

          // どちらも未読、またはどちらも既読の場合は日時でソート
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
  }, [chatRooms.length]);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id) return;
      fetchChatRooms(session.user.id);
    }, [session, fetchChatRooms])
  );

  useEffect(() => {
    if (!session?.user.id) return;

    const channel = supabase
      .channel('chat_list_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          fetchChatRooms(session.user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.id, fetchChatRooms]);

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
          <Image 
            source={{ uri: `https://picsum.photos/seed/${item.id}_request/100/100` }} 
            style={styles.avatar} 
            contentFit="cover" 
          />
          {!!item.unreadCount && item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <View style={styles.tradeTitleContainer}>
              <View style={styles.badgeOffer}><Text style={styles.badgeText}>出</Text></View>
              <Text style={styles.tradeTitleItem} numberOfLines={1}>アメ A</Text>
              
              <Ionicons name="swap-horizontal" size={14} color="#D95C14" style={{ marginHorizontal: 4 }} />
              
              <View style={styles.badgeRequest}><Text style={styles.badgeText}>求</Text></View>
              <Text style={styles.tradeTitleItem} numberOfLines={1}>ビーフ</Text>
            </View>
            <Text style={styles.timeText}>{formatTimeAgo(item.latestMessageTime)}</Text>
          </View>
          
          {/* 2行目: ガチャポン名と相手のユーザー名 (現在はモック表示) */}
          <View style={styles.tradeSummaryRow}>
            <View style={styles.gachaponTag}>
              <Ionicons name="cube" size={12} color="#FF7A00" style={{ marginRight: 4 }} />
              <Text style={styles.gachaponName} numberOfLines={1}>ちいかわ (ハチワレ)</Text>
            </View>
            <Text style={{ color: '#E0E0E0', marginHorizontal: 6 }}>|</Text>
            <Ionicons name="person-circle" size={14} color="#007AFF" style={{ marginRight: 2 }} />
            <Text style={styles.partnerName} numberOfLines={1}>{item.partner?.nickname || '名無しさん'}</Text>
          </View>
          
          <View style={styles.messageRow}>
            {isSystemMessage && (
              <Ionicons name="information-circle" size={14} color="#999" style={{ marginRight: 4 }} />
            )}
            <Text 
              style={[styles.messageText, isSystemMessage && styles.systemMessageText]} 
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
    paddingBottom: 100, // タブバーの高さ分を考慮して余白を増やす
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
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FAFAFA',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  tradeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  tradeTitleItem: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1,
  },
  badgeOffer: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  badgeRequest: {
    backgroundColor: '#F44336',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  tradeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gachaponTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gachaponName: {
    fontSize: 11,
    color: '#D95C14',
    fontWeight: 'bold',
    flexShrink: 1,
  },
  partnerName: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    flexShrink: 2,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemMessageText: {
    color: '#999',
    fontStyle: 'italic',
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    color: '#666',
  },
});
