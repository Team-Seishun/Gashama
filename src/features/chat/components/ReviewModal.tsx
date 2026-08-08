import { Modal, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Profile } from '../types';

type ReviewModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (rating: 'good' | 'bad' | null, comment: string) => void;
  isSubmitting: boolean;
  partner: Profile | null;
};

export function ReviewModal({ isVisible, onClose, onSubmit, isSubmitting, partner }: ReviewModalProps) {
  const [rating, setRating] = useState<'good' | 'bad' | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalHeaderTitle}>評価する</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView contentContainerStyle={styles.modalContent}>
          {/* ユーザー情報 */}
          <View style={styles.modalUserSection}>
            <View style={styles.modalAvatarContainer}>
              {partner?.icon_image && partner.icon_image.startsWith('http') ? (
                <Image source={{ uri: partner.icon_image }} style={styles.modalAvatarPlaceholder} contentFit="cover" />
              ) : (
                <View style={styles.modalAvatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#007AFF" />
                </View>
              )}
              <View style={styles.modalAvatarBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            </View>
            <Text style={styles.modalUserName}>{partner?.nickname || '名無しさん'}</Text>
            <Text style={styles.modalUserId}>ID: {partner?.id || '---'}</Text>
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
            style={[styles.submitReviewButton, isSubmitting && styles.submitReviewButtonDisabled]}
            disabled={isSubmitting}
            onPress={() => onSubmit(rating, reviewComment)}
          >
            {isSubmitting ? (
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
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 4,
  },
  modalUserId: {
    fontSize: 12,
    color: '#999',
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
