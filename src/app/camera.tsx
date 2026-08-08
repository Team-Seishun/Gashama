import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Alert, Platform, View } from 'react-native';

export default function CameraScreen() {
  const router = useRouter();
  // 二重起動を防止するためのフラグ
  const isLaunchingRef = useRef(false);

  // 画面にフォーカスが当たった瞬間に端末の標準カメラを即起動
  useFocusEffect(
    useCallback(() => {
      const launchCameraDirectly = async () => {
        if (isLaunchingRef.current) return;
        isLaunchingRef.current = true;

        try {
          if (Platform.OS === 'web') {
            Alert.alert('Web非対応', 'カメラはスマートフォンアプリからご利用ください。');
            router.back();
            return;
          }

          // 1. パーミッションの確認
          const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

          if (!permissionResult.granted) {
            Alert.alert('アクセス制限', 'カメラの許可が必要です。');
            router.back();
            return;
          }

          // 2. カメラ起動
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          });

          // 3. 撮影されたらそのまま report-create へ遷移
          if (!result.canceled && result.assets[0]?.uri) {
            const capturedUri = result.assets[0].uri;
            router.replace({
              pathname: '/report-create',
              // URIを安全にパラメータとして渡すためにエンコードする
              params: { imageUri: encodeURIComponent(capturedUri) },
            });
          } else {
            // 撮影がキャンセルされた場合は元の画面に戻る
            router.back();
          }
        } catch (error) {
          console.error('CameraScreen: failed to launch camera', error);
          Alert.alert('カメラエラー', 'カメラの起動に失敗しました。もう一度お試しください。');
          router.back();
        } finally {
          isLaunchingRef.current = false;
        }
      };

      launchCameraDirectly();
    }, [router])
  );

  // 中間のボタンやテキスト画面は描画しない
  return <View style={{ flex: 1, backgroundColor: '#000' }} />;
}