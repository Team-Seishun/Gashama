export type Profile = {
  id: string;
  nickname: string;
  icon_image: string | null;
};

export type ChatRoom = {
  id: string;
  trade_id: string;
  user_1_id: string;
  user_2_id: string;
  exchange_location: string | null;
  user_1_completed: boolean;
  user_2_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

// 一覧表示や画面内で扱いやすくするための拡張型
export type ChatRoomWithPartner = ChatRoom & {
  partner: Profile | null;
  latestMessage: string | null;
  latestMessageTime: string | null;
};
