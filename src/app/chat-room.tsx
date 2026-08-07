import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
                    onPress={() => {
                      setIsApproving(true);
                      setTimeout(() => {
                        setIsApproving(false);
                        setIsApproved(true);
                      }, 1000); // 1秒間の疑似ローディング
                    }}
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
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#E1F5FE' }]}>
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
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#E1F5FE' }]}>
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
                <Ionicons name="happy" size={48} color={rating === 'good' ? '#FF7A00' : '#A0A0A0'} />
                <Text style={[styles.ratingButtonText, rating === 'good' && styles.ratingButtonTextActive]}>良かった</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.ratingButton, rating === 'bad' && styles.ratingButtonActive]}
                onPress={() => setRating('bad')}
              >
                <Ionicons name="sad" size={48} color={rating === 'bad' ? '#8D6E63' : '#A0A0A0'} />
                <Text style={[styles.ratingButtonText, rating === 'bad' && styles.ratingButtonTextActive]}>残念だった</Text>
              </TouchableOpacity>
            </View>

            {/* コメント入力 */}
            <View style={styles.commentSection}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentLabel}>コメント (任意)</Text>
                <Text style={styles.commentCounter}>{reviewComment.length}/1000</Text>
              </View>
              <TextInput
                style={styles.commentInput}
                placeholder="取引の感想を入力してください"
                placeholderTextColor="#999"
                multiline
                maxLength={1000}
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
              onPress={() => {
                // 送信処理（モック）
                setIsReviewSubmitting(true);
                setTimeout(() => {
                  setIsReviewSubmitting(false);
                  setIsReviewModalVisible(false);
                }, 1000);
              }}
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
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // ヘッダー
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
  headerImagePlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  testApproveButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  testApproveButtonText: {
    color: '#fff',
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
    backgroundColor: '#FF7A00',
  },
  approveButtonDisabled: {
    backgroundColor: '#FFB870',
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  rejectButton: {
    backgroundColor: '#F5F5F5',
  },
  rejectButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 15,
  },
  
  // 承認済みバッジ
  approvedBadgeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  approvedBadge: {
    backgroundColor: '#FF7A00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  approvedBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
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
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    maxWidth: '70%',
    marginRight: 8,
  },
  messageBubbleRight: {
    backgroundColor: '#FF7A00',
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    maxWidth: '75%',
  },
  messageTextLeft: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  messageTextRight: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  timeText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },

  // 下部エリア
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

  // 評価モーダル
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    backgroundColor: '#E1F5FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF7A00',
  },
  modalAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#D95C14',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalGreeting: {
    fontSize: 15,
    color: '#666',
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
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingButtonActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF7A00',
  },
  ratingButtonText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  ratingButtonTextActive: {
    color: '#FF7A00',
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
    color: '#333',
  },
  commentCounter: {
    fontSize: 12,
    color: '#999',
  },
  commentInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    height: 120,
    fontSize: 15,
    color: '#333',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#D95C14',
    lineHeight: 20,
  },
  modalFooter: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  submitReviewButton: {
    backgroundColor: '#8D6E63',
    borderRadius: 25,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitReviewButtonDisabled: {
    backgroundColor: '#A1887F',
  },
  submitReviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
