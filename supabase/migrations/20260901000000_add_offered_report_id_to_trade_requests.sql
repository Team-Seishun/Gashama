-- トレード申請時に「提供した在庫（reports行）」をIDで正式に記録できるようにする。
-- これまでは trade_requests に提供アイテムを紐付ける列がなく、
-- チャットのシステムメッセージ本文にアイテム名を埋め込むだけの応急処置になっていた。

alter table public.trade_requests
  add column if not exists offered_report_id uuid references public.reports(id) on delete set null;

comment on column public.trade_requests.offered_report_id is
  '申請者が提供したアイテムのreports.id。TradeList.tsxのhandleConfirmApplyTradeで設定される。';
