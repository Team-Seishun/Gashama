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

export type SelectableInventory = InventoryLike & { item_id: string | null };

// Post画面の「+」ボタンから新規トレード募集を作るための在庫一覧に絞り込む。
// 未トレード化であることに加え、item_id(具体的なアイテム)が選択されている
// 在庫だけを対象にする。report-create.tsxでは通常の在庫投稿時はアイテム選択が
// 任意(item_id: selectedItem?.id ?? null)なため、item_idがnullの在庫を許可すると
// trade-create.tsx側でhaveItemIdが渡らず「譲るアイテム」が自由選択できてしまう。
//
// 【この関数はUXのための絞り込みであり、正しさの最終的な保証はRPC側にある】
// 実際の不変条件（reportのitem_idとhave_item_idの一致・報告者本人であること・
// 既に他のトレードに紐付いていないこと）は、
// supabase/migrations/20260919000005_harden_create_trade_with_points_rpc.sql の
// create_trade_with_points RPCがサーバー側で検証しており、そちらが唯一の
// 信頼できる検証元(source of truth)。ここでの絞り込みは、選べない選択肢を
// 事前に一覧から除外してユーザー体験を良くするためのものであり、この関数を
// 緩めてもRPC側の検証により不正なトレードは作成されない
// （逆に、この関数だけを信頼してRPC側の検証を緩めてはならない）。
export function filterTradeableInventories<T extends SelectableInventory>(
  inventories: T[],
  tradedReportIds: Iterable<string>
): T[] {
  return filterUntradedInventories(inventories, tradedReportIds).filter(
    (inv) => inv.item_id !== null
  );
}
