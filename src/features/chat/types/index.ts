export type Profile = {
  id: string;
  nickname: string;
  icon_image: string | null;
};

export type TradeSummary = {
  id: string;
  item_give: string | null;
  item_want: string | null;
  photo_url: string | null;
  gachapons: { name: string } | { name: string }[] | null;
};

export type ChatRoom = {
  id: string;
  trade_id: string;
  user_1_id: string;
  user_2_id: string;
  exchange_location: string | null;
  status: 'pending' | 'approved' | 'rejected';
  user_1_completed: boolean;
  user_2_completed: boolean;
  created_at: string;
  updated_at: string;
  trade?: TradeSummary | null;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  image_url: string | null;
  is_read?: boolean; // 新規追加
  created_at: string;
  updated_at: string;
};

// 一覧表示や画面内で扱いやすくするための拡張型
export type ChatRoomWithPartner = ChatRoom & {
  partner: Profile | null;
  latestMessage: string | null;
  latestMessageTime: string | null;
  unreadCount?: number; // 新規追加
  trade?: {
    item_give: string | null;
    item_want: string | null;
    gachapons: { name: string } | { name: string }[] | null;
  } | null;
};
