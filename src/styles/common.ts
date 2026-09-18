import { StyleSheet } from 'react-native';

// 画面間で重複しがちな共通スタイル。ここに追加したものは各画面から読み込んで使う。
export const commonStyles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
