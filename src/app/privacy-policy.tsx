import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#D95C14" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プライバシーポリシー</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updateDate}>最終改定日: 2026年8月9日</Text>

        <Text style={styles.paragraph}>
          本アプリケーション（以下「当サービス」）は、ユーザーの個人情報の重要性を認識し、個人情報の保護に関する法令を遵守するとともに、適切な取扱いと保護に努めます。
        </Text>

        <Text style={styles.sectionTitle}>1. 収集する情報</Text>
        <Text style={styles.paragraph}>
          当サービスでは、サービス提供および品質向上のため、以下の情報を収集する場合があります：
        </Text>
        <Text style={styles.bulletPoint}>• アカウント情報（メールアドレス、パスワード、ニックネーム、アイコン画像、自己紹介）</Text>
        <Text style={styles.bulletPoint}>• 投稿データ（在庫報告写真、位置情報・店舗選択、トレード希望情報）</Text>
        <Text style={styles.bulletPoint}>• チャットデータ（ユーザー間の取引・交渉メッセージ内容）</Text>
        <Text style={styles.bulletPoint}>• 端末情報（OSバージョン、アクセスログ）</Text>

        <Text style={styles.sectionTitle}>2. 情報の利用目的</Text>
        <Text style={styles.paragraph}>
          収集した情報は、以下の目的で利用されます：
        </Text>
        <Text style={styles.bulletPoint}>• ガシャポン在庫共有およびトレードマッチングサービスの提供</Text>
        <Text style={styles.bulletPoint}>• ユーザー認証およびアカウントの安全な管理</Text>
        <Text style={styles.bulletPoint}>• 不正利用の防止および問い合わせへの対応</Text>

        <Text style={styles.sectionTitle}>3. 第三者への開示・提供</Text>
        <Text style={styles.paragraph}>
          当サービスは、法令に基づく場合を除き、事前にユーザーの同意を得ることなく個人情報を第三者に開示・提供することはありません。
        </Text>

        <Text style={styles.sectionTitle}>4. 安全管理措置</Text>
        <Text style={styles.paragraph}>
          当サービスは、個人情報の紛失、破壊、改ざんおよび漏洩などを防止するため、適切なセキュリティ対策（暗号化通信、アクセス制限等）を実施します。
        </Text>

        <Text style={styles.sectionTitle}>5. お問い合わせ</Text>
        <Text style={styles.paragraph}>
          本プライバシーポリシーに関するご質問やご相談につきましては、アプリ内の問い合わせ窓口までご連絡ください。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  updateDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D95C14',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#444',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
    marginLeft: 8,
    marginBottom: 4,
  },
});
