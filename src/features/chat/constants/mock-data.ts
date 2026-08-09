export const MOCK_CHAT_LIST = [
  {
    id: 'chat_1',
    user: 'Mina_Chan',
    message: '交換申請ありがとうございます！',
    time: '2分前',
    hasUnread: true,
    userColor: '#FCE4EC',
    type: 'sent' as const, // タップ時に自分が送った申請画面へ
  },
  {
    id: 'chat_2',
    user: 'Kaito_Gacha',
    message: 'こんにちは、ハチワレまだ在庫ありますか？',
    time: '1時間前',
    hasUnread: false,
    userColor: '#E1F5FE',
    type: 'received' as const, // タップ時に相手から来た申請画面へ
  },
  {
    id: 'chat_3',
    user: 'Sato_Collectors',
    message: '承知いたしました。駅前の店舗でお待ちして...',
    time: '3時間前',
    hasUnread: false,
    userColor: '#03A9F4', // 青色背景
    isTextAvatar: true,
    textAvatarInitial: 'S',
  },
  {
    id: 'chat_4',
    user: 'Yuki_ToyBox',
    message: '新しい入荷情報がありました！',
    time: '5時間前',
    hasUnread: true,
    userColor: '#EFEBE9',
  },
  {
    id: 'chat_5',
    user: 'Haru_12',
    message: '先日はありがとうございました！',
    time: '昨日',
    hasUnread: false,
    userColor: '#F5F5F5',
  },
];
