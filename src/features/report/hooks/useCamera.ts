import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export const useCamera = () => {
  const takePhoto = async () => {
    // 1. カメラの使用許可（パーミッション）をリクエスト
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('権限エラー', 'カメラの使用許可が必要です');
      return null; // 許可されなかったら何もしない
    }

    // 2. カメラを起動して撮影
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, // 撮影後にトリミング（切り抜き）を許可
      aspect: [1, 1],      // 正方形にクロップ
      quality: 0.8,        // 画質
    });

    // 3. 撮影が完了したら、写真のURI（スマホ内のパス）を返す
    if (!result.canceled) {
      return result.assets[0].uri;
    }

    // キャンセルされた場合
    return null;
  };

  return { takePhoto };
};