-- profiles.points / trades.points_used / points_ledger.points_awarded の
-- 非負(>= 0)CHECK制約が意図通り定義されているかを検証する。
--
-- 実際のINSERT/UPDATEでの検証(throws_ok等)ではなく、pg_catalogの制約定義を
-- 直接確認するカタログベースの方式にしている。理由: このプロジェクトのpgTAPテストは
-- リンク済みのリモートプロジェクトに対してsupabase test db --linkedで実行する前提であり
-- (#61/#65の決定を参照)、profiles/tradesは実データを持つ本番相当のテーブルで、
-- profiles.idはauth.users(id)への外部キーを持つなど他にも多くの制約がある。
-- 検証のためだけに有効な行をINSERTしようとするとフィクスチャ構築が複雑になり、
-- リンク済みの実プロジェクトに意図しない副作用を持ち込むリスクがある。
-- カタログ定義の確認であればBEGIN/ROLLBACK内で完結し、実データには一切触れない。
begin;
select plan(6);

-- profiles.points >= 0
select col_has_check(
  'public', 'profiles', 'points',
  'profiles.pointsにCHECK制約が定義されている'
);
select matches(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_points_non_negative'
  ),
  'points\s*>=\s*0',
  'profiles_points_non_negativeはpoints >= 0を検証する制約になっている'
);

-- trades.points_used >= 0
select col_has_check(
  'public', 'trades', 'points_used',
  'trades.points_usedにCHECK制約が定義されている'
);
select matches(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.trades'::regclass
      and conname = 'trades_points_used_non_negative'
  ),
  'points_used\s*>=\s*0',
  'trades_points_used_non_negativeはpoints_used >= 0を検証する制約になっている'
);

-- points_ledger.points_awarded >= 0
select col_has_check(
  'public', 'points_ledger', 'points_awarded',
  'points_ledger.points_awardedにCHECK制約が定義されている'
);
select matches(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.points_ledger'::regclass
      and conname = 'points_ledger_points_awarded_non_negative'
  ),
  'points_awarded\s*>=\s*0',
  'points_ledger_points_awarded_non_negativeはpoints_awarded >= 0を検証する制約になっている'
);

select * from finish();
rollback;
