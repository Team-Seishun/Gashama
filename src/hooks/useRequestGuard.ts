import { useRef } from 'react';

// 連打やRealtime通知の重複、画面遷移などで非同期リクエストが重なった際に、
// 古いリクエストの応答が新しい応答（または既にアンマウント済みの状態）を
// 上書きしないようにするための識別子ガード。
// TradeList.tsx・(tabs)/post.tsxで個別実装されていたrequestIdパターンを共通化したもの。
export function useRequestGuard() {
  const idRef = useRef(0);

  // リクエスト発行時に呼び、そのリクエスト固有のIDを取得する
  const start = () => ++idRef.current;

  // startで取得したIDが、その後により新しいリクエストや invalidate() によって
  // 無効化されていないか確認する
  const isStale = (id: number) => id !== idRef.current;

  // アンマウント時などに呼び、それまでに発行済みのIDをすべて無効化する
  const invalidate = () => {
    idRef.current += 1;
  };

  return { start, isStale, invalidate };
}
