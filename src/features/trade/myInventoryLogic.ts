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
// trade-create.tsx側でhaveItemIdが渡らず「譲るアイテム」が自由選択になってしまい、
// 写真で証明した内容と無関係なアイテムをトレードに出せてしまう
// （既存のreport-create.tsx経由のトレード作成フローでは、isCreatingTrade時に
// アイテム選択が必須化されており、この不変条件が常に保たれていた）。
export function filterTradeableInventories<T extends SelectableInventory>(
  inventories: T[],
  tradedReportIds: Iterable<string>
): T[] {
  return filterUntradedInventories(inventories, tradedReportIds).filter(
    (inv) => inv.item_id !== null
  );
}
