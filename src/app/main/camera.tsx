import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Button, Image, StyleSheet, Text, View } from 'react-native';

export default function CameraScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (__DEV__) console.log('CameraScreen: focused');
      return () => {
        if (__DEV__) console.log('CameraScreen: blurred');
      };
    }, [])
  );

  // カメラ撮影処理
  const takePhoto = async () => {
    // 1. パーミッション（使用許可）の確認
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("アクセス制限", "カメラの許可が必要です。");
      return;
    }

    // 2. カメラ起動
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    // 3. 撮影画像の保持
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#E3F2FD' }]}>
      <Text style={styles.text}>カメラ画面</Text>

      {/* 撮影ボタン */}
      <View style={styles.buttonContainer}>
        <Button title="写真を撮影する" onPress={takePhoto} />
      </View>

      {/* 撮影した画像のプレビュー */}
      {imageUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  previewContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  previewImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
  },
});