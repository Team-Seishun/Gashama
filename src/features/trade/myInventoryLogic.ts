// Post画面の「+」ボタン（トレード募集作成）で使う、自分の在庫(reports)から
// 「まだトレード募集化されていないもの」を絞り込む純粋ロジック。
// Supabase/Expo Routerに依存しないため、jestで単体テストできる。

export type InventoryLike = { id: string };

// tradedReportIdsは、自分がこれまでにcreate_trade_with_points RPC経由で
// トレード募集を作成した際に紐付けたreports.idの集合。
// trades.statusはこのアプリでは作成時から常に1固定で運用されており
// （supabase/migrations/20260904000000_fix_apply_trade_request_rejected_reapply.sql
// 参照）、開閉状態を表す値として使われていない。そのためstatusによる絞り込みは行わず、
// 「そのreport_idを参照するtrades行が存在するかどうか」だけで
// 「トレード募集化済みか」を判定する。
export function filterUntradedInventories<T extends InventoryLike>(
  inventories: T[],
  tradedReportIds: Iterable<string>
): T[] {
  const tradedIds = new Set(tradedReportIds);
  return inventories.filter((inv) => !tradedIds.has(inv.id));
}
