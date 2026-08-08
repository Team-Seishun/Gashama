import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
// eslint-disable-next-line import/no-unresolved
import { supabase } from '@/lib/supabase';

interface Trade {
  id: string;
  item_give: string;
  item_want: string;
  user_name?: string;
  status?: string;
  created_at?: string;
}

export default function TradeScreen() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fetchTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('id, item_give, item_want, user_name, status, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trades:', error);
      } else if (data) {
        setTrades(data as Trade[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchTrades();
    };

    loadData();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
        },
        () => {
          fetchTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrades();
  };

79:   const renderItem = useCallback(({ item }: { item: Trade }) => (
80:     <View style={styles.card}>
...
90:     </View>
91:   ), []);


  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trades}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>トレード募集がありません</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  statusBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#eee',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tradeDetail: {
    gap: 4,
  },
  giveText: {
    fontSize: 15,
    color: '#e53935',
    fontWeight: '600',
  },
  wantText: {
    fontSize: 15,
    color: '#1e88e5',
    fontWeight: '600',
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
});