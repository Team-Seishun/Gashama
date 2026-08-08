import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';

import { appTabDefinitions } from '@/constants/app-tabs';

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user.id) return;
    
    // 全体の未読数を取得する
    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', session.user.id);
      
      setTotalUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // リアルタイム更新のサブスクリプション
    const channel = supabase
      .channel('public:chat_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
      {state.routes.map((route, index: number) => {
        const definition = appTabDefinitions.find((tab) => tab.name === route.name);
        const { options } = descriptors[route.key];

        // Only render tabs that are explicitly defined in appTabDefinitions
        if (!definition) return null;

        const labelText =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : definition.title ?? route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const iconName = definition?.iconName ?? 'help-circle';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={() => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            }}
            style={styles.tabItem}
          >
            <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
              <Feather name={iconName as 'map' | 'plus-square' | 'camera' | 'message-circle' | 'user' | 'help-circle'} size={24} color="#333" />
              {route.name === 'chat' && totalUnreadCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{totalUnreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.activeTabLabel]}>{labelText}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 30,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
  },
  activeIconContainer: {
    backgroundColor: '#F8D8B8',
  },
  tabLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#333',
    fontWeight: 'bold',
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
