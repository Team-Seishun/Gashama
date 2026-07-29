import React from 'react';
import { View, StyleSheet, Image, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function CreateReportScreen() {
  const router = useRouter();
  // 前の画面から渡された写真のパス（photoUri）を取得
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        レポート作成
      </ThemedText>

      {/* 撮影した写真を表示 */}
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.image} />
      ) : (
        <ThemedText>写真が見つかりません</ThemedText>
      )}

      <Button title="戻る" onPress={() => router.back()} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: 20,
  },
  image: {
    width: 280,
    height: 280,
    borderRadius: 12,
    marginBottom: 20,
  },
});