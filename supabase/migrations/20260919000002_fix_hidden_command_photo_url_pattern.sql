-- award_hidden_command_points のphoto_url検証パターンを修正する（#74レビュー指摘対応）。
--
-- 20260919000001では、証拠画像を単一の固定Storageパス
-- (reports/hidden-command-gieku-haku.png) にupsert:trueでアップロードし、
-- RPC側もその固定パスの完全一致のみを許可していた。
--
-- しかしstorage.objectsの'photos'バケットにはauthenticated向けのUPDATEポリシーが
-- 存在せずINSERTのみが許可されているため、同一パスへの2回目以降のupsertアップロードは
-- 必ずRLS違反で失敗する（最初にアップロードした1回だけが成功し、以降は誰が発動しても
-- 失敗する）ことが判明した。
--
-- クライアント側を、通常のreport投稿(report-create.tsx)と同様に呼び出しごとに
-- 一意なファイル名（reports/hidden-command_{user_id}_{timestamp}.png）へ
-- 常に新規アップロード(upsert:false)する方式に変更したため、RPC側の検証も
-- そのパターンに合わせて更新する。あわせて、ファイル名に呼び出しユーザー自身の
-- idが含まれることも検証し、他人がアップロードしたURLをそのまま流用できないようにする。

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

  -- 証拠画像の偽装を防ぐため、隠しコマンド専用のStorageパスプレフィックス配下に、
  -- 呼び出しユーザー自身のidを含むファイル名でアップロードされたURLであることを
  -- 検証する（環境ごとにSupabaseのベースURLが異なる可能性があるため、パス部分の
  -- パターンのみを正規表現で確認する）。
  v_photo_url_pattern :=
    '/storage/v1/object/public/photos/reports/hidden-command_' || v_user_id::text || '_[0-9]+\.png$';

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
