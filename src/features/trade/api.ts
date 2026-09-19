import { supabase } from '@/utils/supabase';

// 自分の在庫（reports）一覧を取得する。
// TradeList.tsx（トレード提案時の提供アイテム選択）と、Post画面の「+」ボタン
// （トレード募集作成用の在庫選択）の両方から共通で使う。
export function fetchMyInventories(userId: string) {
  return supabase
    .from('reports')
    .select('*, gachapon_items(id, name)')
    .eq('user_id', userId);
}

// 自分がこれまでにトレード募集を作成した際に紐付けたreport_idの一覧を取得する。
// Post画面の「+」ボタンで「まだトレード募集化されていない在庫」だけを
// 選択肢として出すために使う（詳細はmyInventoryLogic.tsのコメント参照）。
export async function fetchMyTradedReportIds(userId: string) {
  const { data, error } = await supabase
    .from('trades')
    .select('report_id')
    .eq('user_id', userId)
    .not('report_id', 'is', null);

  return {
    data: data ? data.map((row) => row.report_id as string) : null,
    error,
  };
}
