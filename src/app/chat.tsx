import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ChatScreen() {
  useFocusEffect(
    useCallback(() => {
      if (__DEV__) console.log('ChatScreen: focused');
      return () => {
        if (__DEV__) console.log('ChatScreen: blurred');
      };
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: '#F3E5F5' }]}>
      <Text style={styles.text}>チャット画面</Text>
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
