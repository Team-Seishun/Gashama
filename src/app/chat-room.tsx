import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Modal,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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
  const { type } = useLocalSearchParams<{ type: 'sent' | 'received' }>();
  
  // 状態管理: 承認待ち / 承認済み
  // receivedの場合は初期状態が「自分が承認するかどうか」
  const [isApproved, setIsApproved] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // 評価モーダルの状態
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [rating, setRating] = useState<'good' | 'bad' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  
  // ローディング状態 (モック用)
  const [isApproving, setIsApproving] = useState(false);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // 承認ハンドラ
  const handleApprove = useCallback(() => {
    setIsApproving(true);
    setTimeout(() => {
      setIsApproving(false);
      setIsApproved(true);
    }, CONSTANTS.MOCK_LOADING_TIME);
  }, []);

  // 評価送信ハンドラ
  const handleSubmitReview = useCallback(() => {
    setIsReviewSubmitting(true);
    setTimeout(() => {
      setIsReviewSubmitting(false);
      setIsReviewModalVisible(false);
    }, CONSTANTS.MOCK_LOADING_TIME);
  }, []);

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
            <View style={styles.headerImagePlaceholder}>
               <Ionicons name="image-outline" size={16} color="#999" />
            </View>
            <Text style={styles.headerTitle}>ちいかわ</Text>
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
        <ScrollView contentContainerStyle={styles.chatScrollContainer}>
          {!isApproved ? (
            // ================= 承認前 =================
            type === 'received' ? (
              // ▼ 相手から申請が来た場合
              <View style={styles.waitingContainer}>
                <Ionicons name="mail-unread-outline" size={48} color="#D95C14" style={{marginBottom: 10}} />
                <Text style={styles.waitingText}>Mina_Chanさんから交換申請が届きました！</Text>
                <Text style={styles.subText}>条件を確認して承認してください。</Text>
                
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.approveButton, isApproving && styles.approveButtonDisabled]}
                    disabled={isApproving}
                    onPress={handleApprove}
                  >
                    {isApproving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.approveButtonText}>承認する</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.rejectButton]}>
                    <Text style={styles.rejectButtonText}>拒否する</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // ▼ 自分から申請を送った場合 (sent)
              <View style={styles.waitingContainer}>
                <Ionicons name="time-outline" size={48} color="#ccc" style={{marginBottom: 10}} />
                <Text style={styles.waitingText}>相手の承認を待っています...</Text>
                
                {/* テスト用ボタン */}
                <TouchableOpacity 
                  style={styles.testApproveButton}
                  onPress={() => setIsApproved(true)}
                >
                  <Text style={styles.testApproveButtonText}>（テスト用）相手が承認する</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            // ================= 承認済み =================
            <>
              {/* 承認バッジ */}
              <View style={styles.approvedBadgeContainer}>
                <View style={styles.approvedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" style={{marginRight: 4}} />
                  <Text style={styles.approvedBadgeText}>承認</Text>
                </View>
                <Text style={styles.dateText}>今日 14:22</Text>
              </View>

              {/* メッセージ 1 (相手) */}
              <View style={[styles.messageRow, styles.messageRowLeft]}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: CHAT_COLORS.accentBlueLight }]}>
                  <Ionicons name="person" size={16} color="#007AFF" />
                </View>
                <View style={styles.messageBubbleLeft}>
                  <Text style={styles.messageTextLeft}>
                    はじめまして！マッチングありがとうございます。ウサギの在庫あります！
                  </Text>
                </View>
                <Text style={styles.timeText}>14:23</Text>
              </View>

              {/* メッセージ 2 (自分) */}
              <View style={[styles.messageRow, styles.messageRowRight]}>
                <Text style={[styles.timeText, { marginRight: 8 }]}>14:25</Text>
                <View style={styles.messageBubbleRight}>
                  <Text style={styles.messageTextRight}>
                    こちらこそありがとうございます！ハチワレも未開封の状態で保管しております。交換よろしくお願いします！
                  </Text>
                </View>
              </View>

              {/* メッセージ 3 (相手) */}
              <View style={[styles.messageRow, styles.messageRowLeft]}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: CHAT_COLORS.accentBlueLight }]}>
                  <Ionicons name="person" size={16} color="#007AFF" />
                </View>
                <View style={styles.messageBubbleLeft}>
                  <Text style={styles.messageTextLeft}>
                    良かったです！交換方法ですが、都内での手渡しで場所の調整をさせていただけますでしょうか？
                  </Text>
                </View>
                <Text style={styles.timeText}>14:28</Text>
              </View>
            </>
          )}
        </ScrollView>

        {/* 下部エリア (クイックリプライ ＋ 入力フォーム) */}
        <View style={styles.bottomArea}>
          {isApproved && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickReplyScroll}>
              <TouchableOpacity style={styles.quickReplyBadge}>
                <Text style={styles.quickReplyText}>よろしくお願いします！</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickReplyBadge}>
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
                placeholder={isApproved ? "メッセージを入力..." : type === 'received' ? "承認すると入力できます" : "相手が承認すると入力できます"}
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={setInputText}
                editable={isApproved} // 承認前は無効化
              />
              <Ionicons name="happy-outline" size={24} color={isApproved ? "#ccc" : "#eee"} style={{marginRight: 10}} />
            </View>
            <TouchableOpacity style={[styles.sendButton, !isApproved && styles.sendButtonDisabled]} disabled={!isApproved}>
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 評価モーダル */}
      <Modal
        visible={isReviewModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsReviewModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsReviewModalVisible(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>評価する</Text>
            <View style={{ width: 24 }} /> {/* バランスを取るためのダミー */}
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* ユーザー情報 */}
            <View style={styles.modalUserSection}>
              <View style={styles.modalAvatarContainer}>
                <View style={styles.modalAvatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#007AFF" />
                </View>
                <View style={styles.modalAvatarBadge}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              </View>
              <Text style={styles.modalUserName}>GachaFan_99</Text>
              <Text style={styles.modalGreeting}>
                トレードお疲れ様でした！{'\n'}相手の評価をお願いします。
              </Text>
            </View>

            {/* 評価ボタン群 */}
            <View style={styles.ratingButtonsContainer}>
              <TouchableOpacity 
                style={[styles.ratingButton, rating === 'good' && styles.ratingButtonActive]}
                onPress={() => setRating('good')}
              >
                <Ionicons name="happy" size={48} color={rating === 'good' ? CHAT_COLORS.primary : '#A0A0A0'} />
                <Text style={[styles.ratingButtonText, rating === 'good' && styles.ratingButtonTextActive]}>良かった</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.ratingButton, rating === 'bad' && styles.ratingButtonActive]}
                onPress={() => setRating('bad')}
              >
                <Ionicons name="sad" size={48} color={rating === 'bad' ? CHAT_COLORS.accentBrown : '#A0A0A0'} />
                <Text style={[styles.ratingButtonText, rating === 'bad' && styles.ratingButtonTextActive]}>残念だった</Text>
              </TouchableOpacity>
            </View>

            {/* コメント入力 */}
            <View style={styles.commentSection}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentLabel}>コメント (任意)</Text>
                <Text style={styles.commentCounter}>{reviewComment.length}/{CONSTANTS.MAX_COMMENT_LENGTH}</Text>
              </View>
              <TextInput
                style={styles.commentInput}
                placeholder="取引の感想を入力してください"
                placeholderTextColor="#999"
                multiline
                maxLength={CONSTANTS.MAX_COMMENT_LENGTH}
                value={reviewComment}
                onChangeText={setReviewComment}
                textAlignVertical="top"
              />
            </View>

            {/* 注意事項 */}
            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={20} color="#D95C14" style={{ marginTop: 2, marginRight: 8 }} />
              <Text style={styles.warningText}>
                評価は相手のプロフィールに表示されます。丁寧なコメントを心がけましょう。一度送信した評価は変更できません。
              </Text>
            </View>
          </ScrollView>

          {/* 送信ボタン */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.submitReviewButton, isReviewSubmitting && styles.submitReviewButtonDisabled]}
              disabled={isReviewSubmitting}
              onPress={handleSubmitReview}
            >
              {isReviewSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitReviewButtonText}>評価を送信する</Text>
                  <Ionicons name="send" size={16} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
  // ヘッダー
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
  headerImagePlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: CHAT_COLORS.backgroundBadge,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
  completeButtonText: {
    color: CHAT_COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // チャットエリア
  chatScrollContainer: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  waitingText: {
    fontSize: 16,
    color: CHAT_COLORS.textMain,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: CHAT_COLORS.textSub,
    marginBottom: 24,
  },
  testApproveButton: {
    backgroundColor: CHAT_COLORS.textMain,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  testApproveButtonText: {
    color: CHAT_COLORS.background,
    fontWeight: 'bold',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginHorizontal: 8,
  },
  approveButton: {
    backgroundColor: CHAT_COLORS.primary,
  },
  approveButtonDisabled: {
    backgroundColor: CHAT_COLORS.primaryDisabled,
  },
  approveButtonText: {
    color: CHAT_COLORS.background,
    fontWeight: 'bold',
    fontSize: 15,
  },
  rejectButton: {
    backgroundColor: CHAT_COLORS.backgroundBadge,
  },
  rejectButtonText: {
    color: CHAT_COLORS.textSub,
    fontWeight: 'bold',
    fontSize: 15,
  },
  
  // 承認済みバッジ
  approvedBadgeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  approvedBadge: {
    backgroundColor: CHAT_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  approvedBadgeText: {
    color: CHAT_COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: CHAT_COLORS.textMuted,
  },

  // メッセージ
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubbleLeft: {
    backgroundColor: CHAT_COLORS.backgroundBadge,
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    maxWidth: '70%',
    marginRight: 8,
  },
  messageBubbleRight: {
    backgroundColor: CHAT_COLORS.primary,
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    maxWidth: '75%',
  },
  messageTextLeft: {
    fontSize: 14,
    color: CHAT_COLORS.textMain,
    lineHeight: 20,
  },
  messageTextRight: {
    fontSize: 14,
    color: CHAT_COLORS.background,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 11,
    color: CHAT_COLORS.textMuted,
    marginBottom: 4,
  },

  // 下部エリア
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

  // 評価モーダル
  modalSafeArea: {
    flex: 1,
    backgroundColor: CHAT_COLORS.backgroundSub,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: CHAT_COLORS.border,
    backgroundColor: CHAT_COLORS.background,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: CHAT_COLORS.textMain,
  },
  modalContent: {
    padding: 24,
    paddingBottom: 40,
  },
  modalUserSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  modalAvatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  modalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: CHAT_COLORS.accentBlueLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CHAT_COLORS.primary,
  },
  modalAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: CHAT_COLORS.waitingOrange,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CHAT_COLORS.background,
  },
  modalUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: CHAT_COLORS.textMain,
    marginBottom: 8,
  },
  modalGreeting: {
    fontSize: 15,
    color: CHAT_COLORS.textSub,
    textAlign: 'center',
    lineHeight: 22,
  },
  ratingButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  ratingButton: {
    flex: 1,
    backgroundColor: CHAT_COLORS.backgroundBadge,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingButtonActive: {
    backgroundColor: CHAT_COLORS.primaryLight,
    borderColor: CHAT_COLORS.primary,
  },
  ratingButtonText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: CHAT_COLORS.textSub,
  },
  ratingButtonTextActive: {
    color: CHAT_COLORS.primary,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: CHAT_COLORS.textMain,
  },
  commentCounter: {
    fontSize: 12,
    color: CHAT_COLORS.textMuted,
  },
  commentInput: {
    backgroundColor: CHAT_COLORS.backgroundBadge,
    borderRadius: 16,
    padding: 16,
    height: 120,
    fontSize: 15,
    color: CHAT_COLORS.textMain,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: CHAT_COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: CHAT_COLORS.waitingOrange,
    lineHeight: 20,
  },
  modalFooter: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: CHAT_COLORS.background,
    borderTopWidth: 1,
    borderTopColor: CHAT_COLORS.border,
  },
  submitReviewButton: {
    backgroundColor: CHAT_COLORS.accentBrown,
    borderRadius: 25,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitReviewButtonDisabled: {
    backgroundColor: CHAT_COLORS.accentBrownDisabled,
  },
  submitReviewButtonText: {
    color: CHAT_COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
