import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ReviewModal } from '@/features/chat/components/ReviewModal';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { ChatMessage, ChatRoom, Profile } from '@/features/chat/types';
import { useChatRoom } from '@/features/chat/hooks/useChatRoom';

const CHAT_COLORS = {
  primary: '#FF7A00',
  primaryDisabled: '#FFB870',
  primaryLight: '#FFF3E0',
  textMain: '#333',
  textSub: '#666',
  textMuted: '#999',
  background: '#fff',
  backgroundSub: '#FAFAFA',
  backgroundBadge: '#F5F5F5',
  border: '#F0F0F0',
  borderDark: '#E0E0E0',
  accentBlue: '#007AFF',
  accentBlueLight: '#E1F5FE',
  accentBrown: '#8D6E63',
  accentBrownDisabled: '#A1887F',
  waitingOrange: '#D95C14'
};

const CONSTANTS = {
  MOCK_LOADING_TIME: 1000,
  MAX_COMMENT_LENGTH: 1000,
};

export default function ChatRoomScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { session } = useAuth();
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  const {
    messages,
    setMessages,
    partner,
    myProfile,
    chatRoom,
    setChatRoom,
    isLoading
  } = useChatRoom(roomId, session?.user?.id, scrollViewRef);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [selectedImageMessage, setSelectedImageMessage] = useState<ChatMessage | null>(null);
  const selectedMessageSender = selectedImageMessage?.sender_id === session?.user.id ? myProfile : partner;

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
          message: textToSend,
          is_read: false
        });
        
      if (error) {
        console.error('Error sending message:', error);
        setInputText(textToSend);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handlePickImage = async () => {
    if (!session?.user.id || !roomId) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsSending(true);
        const asset = result.assets[0];
        
        const ext = asset.uri.split('.').pop() || 'jpg';
        const fileName = `${roomId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(fileName, blob, {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            upsert: false,
          });
          
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(uploadData.path);

        const { error: insertError } = await supabase
          .from('chat_messages')
          .insert({
            room_id: roomId,
            sender_id: session.user.id,
            message: '', // テキストはなし
            image_url: publicUrl,
            is_read: false
          });
          
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error picking/uploading image:', error);
      alert('画像の送信に失敗しました');
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
      
      // 双方が完了状態になるかを判定
      const isPartnerCompleted = isUser1 ? chatRoom?.user_2_completed : chatRoom?.user_1_completed;
      const isBothCompleted = isPartnerCompleted === true;
      
      // 1. チャットルームの完了フラグを更新
      const { error } = await supabase
        .from('chat_rooms')
        .update(updateData)
        .eq('id', roomId);
        
      if (error) throw error;
      
      // 2. 相手のプロフィール（評価スコア）を更新する
      const partnerId = chatRoom?.user_1_id === session.user.id ? chatRoom?.user_2_id : chatRoom?.user_1_id;
      if (rating && partnerId) {
        // 現在の相手の星と取引回数を取得
        const { data: partnerProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('evaluated_star, trade_history')
          .eq('id', partnerId)
          .single();

        if (partnerProfile && !fetchError) {
          // 値がない場合の初期値を設定 (星3.0, 回数0)
          const currentStar = partnerProfile.evaluated_star ?? 3.0;
          const currentHistory = partnerProfile.trade_history ?? 0;
          
          // 今回の評価スコア (good = 5.0, bad = 1.0 とする)
          const newScore = rating === 'good' ? 5.0 : 1.0;
          
          // 新しい星の平均値を計算
          const nextHistory = currentHistory + 1;
          const nextStar = ((currentStar * currentHistory) + newScore) / nextHistory;
          
          // 小数点第1位までに丸める (例: 4.2)
          const roundedStar = Math.round(nextStar * 10) / 10;

          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({
              evaluated_star: roundedStar,
              trade_history: nextHistory
            })
            .eq('id', partnerId);
            
          if (updateProfileError) {
            console.error('Error updating partner profile:', updateProfileError);
          }
        }
      }

      // 3. 自動完了メッセージの送信 (誰が評価したかを記載)
      const myName = myProfile?.nickname || '名無しさん';
      const autoMessage = `【システムメッセージ】\n${myName}さんが交換完了処理を行いました。\n\n[評価]: ${rating === 'good' ? '良い' : rating === 'bad' ? '悪い' : 'なし'}\n[コメント]: ${comment || 'なし'}`;
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: session.user.id, // 自分からのメッセージとして送信
          message: autoMessage
        });
      if (messageError) {
        console.error('Error sending auto message:', messageError);
      }

      // 4. 双方が完了した場合、追加でシステムメッセージを送信
      if (isBothCompleted) {
        const bothCompletedMessage = `【システムメッセージ】\n双方が交換完了手続きを終えました！\nこれにてこのチャットルームでの取引は終了となります。\nお疲れ様でした！`;
        await supabase
          .from('chat_messages')
          .insert({
            room_id: roomId,
            sender_id: session.user.id,
            message: bothCompletedMessage
          });
      }
      
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

  const isUser1 = chatRoom?.user_1_id === session?.user.id;
  const isCompleted = isUser1 ? chatRoom?.user_1_completed : chatRoom?.user_2_completed;
  const isApproved = chatRoom?.status === 'approved' || !chatRoom?.status; 
  const isPending = chatRoom?.status === 'pending';
  const isRejected = chatRoom?.status === 'rejected';

  const handleApprove = async () => {
    if (!roomId || !session?.user.id) return;
    try {
      await supabase.from('chat_rooms').update({ status: 'approved' }).eq('id', roomId);
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: session.user.id,
        message: '【システムメッセージ】\n交換が承認されました！チャットを始めましょう。'
      });
      setChatRoom(prev => prev ? { ...prev, status: 'approved' } : null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async () => {
    if (!roomId || !session?.user.id) return;
    try {
      await supabase.from('chat_rooms').update({ status: 'rejected' }).eq('id', roomId);
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: session.user.id,
        message: '【システムメッセージ】\n今回は条件が合わず、見送りとなりました。'
      });
      setChatRoom(prev => prev ? { ...prev, status: 'rejected' } : null);
    } catch (e) {
      console.error(e);
    }
  };

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>出:アメA ⇄ 求:ビーフ</Text>
          </View>
          <TouchableOpacity 
            style={[styles.completeButton, isCompleted && styles.completedButton]}
            onPress={() => {
              if (!isCompleted) setIsReviewModalVisible(true);
            }}
            disabled={isCompleted}
          >
            <Ionicons name={isCompleted ? "checkmark-done-circle" : "checkmark-circle-outline"} size={16} color="#fff" style={{marginRight: 4}} />
            <Text style={styles.completeButtonText}>{isCompleted ? '交換完了' : '交換評価をする'}</Text>
          </TouchableOpacity>
        </View>

        {/* トレード内容バナー (画像付き・モック) */}
        <View style={styles.tradeInfoBanner}>
          <Text style={styles.tradeInfoBannerTitle}>交換するアイテム</Text>
          <View style={styles.tradeInfoBannerContent}>
            <View style={styles.tradeInfoBannerItem}>
              <View style={styles.tradeInfoBadgeOffer}><Text style={styles.tradeInfoBadgeText}>出</Text></View>
              <Image source={{ uri: `https://picsum.photos/seed/${chatRoom?.trade_id}_offer/100/100` }} style={styles.tradeInfoItemImage} contentFit="cover" />
              <Text style={styles.tradeInfoBannerItemName} numberOfLines={1}>アメ A</Text>
            </View>
            <Ionicons name="swap-horizontal" size={20} color="#D95C14" style={{ marginHorizontal: 8 }} />
            <View style={styles.tradeInfoBannerItem}>
              <View style={styles.tradeInfoBadgeRequest}><Text style={styles.tradeInfoBadgeText}>求</Text></View>
              <Image source={{ uri: `https://picsum.photos/seed/${chatRoom?.trade_id}_request/100/100` }} style={styles.tradeInfoItemImage} contentFit="cover" />
              <Text style={styles.tradeInfoBannerItemName} numberOfLines={1}>ビーフ</Text>
            </View>
          </View>
        </View>

        {/* 取引相手バナー */}
        <View style={styles.partnerInfoBanner}>
          <Text style={styles.partnerInfoBannerTitle}>取引相手</Text>
          <View style={styles.partnerInfoBannerContent}>
            {partner?.icon_image && partner.icon_image.startsWith('http') ? (
              <Image source={{ uri: partner.icon_image }} style={styles.partnerBannerAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.partnerBannerAvatar, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="person" size={16} color="#007AFF" />
              </View>
            )}
            <Text style={styles.partnerBannerName} numberOfLines={1}>{partner?.nickname || '名無しさん'}</Text>
          </View>
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
              isSystemMessage={msg.message.startsWith('【システムメッセージ】')}
              imageUrl={msg.image_url}
              onImagePress={() => setSelectedImageMessage(msg)}
              isRead={msg.is_read}
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
          {isPending ? (
            isUser1 ? (
              // 申請者の場合
              <View style={styles.pendingMessageContainer}>
                <Text style={styles.pendingMessageText}>相手の承認をお待ちください...</Text>
              </View>
            ) : (
              // 被申請者の場合
              <View style={styles.approvalActionContainer}>
                {/* 申請者の情報とアイテムの提示 */}
                <View style={styles.applicantInfoCard}>
                  <View style={styles.applicantProfile}>
                    <View style={styles.applicantAvatarWrapper}>
                      <Ionicons name="person" size={20} color="#007AFF" />
                    </View>
                    <View style={styles.applicantDetails}>
                      <Text style={styles.applicantName}>{partner?.nickname || 'ゲスト'}</Text>
                      <Text style={styles.applicantId}>@user_{partner?.id?.substring(0, 6) || '123456'}</Text>
                    </View>
                  </View>
                  <Text style={styles.applicantMessage}>が以下のアイテムとの交換を提案しています</Text>
                  
                  <View style={styles.proposedItemCard}>
                    <Image source={{ uri: `https://picsum.photos/seed/${chatRoom?.trade_id}_offer/150/150` }} style={styles.proposedItemImage} />
                    <View style={styles.proposedItemInfo}>
                      <Text style={styles.proposedItemLabel}>提示アイテム</Text>
                      <Text style={styles.proposedItemName} numberOfLines={2}>アメ A (モック)</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.approvalButtonsRow}>
                  <TouchableOpacity style={styles.approveButton} onPress={handleApprove}>
                    <Text style={styles.approveButtonText}>✅ 承認する</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
                    <Text style={styles.rejectButtonText}>❌ 見送る</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          ) : isRejected ? (
            // 拒否された場合
            <View style={styles.pendingMessageContainer}>
              <Text style={styles.pendingMessageText}>この交換申請は見送りとなりました。</Text>
            </View>
          ) : (
            // 承認済み または 過去のチャット
            <>
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
                <TouchableOpacity style={styles.attachButton} disabled={!isApproved} onPress={handlePickImage}>
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
                </View>
                <TouchableOpacity 
                  style={[styles.sendButton, (!isApproved || !inputText.trim()) && styles.sendButtonDisabled]} 
                  disabled={!isApproved || !inputText.trim() || isSending}
                  onPress={handleSend}
                >
                  <Ionicons name="send" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <ReviewModal
        isVisible={isReviewModalVisible}
        onClose={() => setIsReviewModalVisible(false)}
        isSubmitting={isReviewSubmitting}
        onSubmit={handleComplete}
        partner={partner}
      />

      {/* 画像拡大モーダル */}
      <Modal
        visible={!!selectedImageMessage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageMessage(null)}
      >
        <View style={styles.imageModalOverlay}>
          {/* 背景タップで閉じる */}
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setSelectedImageMessage(null)}
          />
          <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
            <TouchableOpacity 
              style={styles.imageModalCloseButton} 
              onPress={() => setSelectedImageMessage(null)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            {selectedImageMessage?.image_url && (
              <Image 
                source={{ uri: selectedImageMessage.image_url }} 
                style={styles.imageModalContent} 
                contentFit="contain" 
              />
            )}

            {/* 詳細情報 (送信者情報と送信時間) */}
            <View style={styles.modalInfoBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                {selectedMessageSender?.icon_image && selectedMessageSender.icon_image.startsWith('http') ? (
                  <Image source={{ uri: selectedMessageSender.icon_image }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                ) : (
                  <Ionicons name="person-circle" size={40} color="#ccc" style={{ marginLeft: -2 }} />
                )}
                <View style={{ marginLeft: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
                    {selectedMessageSender?.nickname || '名無しさん'}
                  </Text>
                  <Text style={{ color: '#aaa', fontSize: 12 }}>
                    @{selectedMessageSender?.id ? selectedMessageSender.id.substring(0, 8) : 'unknown'}
                  </Text>
                </View>
              </View>

              <Text style={{ color: '#aaa', fontSize: 13 }}>
                送信時間: {selectedImageMessage ? new Date(selectedImageMessage.created_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CHAT_COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: CHAT_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CHAT_COLORS.border,
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
    color: CHAT_COLORS.textMain,
  },
  completeButton: {
    backgroundColor: CHAT_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedButton: {
    backgroundColor: '#4CAF50',
  },
  completeButtonText: {
    color: CHAT_COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  partnerInfoBanner: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  partnerInfoBannerTitle: {
    fontSize: 11,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  partnerInfoBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerBannerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  partnerBannerName: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  tradeInfoBanner: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  tradeInfoBannerTitle: {
    fontSize: 11,
    color: '#D95C14',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tradeInfoBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeInfoBannerItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  tradeInfoItemImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 6,
    backgroundColor: '#F5F5F5',
  },
  tradeInfoBannerItemName: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
    flex: 1,
  },
  tradeInfoBadgeOffer: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  tradeInfoBadgeRequest: {
    backgroundColor: '#F44336',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  tradeInfoBadgeText: {
    fontSize: 10,
    color: '#fff',
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
    borderTopColor: CHAT_COLORS.border,
  },
  quickReplyScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  quickReplyBadge: {
    backgroundColor: CHAT_COLORS.backgroundBadge,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: CHAT_COLORS.borderDark,
  },
  quickReplyText: {
    fontSize: 13,
    color: CHAT_COLORS.textSub,
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
    backgroundColor: CHAT_COLORS.backgroundBadge,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CHAT_COLORS.borderDark,
    height: 40,
  },
  inputWrapperDisabled: {
    backgroundColor: CHAT_COLORS.backgroundSub,
    borderColor: CHAT_COLORS.border,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    color: CHAT_COLORS.textMain,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CHAT_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#FFE5CC',
  },
  imageModalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imageModalContent: {
    width: '100%',
    height: '100%',
  },
  modalInfoBox: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    borderRadius: 16,
    padding: 16,
  },
  pendingMessageContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  pendingMessageText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  approvalActionContainer: {
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  applicantInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  applicantProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  applicantAvatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E1F5FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  applicantDetails: {
    flex: 1,
  },
  applicantName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  applicantId: {
    fontSize: 12,
    color: '#888',
  },
  applicantMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  proposedItemCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
  },
  proposedItemImage: {
    width: 60,
    height: 60,
  },
  proposedItemInfo: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  proposedItemLabel: {
    fontSize: 11,
    color: '#FF7A00',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  proposedItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: CHAT_COLORS.textMain,
  },
  approvalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
