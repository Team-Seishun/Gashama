-- ポイント機能の追加。
-- 1. profiles.points: ユーザーの保有ポイント残高。
-- 2. trades.points_used: そのトレード投稿に費やされたポイント数（フィード表示順のブースト値）。
-- 3. points_ledger: 「同じユーザーが同じ店舗×ガチャポンの組み合わせで1日1回しか
--    レポート投稿ポイントを獲得できない」を保証するための台帳テーブル。
--    reportsテーブルを日付範囲でスキャンして判定する方式は、件数増加に伴い遅くなる上、
--    「JSTの暦日」という業務ルールをクエリ側で毎回正しく再現する必要があり事故りやすい。
--    awarded_date列とユニークインデックスを持つ専用テーブルにすることで、
--    重複判定をインデックス1本のexists/insertで完結させる。
--
-- このファイルはSQL Editor等から手動で再実行される可能性があるため、
-- 全体を通してDDLを冪等（何度実行しても同じ結果になる）にしてある。

alter table public.profiles
  add column if not exists points integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_points_non_negative;
alter table public.profiles
  add constraint profiles_points_non_negative check (points >= 0);

alter table public.trades
  add column if not exists points_used integer not null default 0;

alter table public.trades
  drop constraint if exists trades_points_used_non_negative;
alter table public.trades
  add constraint trades_points_used_non_negative check (points_used >= 0);

-- report_idは意図的にnullable + on delete set nullにしている。
-- reportsには本人によるDELETEを許可するRLSポリシーが既にあるため、もしon delete cascadeに
-- していると「レポートを削除→同じ店舗×ガチャポンで再投稿」するだけで1日1回制限をすり抜けて
-- 何度でもポイントを稼げてしまう（重複判定に使う(user_id, store_id, gachapon_id, awarded_date)
-- はreport_idを含まないため、report_idをnullにしても重複判定の効力は失われない）。
create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete cascade,
  gachapon_id uuid not null references public.gachapons(id) on delete cascade,
  points_awarded integer not null check (points_awarded >= 0),
  awarded_date date not null,
  created_at timestamptz not null default now()
);

comment on table public.points_ledger is
$$award_report_points RPCが書き込む、レポート投稿ポイント付与の台帳。(user_id, store_id, gachapon_id, awarded_date)のユニークインデックスで、同一ユーザー・同一店舗×ガチャポンの1日1回制限を保証する。$$;

-- 「同じユーザー×同じ店舗×同じガチャポン×同じ暦日」につき1回だけポイント付与できる、
-- という業務ルールそのものをこのユニークインデックスで表現する。award_report_points RPC内の
-- existsチェックに加えて、同時多発呼び出し（連打・ネットワーク再送）に対する最終防衛線になる。
create unique index if not exists points_ledger_user_store_gachapon_day_uidx
  on public.points_ledger (user_id, store_id, gachapon_id, awarded_date);

create index if not exists points_ledger_report_id_idx
  on public.points_ledger (report_id);

alter table public.points_ledger enable row level security;

-- 本人の獲得履歴の閲覧のみ許可。INSERT/UPDATE/DELETEのポリシーは意図的に作らない
-- （award_report_points RPCはsecurity definerとして実行され、テーブルのオーナー権限で
-- 動作するためRLSポリシーの有無に関係なく書き込める。クライアントから直接書き込む
-- 経路を一切用意しないことで、ポイント付与はRPC経由のみに限定する）。
drop policy if exists "points_ledger_select_own" on public.points_ledger;
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
--
-- 注意: Supabaseはデフォルトでauthenticated/anonにprofiles/tradesへのテーブル単位の
-- INSERT/UPDATE権限を付与している。テーブル単位の権限は列単位の権限より強く優先されるため、
-- points/points_used列だけをrevokeしても、テーブル単位の権限が生きていれば素通りしてしまう
-- （実際にhas_column_privilege等で確認済み: authenticated/anonは元々profiles/tradesの
-- テーブル単位UPDATEを持っていた）。そのためテーブル単位のINSERT/UPDATE権限を一旦revokeし、
-- points/points_usedを除いた列だけを明示的に列単位でgrantし直す。
revoke insert, update on public.profiles from authenticated, anon;
revoke insert, update on public.trades from authenticated, anon;

grant insert (
  id, nickname, evaluated_star, trade_history, contribution_level,
  created_at, updated_at, icon_image, self_introdution
), update (
  id, nickname, evaluated_star, trade_history, contribution_level,
  created_at, updated_at, icon_image, self_introdution
) on public.profiles to authenticated, anon;

grant insert (
  id, user_id, report_id, store_id, gachapon_id, have_item_id, want_item_id,
  status, buytime, photo_url, created_at, updated_at, user_name, item_give, item_want
), update (
  id, user_id, report_id, store_id, gachapon_id, have_item_id, want_item_id,
  status, buytime, photo_url, created_at, updated_at, user_name, item_give, item_want
) on public.trades to authenticated, anon;
