import { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { supabase } from '@/utils/supabase';
import { ChatMessage, ChatRoom, Profile } from '@/features/chat/types';

export function useChatRoom(roomId: string | undefined, userId: string | undefined, scrollViewRef: React.RefObject<ScrollView | null>) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !roomId) return;
    
    let isMounted = true;

    const fetchRoomAndMessages = async () => {
      setIsLoading(true);
      try {
        // 並列通信で依存関係のないデータを一気に取得
        const [
          roomRes,
          myProfileRes,
          messagesRes,
          // 未読メッセージの既読化処理（バックグラウンドで行うが、並列に組み込む）
          updateRes
        ] = await Promise.all([
          supabase.from('chat_rooms').select('*').eq('id', roomId).single(),
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

        if (roomRes.error || !roomRes.data) throw roomRes.error;
        if (!isMounted) return;

        setChatRoom(roomRes.data);
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
    isLoading
  };
}
