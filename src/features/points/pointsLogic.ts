// トレード投稿画面(trade-create.tsx)・プロフィール画面(profile.tsx)で使う
// 「保有ポイント残高」まわりの純粋ロジックをまとめたモジュール。
// Supabase/Expo Routerに依存しないため、jestで単体テストできる。

// 1トレードあたりの消費ポイント上限。create_trade_with_points RPC
// (supabase/migrations/20260911000000_add_create_trade_with_points_rpc.sql)
// 側の固定値と一致させること。
export const POINTS_PER_TRADE_LIMIT = 20;

// pointsBalanceがnull(未取得・未ログイン)またはnull以外の0(残高0)のとき、
// ステッパー・送信ボタンを無効化する対象とみなす。
export function isPointsUnavailable(pointsBalance: number | null): boolean {
  return pointsBalance === null || pointsBalance === 0;
}

// 送信ボタンの無効化条件。未ログインの場合はポイント不足ではなく認証エラーとして
// 扱いたいため、isLoggedOutがtrueのときはここでは無効化しない
// (handleSubmit側の認証エラーに到達できるようにするため)。
export function isSubmitBlockedByPoints(
  pointsBalance: number | null,
  isLoggedOut: boolean
): boolean {
  return isPointsUnavailable(pointsBalance) && !isLoggedOut;
}

// ステッパーの上限値。残高が未取得(null)なら0、それ以外は
// min(残高, 1トレードあたりの上限)。
export function computeMaxPointsUsed(
  pointsBalance: number | null,
  limit: number = POINTS_PER_TRADE_LIMIT
): number {
  return pointsBalance === null ? 0 : Math.min(pointsBalance, limit);
}

export function isStepperDecrementDisabled(
  pointsBalance: number | null,
  pointsUsed: number
): boolean {
  return isPointsUnavailable(pointsBalance) || pointsUsed <= 1;
}

export function isStepperIncrementDisabled(
  pointsBalance: number | null,
  pointsUsed: number,
  maxPointsUsed: number
): boolean {
  return isPointsUnavailable(pointsBalance) || pointsUsed >= maxPointsUsed;
}

// ステッパーの可動範囲は1〜maxPointsUsed。範囲外の値を構造的に防ぐ。
export function decrementPointsUsed(prev: number): number {
  return Math.max(1, prev - 1);
}

export function incrementPointsUsed(prev: number, maxPointsUsed: number): number {
  return Math.min(maxPointsUsed, prev + 1);
}

// プロフィール画面での保有ポイント表示用。取得済みプロフィールのpointsが
// null/undefinedなら0として扱う(このファイル内の他の実績表示項目と同じ
// フォールバック方針)。
export function resolvePointsBalance(points: number | null | undefined): number {
  return points ?? 0;
}
