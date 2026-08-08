import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, SafeAreaView } from 'react-native';
import { FlashList } from '@shopify/flash-list';

export type SearchMasterMode = 'all' | 'store' | 'gachapon' | 'item';

export type SearchResult = {
  type: 'store' | 'gachapon' | 'item';
  id: string;
  name: string;
  address?: string;
  raw?: any;
};

type Props = {
  mode: SearchMasterMode;
  onSelect: (item: SearchResult) => void;
  onClose: () => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export default function SearchMasterView({ mode, onSelect, onClose, placeholder, autoFocus = true }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus) {
      // Androidでのオートフォーカスバグと、画面遷移中のフォーカス消失を防ぐため遅延フォーカス
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!searchQuery.trim()) {
        if (isMounted) setResults([]);
        return;
      }

      setLoading(true);

      const fetchStore = (mode === 'all' || mode === 'store');
      const fetchGachapon = (mode === 'all' || mode === 'gachapon');
      const fetchItem = (mode === 'item');

      const keywords = searchQuery.trim().split(/[\s　]+/);
      const promises: PromiseLike<any>[] = [];

      if (fetchStore) {
        let query = supabase.from('stores').select('*');
        keywords.forEach(kw => {
          query = query.ilike('name', `%${kw}%`);
        });
        promises.push(
          query.limit(20).then(res => ({ type: 'store', data: res.data }))
        );
      }
      
      if (fetchGachapon) {
        let query = supabase.from('gachapons').select('*');
        keywords.forEach(kw => {
          query = query.ilike('name', `%${kw}%`);
        });
        promises.push(
          query.limit(20).then(res => ({ type: 'gachapon', data: res.data }))
        );
      }

      if (fetchItem) {
        let query = supabase.from('gachapon_items').select('*');
        keywords.forEach(kw => {
          query = query.ilike('name', `%${kw}%`);
        });
        promises.push(
          query.limit(20).then(res => ({ type: 'item', data: res.data }))
        );
      }

      const resultsArr = await Promise.all(promises);

      let combined: SearchResult[] = [];
      
      resultsArr.forEach(res => {
        if (res.data) {
          res.data.forEach((item: any) => {
            combined.push({
              type: res.type as 'store' | 'gachapon' | 'item',
              id: item.id,
              name: item.name,
              address: item.address,
              raw: item,
            });
          });
        }
      });

      if (isMounted) {
        setResults(combined);
        setLoading(false);
      }
    };

    // デバウンス処理
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounceFn);
    };
  }, [searchQuery, mode]);

  const defaultPlaceholder = 
    mode === 'store' ? '店舗名で検索...' :
    mode === 'gachapon' ? 'ガシャポン商品名で検索...' :
    mode === 'item' ? 'アイテム名で検索...' :
    '店舗名、場所で検索...';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={placeholder || defaultPlaceholder}
            placeholderTextColor="#999"
            autoFocus={false}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            keyboardType="default"
            inputMode="text"
          />
          {loading ? (
            <ActivityIndicator size="small" color="#999" />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlashList
        data={results}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.resultItem} 
            onPress={() => onSelect(item)}
          >
            <Ionicons 
              name={
                item.type === 'store' ? "location-outline" : 
                item.type === 'item' ? "gift-outline" : 
                "cube-outline"
              } 
              size={24} 
              color={item.type === 'store' ? "#666" : "#007AFF"} 
            />
            <View style={styles.resultTextContainer}>
              <Text style={styles.storeName}>{item.name}</Text>
              {item.type === 'store' && item.address ? (
                <Text style={styles.storeAddress}>{item.address}</Text>
              ) : item.type === 'gachapon' ? (
                <Text style={styles.storeAddress}>ガシャポン商品</Text>
              ) : item.type === 'item' ? (
                <Text style={styles.storeAddress}>アイテム</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          searchQuery.trim().length > 0 && !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>該当するデータが見つかりませんでした。</Text>
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
    paddingVertical: 0,
    height: '100%',
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
