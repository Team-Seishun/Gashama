import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  useFocusEffect(
    useCallback(() => {
      if (__DEV__) console.log('ProfileScreen: focused');
      return () => {
        if (__DEV__) console.log('ProfileScreen: blurred');
      };
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: '#FFF8E1' }]}>
      <Text style={styles.text}>プロフィール画面</Text>
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
