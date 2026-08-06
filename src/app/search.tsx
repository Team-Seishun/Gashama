import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type SearchResult = {
  type: 'store' | 'gachapon';
  id: string;
  name: string;
  address?: string;
};

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStores = async () => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      const [storesRes, gachaponsRes] = await Promise.all([
        supabase
          .from('stores')
          .select('id, name, address')
          .ilike('name', `%${searchQuery}%`)
          .limit(10),
        supabase
          .from('gachapons')
          .select('id, name')
          .ilike('name', `%${searchQuery}%`)
          .limit(10)
      ]);

      let combined: SearchResult[] = [];
      if (storesRes.data) {
        combined = combined.concat(storesRes.data.map(s => ({ type: 'store', id: s.id, name: s.name, address: s.address })));
      }
      if (gachaponsRes.data) {
        combined = combined.concat(gachaponsRes.data.map(g => ({ type: 'gachapon', id: g.id, name: g.name })));
      }

      setResults(combined);
      setLoading(false);
    };

    // デバウンス処理（入力の度にAPIが走らないように少し待つ）
    const delayDebounceFn = setTimeout(() => {
      fetchStores();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectResult = (item: SearchResult) => {
    // 選択されたタイプによってパラメータを変えてマップ画面に戻る
    if (item.type === 'store') {
      router.navigate({ pathname: '/', params: { storeId: item.id } });
    } else {
      router.navigate({ pathname: '/', params: { gachaponId: item.id } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="店舗名、場所で検索..."
            placeholderTextColor="#999"
            autoFocus={true}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.resultItem} 
            onPress={() => handleSelectResult(item)}
          >
            <Ionicons 
              name={item.type === 'store' ? "location-outline" : "cube-outline"} 
              size={24} 
              color={item.type === 'store' ? "#666" : "#007AFF"} 
            />
            <View style={styles.resultTextContainer}>
              <Text style={styles.storeName}>{item.name}</Text>
              {item.type === 'store' && item.address ? (
                <Text style={styles.storeAddress}>{item.address}</Text>
              ) : item.type === 'gachapon' ? (
                <Text style={styles.storeAddress}>ガシャポン商品</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          searchQuery.trim().length > 0 && !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>該当する店舗が見つかりませんでした。</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    paddingRight: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 13,
    color: '#888',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
});
