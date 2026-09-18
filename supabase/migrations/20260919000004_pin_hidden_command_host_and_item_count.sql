-- award_hidden_command_points をCodeRabbitのレビュー指摘に対応して修正する（#74）。
--
-- 1. (Security/Minor) photo_urlの検証が `^https://[a-z0-9]+\.supabase\.co/...` という
--    パターンで、任意のSupabaseプロジェクトのサブドメインを許容してしまっていた。
--    攻撃者が自分自身の別Supabaseプロジェクトで`photos`という名前の公開バケットを
--    作成し、期待するパスパターンに一致する画像をアップロードすれば、検証を通過して
--    しまう。ホスト名を本プロジェクトの実際のサブドメイン(gdkgcirmecsnnfkpzmrt)に
--    ピン留めして固定する。
--
-- 2. (Data Integrity/Major) 対象ガチャポンのgachapon_itemsに対するreports一括insert後、
--    実際に何件insertされたかを検証していなかった。将来gachapon_itemsのデータが
--    変更され6件でなくなった場合でも、無条件に+20pt付与・成功扱いにしてしまう。
--    insert直後の行数を取得し、期待する6件と異なる場合は例外を投げて
--    ポイント付与ごとロールバックする。

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
  -- 「技育博」専用ダミー店舗（20260919000000マイグレーションでinsertした固定id）
  v_store_id uuid := '0c4d3953-95d8-4c29-9c82-a9df1b46da6f';
  -- 対象ガチャポン: 銀河特急 ミルキー☆サブウェイ めじるしアクセサリー
  v_gachapon_id uuid := 'b7105b74-5ce0-45dd-bd54-e57c09ecae61';
  -- 対象ガチャポンに紐づくgachapon_itemsの件数（マックス/チハル/マキナ/アカネ/
  -- カナタ/カートの6件を想定）。実際のinsert件数がこれと一致しない場合は
  -- データが想定外に変化しているとみなし、例外を投げる。
  v_expected_item_count constant integer := 6;
  v_now timestamptz := now();
  v_awarded_date date;
  v_inserted_count integer;
  v_report_count integer;
  v_updated_count integer;
  v_photo_url_pattern text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  -- 証拠画像の偽装・外部ドメインへのすり替えを防ぐため、本プロジェクトの
  -- Supabaseホスト名まで固定した上で、隠しコマンド専用のStorageパスプレフィックス
  -- 配下に呼び出しユーザー自身のidを含むファイル名で終わるURLであることを検証する
  -- （ホスト名を`[a-z0-9]+\.supabase\.co`のように緩く許容すると、攻撃者が自分自身の
  -- 別Supabaseプロジェクトで同名の公開バケットを用意して検証を回避できてしまうため）。
  v_photo_url_pattern :=
    '^https://gdkgcirmecsnnfkpzmrt\.supabase\.co/storage/v1/object/public/photos/reports/hidden-command_'
    || v_user_id::text || '_[0-9]+\.png$';

  if p_photo_url is null or p_photo_url !~ v_photo_url_pattern then
    raise exception 'invalid photo_url';
  end if;

  v_awarded_date := (v_now at time zone 'Asia/Tokyo')::date;

  -- 「同一ユーザー×このダミー店舗×対象ガチャポン×同一暦日」につき1回だけ
  -- 発動できるようにする。report_idはこのRPCでは単一のreportに紐付かないため
  -- nullにする（award_report_pointsのreport_id削除時の扱いと同じくnullable）。
  insert into public.points_ledger (user_id, report_id, store_id, gachapon_id, points_awarded, awarded_date)
  values (v_user_id, null, v_store_id, v_gachapon_id, 20, v_awarded_date)
  on conflict (user_id, store_id, gachapon_id, awarded_date) do nothing;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 0 then
    -- 本日は発動済み。reports/profilesは変更せず、award_report_pointsと同様に
    -- 「0pt」を返すことでクライアント側に「未獲得」を伝える。
    return 0;
  end if;

  -- 対象ガチャポンのアイテム全件について、在庫投稿(reports)が完了した
  -- ことにする。通常のreport投稿と同じ形のレコードを1アイテムにつき1件作成する。
  insert into public.reports (user_id, store_id, gachapon_id, item_id, buytime, photo_url, stock_status)
  select v_user_id, v_store_id, v_gachapon_id, gi.id, v_now, p_photo_url, 2
  from public.gachapon_items gi
  where gi.gachapon_id = v_gachapon_id;

  get diagnostics v_report_count = row_count;

  if v_report_count <> v_expected_item_count then
    -- gachapon_itemsのデータが想定外に変化している。ポイントもreportsも
    -- 一切確定させたくないため例外を投げ、直前のpoints_ledger insertを
    -- 含むこの関数呼び出し全体をロールバックする。
    raise exception 'expected % target items, found %', v_expected_item_count, v_report_count;
  end if;

  update public.profiles
    set points = points + 20
    where id = v_user_id;

  get diagnostics v_updated_count = row_count;

  -- profiles行が存在しない場合(通常は起こらないが、award_report_pointsと同様の
  -- 防御的チェック)、points_ledgerだけ記録されて残高が増えない不整合を防ぐ。
  if v_updated_count = 0 then
    raise exception 'profile not found for user';
  end if;

  return 20;
end;
$$;
