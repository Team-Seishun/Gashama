-- create_trade_with_points RPCの以下2点の不変条件が定義として存在するかを検証する。
-- 1. trades.report_id(nullでないもの同士)に一意性が課されている
--    (同一reportから複数のトレード募集が同時に作られる競合状態を防ぐ)
-- 2. RPC定義に「reportのitem_idとhave_item_idの不一致」「report既にトレード紐付き済み」
--    を弾くチェックが含まれている
--
-- 他のpgTAPテスト(points_check_constraints_test.sql等)と同じ方針で、実際に
-- INSERT/RPC呼び出しを行って動作検証するのではなく、pg_catalogの定義を直接確認する
-- カタログベースの方式にしている。理由: このプロジェクトのpgTAPテストはリンク済みの
-- リモートプロジェクトに対してsupabase test db --linkedで実行する前提であり
-- (#61/#65の決定を参照)、profiles/reports/trades は実データを持つ本番相当のテーブルで
-- auth.users等への外部キーも多い。検証のためだけに有効な行をINSERTしようとすると
-- フィクスチャ構築が複雑になり、リンク済みの実プロジェクトに意図しない副作用を
-- 持ち込むリスクがある。カタログ定義の確認であればBEGIN/ROLLBACK内で完結し、
-- 実データには一切触れない。
begin;
select plan(4);

-- 1. trades.report_id(not null)にunique indexが存在する
select has_index(
  'public', 'trades', 'trades_report_id_unique_idx',
  'trades.report_idにunique indexが定義されている'
);
select matches(
  pg_get_indexdef('public.trades_report_id_unique_idx'::regclass),
  'UNIQUE.*report_id.*WHERE.*report_id IS NOT NULL',
  'trades_report_id_unique_idxはreport_idがnullでない行同士でのみ一意性を強制する部分unique indexになっている'
);

-- 2. RPC定義に、report紐づきアイテムの不一致チェックが含まれている
select matches(
  pg_get_functiondef(
    'public.create_trade_with_points(int, uuid, uuid, text, text, text, uuid, uuid, uuid, text)'::regprocedure
  ),
  'report item does not match have item',
  'create_trade_with_pointsはreportのitem_idとhave_item_idの不一致を検証している'
);

-- 3. RPC定義に、report既にトレード紐付き済みのチェックが含まれている
select matches(
  pg_get_functiondef(
    'public.create_trade_with_points(int, uuid, uuid, text, text, text, uuid, uuid, uuid, text)'::regprocedure
  ),
  'report is already linked to a trade',
  'create_trade_with_pointsはreportが既に他のトレードに紐付いていないことを検証している'
);

select * from finish();
rollback;
