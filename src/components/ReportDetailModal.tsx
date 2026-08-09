import { Ionicons } from '@expo/vector-icons';

import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ReportItem } from './InventoryCard';

type Props = {
  report: ReportItem | null;
  onClose: () => void;
};

export default function ReportDetailModal({ report, onClose }: Props) {
  const profile = Array.isArray(report?.profiles) ? report?.profiles[0] : report?.profiles;
  const gachapon = Array.isArray(report?.gachapons) ? report?.gachapons[0] : report?.gachapons;
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <Modal
      visible={!!report}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalCloseArea}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.imageWrapper}>
            {report?.photo_url ? (
              <Image
                source={{ uri: report.photo_url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[{ width: '100%', height: '100%', backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="image-outline" size={64} color="#666" />
              </View>
            )}
          </View>

          <View style={styles.modalInfoBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              {profile?.icon_image && profile.icon_image.startsWith('http') ? (
                <Image source={{ uri: profile.icon_image }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <Ionicons name="person-circle" size={40} color="#ccc" style={{ marginLeft: -2 }} />
              )}
              <View style={{ marginLeft: 8 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
                  {profile?.nickname || '名無しさん'}
                </Text>
                <Text style={{ color: '#aaa', fontSize: 12 }}>
                  @{profile?.id ? profile.id.substring(0, 8) : 'unknown'}
                </Text>
              </View>
            </View>

            <Text style={styles.modalItemName}>{gachapon?.name || '不明な商品'}</Text>

            <View style={styles.modalStatusRow}>
              <View style={[styles.statusBadge, {
                backgroundColor: report?.stock_status === 2 ? '#FFF2E5' :
                  report?.stock_status === 1 ? '#E5F1FF' : '#F2F2F7'
              }]}>
                <Text style={[styles.statusBadgeText, {
                  color: report?.stock_status === 2 ? '#FF7A00' :
                    report?.stock_status === 1 ? '#007AFF' : '#8E8E93'
                }]}>
                  {report?.stock_status === 2 ? '在庫あり' :
                    report?.stock_status === 1 ? '残りわずか' : '売り切れ'}
                </Text>
              </View>

              <Text style={styles.modalTimeText}>
                {report?.created_at ? (() => {
                  const diff = now - new Date(report.created_at).getTime();
                  const seconds = Math.floor(diff / 1000);
                  if (seconds < 60) return `${seconds}秒前`;
                  const minutes = Math.floor(seconds / 60);
                  if (minutes < 60) return `${minutes}分前`;
                  const hours = Math.floor(minutes / 60);
                  return hours < 24 ? `${hours}時間前` : `${Math.floor(hours / 24)}日前`;
                })() : ''}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
  },
  modalInfoBox: {
    width: '100%',
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalItemName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalTimeText: {
    color: '#aaa',
    fontSize: 12,
  },
});
