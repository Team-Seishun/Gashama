import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function CameraScreen() {
  useFocusEffect(
    useCallback(() => {
      if (__DEV__) console.log('CameraScreen: focused');
      return () => {
        if (__DEV__) console.log('CameraScreen: blurred');
      };
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: '#E3F2FD' }]}>
      <Text style={styles.text}>カメラ画面</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
