import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function ProfileScreen() {
  useFocusEffect(
    useCallback(() => {
      console.log('ProfileScreen: mounted / focused');
      return () => {
        console.log('ProfileScreen: unmounted / unfocused');
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
