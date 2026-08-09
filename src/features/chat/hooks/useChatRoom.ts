import { ChatMessage, ChatRoom, Profile, TradeSummary } from '@/features/chat/types';
import { supabase } from '@/utils/supabase';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';

export function useChatRoom(roomId: string | undefined, userId: string | undefined, scrollViewRef: React.RefObject<ScrollView | null>) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [trade, setTrade] = useState<TradeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !roomId) return;
    
    let isMounted = true;

    const fetchRoomAndMessages = async () => {
      setIsLoading(true);
      try {
        const roomRes = await supabase.from('chat_rooms').select('*').eq('id', roomId).single();
        if (roomRes.error || !roomRes.data) throw roomRes.error;

        const tradeId = roomRes.data.trade_id;

        const [tradeRes, myProfileRes, messagesRes, updateRes] = await Promise.all([
          tradeId
            ? supabase
                .from('trades')
                .select('id, item_give, item_want, photo_url, gachapons(name)')
                .eq('id', tradeId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase.from('profiles').select('id, nickname, icon_image').eq('id', userId).single(),
          supabase.from('chat_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
          supabase
            .from('chat_messages')
            .update({ is_read: true })
            .eq('room_id', roomId)
            .eq('is_read', false)
            .neq('sender_id', userId)
            .select()
        ]);

        if (tradeRes?.error) {
          console.error('Failed to fetch trade details:', tradeRes.error);
        }
        if (myProfileRes.error) {
          console.error('Failed to fetch my profile:', myProfileRes.error);
        }
        if (messagesRes.error) {
          console.error('Failed to fetch messages:', messagesRes.error);
        }

        if (!isMounted) return;

        setChatRoom({ ...roomRes.data, trade: tradeRes?.data ? (tradeRes.data as TradeSummary) : null });
        setTrade(tradeRes?.data ? (tradeRes.data as TradeSummary) : null);
        if (myProfileRes.data) setMyProfile(myProfileRes.data);
        if (messagesRes.data) setMessages(messagesRes.data);

        if (updateRes?.error) {
          console.error('Failed to update read status:', updateRes.error);
        }

        // roomData が取得できたので、相手のIDを特定してプロフィールを取得
        const partnerId = roomRes.data.user_1_id === userId ? roomRes.data.user_2_id : roomRes.data.user_1_id;
        const { data: partnerData } = await supabase
          .from('profiles')
          .select('id, nickname, icon_image')
          .eq('id', partnerId)
          .single();
          
        if (isMounted && partnerData) setPartner(partnerData);
        
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
      } catch (error) {
        console.error('Error fetching chat details:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRoomAndMessages();
    
    // Realtime サブスクリプション
    const channel = supabase
      .channel(`chat_messages_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // 重複防止
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

          // 現在画面を開いている状態で相手からメッセージが来た場合、すぐに既読にする
          if (newMessage.sender_id !== userId) {
            supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', newMessage.id)
              .then(({ error }) => {
                if (error) console.error('Failed to mark incoming message as read:', error);
              });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages((prev) => 
            prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          );
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId, userId, scrollViewRef]); // session オブジェクト全体への依存を排除

  return {
    messages,
    setMessages,
    partner,
    myProfile,
    chatRoom,
    setChatRoom,
    trade,
    isLoading
  };
}
