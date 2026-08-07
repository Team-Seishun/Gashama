import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ReviewModal } from '@/features/chat/components/ReviewModal';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { ChatMessage, ChatRoom, Profile } from '@/features/chat/types';

export default function ChatRoomScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { session } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [inputText, setInputText] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!session?.user.id || !roomId) return;
    
    const fetchRoomAndMessages = async () => {
      setIsLoading(true);
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('id', roomId)
          .single();
          
        if (roomError || !roomData) throw roomError;
        setChatRoom(roomData);
        
        const partnerId = roomData.user_1_id === session!.user.id ? roomData.user_2_id : roomData.user_1_id;
        const { data: partnerData } = await supabase
          .from('profiles')
          .select('id, nickname, icon_image')
          .eq('id', partnerId)
          .single();
          
        if (partnerData) setPartner(partnerData);
        
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });
          
        if (messagesError) throw messagesError;
        if (messagesData) setMessages(messagesData);
        
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
      } catch (error) {
        console.error('Error fetching chat details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomAndMessages();
    
    // Realtime サブスクリプション
    const channel = supabase
      .channel(`chat_messages_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // 重複防止
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.id, roomId, session]);

  const handleSend = async () => {
    if (!inputText.trim() || !session?.user.id || !roomId) return;
    
    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: session.user.id,
          message: textToSend
        });
        
      if (error) {
        console.error('Error sending message:', error);
        setInputText(textToSend);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleComplete = async (rating: 'good' | 'bad' | null, comment: string) => {
    setIsReviewSubmitting(true);
    try {
      if (!session?.user.id || !roomId) return;
      
      const isUser1 = chatRoom?.user_1_id === session.user.id;
      const updateData = isUser1 ? { user_1_completed: true } : { user_2_completed: true };
      
      const { error } = await supabase
        .from('chat_rooms')
        .update(updateData)
        .eq('id', roomId);
        
      if (error) throw error;
      
      // 更新後の状態を反映
      setChatRoom(prev => prev ? { ...prev, ...updateData } : null);
      setIsReviewModalVisible(false);
    } catch (error) {
      console.error('Error completing trade:', error);
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 今回はモック用の「承認前画面」ではなく、すでにルームが存在する前提で実装
  // もし申請前の段階なら別画面（リクエスト一覧等）になる想定
  const isApproved = true; 

  if (isLoading) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF7A00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/chat')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            {partner?.icon_image && partner.icon_image.startsWith('http') ? (
              <Image source={{ uri: partner.icon_image }} style={styles.headerAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.headerAvatar, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="person" size={16} color="#007AFF" />
              </View>
            )}
            <Text style={styles.headerTitle}>{partner?.nickname || '名無しさん'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.completeButton}
            onPress={() => setIsReviewModalVisible(true)}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" style={{marginRight: 4}} />
            <Text style={styles.completeButtonText}>交換完了</Text>
          </TouchableOpacity>
        </View>

        {/* チャットエリア */}
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.chatScrollContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id}
              text={msg.message}
              time={formatTime(msg.created_at)}
              isOwnMessage={msg.sender_id === session?.user.id}
            />
          ))}
          {isSending && (
            <View style={{ alignItems: 'flex-end', marginRight: 10, marginTop: 4 }}>
              <ActivityIndicator size="small" color="#FF7A00" />
            </View>
          )}
        </ScrollView>

        {/* 下部エリア (クイックリプライ ＋ 入力フォーム) */}
        <View style={styles.bottomArea}>
          {isApproved && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickReplyScroll}>
              <TouchableOpacity style={styles.quickReplyBadge} onPress={() => setInputText('よろしくお願いします！')}>
                <Text style={styles.quickReplyText}>よろしくお願いします！</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickReplyBadge} onPress={() => setInputText('駅前で交換できますか？')}>
                <Text style={styles.quickReplyText}>駅前で交換できますか？</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton} disabled={!isApproved}>
              <Ionicons name="add" size={24} color={isApproved ? "#666" : "#ccc"} />
            </TouchableOpacity>
            <View style={[styles.inputWrapper, !isApproved && styles.inputWrapperDisabled]}>
              <TextInput
                style={styles.textInput}
                placeholder={isApproved ? "メッセージを入力..." : "相手が承認すると入力できます"}
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={setInputText}
                editable={isApproved}
              />
              <Ionicons name="happy-outline" size={24} color={isApproved ? "#ccc" : "#eee"} style={{marginRight: 10}} />
            </View>
            <TouchableOpacity 
              style={[styles.sendButton, (!isApproved || !inputText.trim()) && styles.sendButtonDisabled]} 
              disabled={!isApproved || !inputText.trim() || isSending}
              onPress={handleSend}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 評価モーダル */}
      <ReviewModal
        isVisible={isReviewModalVisible}
        onClose={() => setIsReviewModalVisible(false)}
        isSubmitting={isReviewSubmitting}
        onSubmit={handleComplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  completeButton: {
    backgroundColor: '#FF7A00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatScrollContainer: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  bottomArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quickReplyScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  quickReplyBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickReplyText: {
    fontSize: 13,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachButton: {
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 40,
  },
  inputWrapperDisabled: {
    backgroundColor: '#FAFAFA',
    borderColor: '#F0F0F0',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#FFE5CC',
  },
});
