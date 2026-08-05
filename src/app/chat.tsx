import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function ChatScreen() {
  useFocusEffect(
    useCallback(() => {
      console.log('ChatScreen: mounted / focused');
      return () => {
        console.log('ChatScreen: unmounted / unfocused');
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
