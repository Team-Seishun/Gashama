import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import SearchMasterView, { SearchResult } from '@/components/search-master-view';

export default function SearchScreen() {
  const router = useRouter();

  const handleSelectResult = (item: SearchResult) => {
    // 選択されたタイプによってパラメータを変えてマップ画面に戻る
    if (item.type === 'store') {
      router.navigate({ pathname: '/', params: { storeId: item.id } });
    } else if (item.type === 'gachapon') {
      router.navigate({ pathname: '/', params: { gachaponId: item.id } });
    }
  };

  return (
    <View style={styles.container}>
      <SearchMasterView 
        mode="all" 
        onSelect={handleSelectResult} 
        onClose={() => router.back()} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
