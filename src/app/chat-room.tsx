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
import { ReviewModal } from '@/features/chat/components/ReviewModal';
import { MessageBubble } from '@/features/chat/components/MessageBubble';

export default function ChatRoomScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: 'sent' | 'received' }>();
  
  // 状態管理: 承認待ち / 承認済み
  // receivedの場合は初期状態が「自分が承認するかどうか」
  const [isApproved, setIsApproved] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // 評価モーダルの状態
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  
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
              <MessageBubble 
                text="はじめまして！マッチングありがとうございます。ウサギの在庫あります！"
                time="14:23"
                isOwnMessage={false}
              />

              {/* メッセージ 2 (自分) */}
              <MessageBubble 
                text="こちらこそありがとうございます！ハチワレも未開封の状態で保管しております。交換よろしくお願いします！"
                time="14:25"
                isOwnMessage={true}
              />

              {/* メッセージ 3 (相手) */}
              <MessageBubble 
                text="良かったです！交換方法ですが、都内での手渡しで場所の調整をさせていただけますでしょうか？"
                time="14:28"
                isOwnMessage={false}
              />
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
      <ReviewModal
        isVisible={isReviewModalVisible}
        onClose={() => setIsReviewModalVisible(false)}
        isSubmitting={isReviewSubmitting}
        onSubmit={(rating, comment) => {
          // 送信処理（モック）
          setIsReviewSubmitting(true);
          setTimeout(() => {
            setIsReviewSubmitting(false);
            setIsReviewModalVisible(false);
          }, 1000);
        }}
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

});
