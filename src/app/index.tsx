import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function MapScreen() {
  useFocusEffect(
    useCallback(() => {
      if (__DEV__) console.log('MapScreen: mounted / focused');
      return () => {
        if (__DEV__) console.log('MapScreen: unmounted / unfocused');
      };
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: '#E8F5E9' }]}>
      <Text style={styles.text}>マップ画面</Text>
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
