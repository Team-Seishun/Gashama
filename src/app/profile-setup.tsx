import { useAuth } from '@/features/auth/hooks/useAuth';
import { profileApi } from '@/features/profile/api/api';
import { PROFILE_ICON_OPTIONS, getProfileIconSource } from '@/features/profile/profile-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function ProfileSetupScreen() {
  const { session, initialized } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [selectedIconKey, setSelectedIconKey] = useState(PROFILE_ICON_OPTIONS[0].key);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialized && !session) {
      router.replace('/(auth)/login' as any);
    }
  }, [initialized, router, session]);

  const handleSave = async () => {
    if (!session) {
      Alert.alert('エラー', 'ログイン状態を確認できませんでした');
      return;
    }

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      Alert.alert('エラー', 'ニックネームを入力してください');
      return;
    }

    setLoading(true);
    const { error } = await profileApi.saveProfile({
      userId: session.user.id,
      nickname: trimmedNickname,
      iconImage: selectedIconKey,
    });

    setLoading(false);

    if (error) {
      Alert.alert('保存失敗', error.message);
      return;
    }

    router.replace('/' as any);
  };

  if (!initialized || !session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>プロフィールを設定</Text>
        <Text style={styles.description}>ニックネームとアイコンを選んで、はじめてのプロフィールを作成します。</Text>

        <View style={styles.previewContainer}>
          <Image source={getProfileIconSource(selectedIconKey)} style={styles.previewImage} />
          <Text style={styles.previewLabel}>{nickname.trim() || 'ニックネーム未設定'}</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>ニックネーム</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="表示名を入力"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>アイコン</Text>
          <View style={styles.iconGrid}>
            {PROFILE_ICON_OPTIONS.map((option) => {
              const selected = option.key === selectedIconKey;

              return (
                <Pressable
                  key={option.key}
                  onPress={() => setSelectedIconKey(option.key)}
                  style={[styles.iconButton, selected && styles.iconButtonSelected]}>
                  <Image source={option.source} style={styles.iconImage} />
                  <Text style={styles.iconLabel}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={loading}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && !loading && styles.saveButtonPressed,
            loading && styles.saveButtonDisabled,
          ]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>保存して始める</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#eef6fb',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef6fb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    gap: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  previewContainer: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  previewImage: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconButton: {
    width: '47%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  iconButtonSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#e0f2fe',
  },
  iconImage: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  iconLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  saveButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});