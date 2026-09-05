-- ポイント機能の追加。
-- 1. profiles.points: ユーザーの保有ポイント残高。
-- 2. trades.points_used: そのトレード投稿に費やされたポイント数（フィード表示順のブースト値）。
-- 3. points_ledger: 「同じユーザーが同じ店舗×ガチャポンの組み合わせで1日1回しか
--    レポート投稿ポイントを獲得できない」を保証するための台帳テーブル。
--    reportsテーブルを日付範囲でスキャンして判定する方式は、件数増加に伴い遅くなる上、
--    「JSTの暦日」という業務ルールをクエリ側で毎回正しく再現する必要があり事故りやすい。
--    awarded_date列とユニーク制約を持つ専用テーブルにすることで、
--    重複判定をインデックス1本のexists/insertで完結させる。

alter table public.profiles
  add column if not exists points integer not null default 0;

alter table public.profiles
  add constraint profiles_points_non_negative check (points >= 0);

alter table public.trades
  add column if not exists points_used integer not null default 0;

alter table public.trades
  add constraint trades_points_used_non_negative check (points_used >= 0);

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  gachapon_id uuid not null references public.gachapons(id) on delete cascade,
  points_awarded integer not null,
  awarded_date date not null,
  created_at timestamptz not null default now()
);

comment on table public.points_ledger is
$$award_report_points RPCが書き込む、レポート投稿ポイント付与の台帳。(user_id, store_id, gachapon_id, awarded_date)のユニーク制約で、同一ユーザー・同一店舗×ガチャポンの1日1回制限を保証する。$$;

-- 「同じユーザー×同じ店舗×同じガチャポン×同じ暦日」につき1回だけポイント付与できる、
-- という業務ルールそのものをDB制約として表現する。award_report_points RPC内のexistsチェックに
-- 加えて、同時多発呼び出し（連打・ネットワーク再送）に対する最終防衛線になる。
create unique index if not exists points_ledger_user_store_gachapon_day_uidx
  on public.points_ledger (user_id, store_id, gachapon_id, awarded_date);

create index if not exists points_ledger_report_id_idx
  on public.points_ledger (report_id);

alter table public.points_ledger enable row level security;

-- 本人の獲得履歴の閲覧のみ許可。INSERT/UPDATE/DELETEのポリシーは意図的に作らない
-- （award_report_points RPCはsecurity definerとして実行され、テーブルのオーナー権限で
-- 動作するためRLSポリシーの有無に関係なく書き込める。クライアントから直接書き込む
-- 経路を一切用意しないことで、ポイント付与はRPC経由のみに限定する）。
create policy "points_ledger_select_own"
  on public.points_ledger
  for select
  to authenticated
  using (user_id = auth.uid());

-- profiles.points / trades.points_used はサーバー側RPC（award_report_points /
-- create_trade_with_points）だけが変更できる「信頼された通貨」であるべきで、
-- クライアントがsupabase.from('profiles').update({ points: ... }) のような直接更新や、
-- supabase.from('trades').insert({ points_used: ... }) のような直接指定で
-- 不正に値を書き換えられてはならない。
-- profiles/tradesには（本リポジトリ外の）既存RLSポリシーが多数あり得るため、行レベルの
-- ポリシーを新規に追加するのではなく、対象カラムに対する列レベル権限を明示的に剥奪する。
-- security definer なRPC自身は、マイグレーションを実行するロール（テーブルオーナー相当）の
-- 権限で動作するため、この列レベルREVOKEの影響を受けない。
revoke update (points) on public.profiles from authenticated, anon;
revoke insert (points) on public.profiles from authenticated, anon;

revoke update (points_used) on public.trades from authenticated, anon;
revoke insert (points_used) on public.trades from authenticated, anon;
