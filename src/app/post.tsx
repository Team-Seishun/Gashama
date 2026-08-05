import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function PostScreen() {
  useFocusEffect(
    useCallback(() => {
      console.log('PostScreen: mounted / focused');
      return () => {
        console.log('PostScreen: unmounted / unfocused');
      };
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: '#FFF3E0' }]}>
      <Text style={styles.text}>投稿画面</Text>
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
