-- 技育博デモ用の隠しコマンド機能。
-- マップ画面の「現在地に戻る」ボタンを10回連続タップすると、
--   1. profiles.points に固定+20する
--   2. 対象ガチャポン(b7105b74-5ce0-45dd-bd54-e57c09ecae61
--      「銀河特急 ミルキー☆サブウェイ めじるしアクセサリー」)に紐づく
--      gachapon_items 全件について、在庫投稿(reports)が完了したことにする
-- という、来場者向けデモ用の開発者向け隠し機能。会場を回って複数店舗の
-- 在庫報告を集めなくても、その場で全アイテム保有済み状態を作れるようにする。
--
-- 通常のレポート投稿・award_report_points（1投稿10pt、店舗×ガチャポン×日で
-- 重複排除）とは完全に独立した専用の店舗・専用RPCで実現し、既存のポイント
-- 制限ロジックに一切影響を与えないようにする。

-- 1. 「技育博」専用ダミー店舗。
-- idを固定しておくことで、このファイルを再実行しても重複作成されない
-- （upsertではなくwhere not existsにしているのは、既に手動で調整された値を
-- 上書きしないため）。
insert into public.stores (id, name, location, address, open_time, close_time, machine_count)
select
  '0c4d3953-95d8-4c29-9c82-a9df1b46da6f',
  '技育博（隠しコマンド専用）',
  '(35.1709,136.9082)',
  '隠しコマンドのデモ投稿専用のダミー店舗です',
  '00:00:00',
  '23:59:59',
  0
where not exists (
  select 1 from public.stores where id = '0c4d3953-95d8-4c29-9c82-a9df1b46da6f'
);

-- 2. 隠しコマンド専用のポイント付与 + 在庫一括投稿RPC。
create or replace function public.award_hidden_command_points(
  p_photo_url text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  -- 「技育博」専用ダミー店舗（このマイグレーションでinsertした固定id）
  v_store_id uuid := '0c4d3953-95d8-4c29-9c82-a9df1b46da6f';
  -- 対象ガチャポン: 銀河特急 ミルキー☆サブウェイ めじるしアクセサリー
  v_gachapon_id uuid := 'b7105b74-5ce0-45dd-bd54-e57c09ecae61';
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_photo_url is null or length(trim(p_photo_url)) = 0 then
    raise exception 'photo_url is required';
  end if;

  -- 対象ガチャポンのアイテム全件について、在庫投稿(reports)が完了した
  -- ことにする。通常のreport投稿と同じ形のレコードを1アイテムにつき1件作成する。
  insert into public.reports (user_id, store_id, gachapon_id, item_id, buytime, photo_url, stock_status)
  select v_user_id, v_store_id, v_gachapon_id, gi.id, v_now, p_photo_url, 2
  from public.gachapon_items gi
  where gi.gachapon_id = v_gachapon_id;

  -- 隠しコマンド専用の固定+20pt。award_report_points（店舗×ガチャポン×日の
  -- 重複排除）とは独立した経路のため、ここでは点数の重複判定を意図的に行わない
  -- （デモのたびに何度でも発動できるようにするため）。
  update public.profiles
    set points = points + 20
    where id = v_user_id;

  return 20;
end;
$$;

-- Supabaseはデフォルトでanon/authenticatedロールに対して、schema public内の関数への
-- EXECUTE権限をPUBLIC経由ではなく個別に付与している。そのため revoke ... from public
-- だけではanonのEXECUTE権限は取り消せない（award_report_pointsと同じ理由）。
revoke execute on function public.award_hidden_command_points(text) from public, anon;
grant execute on function public.award_hidden_command_points(text) to authenticated;
