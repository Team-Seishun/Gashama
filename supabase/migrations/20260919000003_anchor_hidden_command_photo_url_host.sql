-- award_hidden_command_points のphoto_url検証を、ホスト名まで含めて固定する
-- （#74レビュー指摘対応）。
--
-- 20260919000002までの検証パターンは正規表現の先頭に ^ アンカーがなく、
-- 文字列の末尾が期待するStorageパスと一致してさえいれば、その前に任意の
-- 文字列（＝任意のホスト名）を置くことができてしまっていた。そのため、
-- 例えば以下のような完全に外部の（Supabaseとは無関係の）ドメインを指す
-- URLでも検証を通過し、+20ptと偽のreportsが作成できてしまっていた。
--
--   https://attacker-controlled.example.com/storage/v1/object/public/photos/reports/hidden-command_<own-uid>_<timestamp>.png
--
-- 実際にローカルのPostgresコンテナで再現し、検証をすり抜けることを確認した。
--
-- 対応: 正規表現の先頭に ^https://[Supabaseプロジェクトのサブドメイン].supabase.co
-- を要求するアンカーを追加し、ホスト名を含めて完全一致させる。

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
  v_now timestamptz := now();
  v_awarded_date date;
  v_inserted_count integer;
  v_updated_count integer;
  v_photo_url_pattern text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  -- 証拠画像の偽装・外部ドメインへのすり替えを防ぐため、
  -- 「https://<Supabaseプロジェクトのサブドメイン>.supabase.co」から始まり、
  -- 隠しコマンド専用のStorageパスプレフィックス配下に呼び出しユーザー自身の
  -- idを含むファイル名で終わるURLであることを、先頭・末尾ともにアンカーした
  -- 正規表現で検証する。
  v_photo_url_pattern :=
    '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/photos/reports/hidden-command_'
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
