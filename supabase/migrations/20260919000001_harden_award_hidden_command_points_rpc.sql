-- award_hidden_command_points の堅牢化（#74レビュー指摘対応）。
--
-- 元の実装には次の2つの問題があった。
-- 1. p_photo_urlをサーバー側で一切検証しておらず、クライアントが任意の文字列を
--    渡せてしまう。RPCは認証済みユーザーなら誰でも直接呼び出せるため、実際には
--    Storageにアップロードしていない偽の「証拠写真」でreportsを汚染できてしまう。
-- 2. 重複排除が一切なく、同一ユーザーが連打（あるいはRPCを直接繰り返し呼ぶ）だけで
--    無制限にポイントとreportsを稼げてしまう。マップ画面の「10回タップ」はただの
--    クライアント側UIであり、サーバー側の防御にはなっていない。
--
-- 対応:
-- 1. p_photo_urlが、隠しコマンド専用に固定しているStorageオブジェクトパス
--    (reports/hidden-command-gieku-haku.png) を指すURLであることをlikeで検証する。
-- 2. award_report_pointsと同じpoints_ledgerの一意インデックス
--    (user_id, store_id, gachapon_id, awarded_date) を流用し、「同一ユーザーが
--    同じ暦日(JST)に1回だけ」発動できるようにする。既に発動済みの場合は
--    reports/profilesを一切変更せず0を返す（award_report_pointsの既存の
--    「0=獲得済み」という戻り値の意味と揃える）。

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
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  -- 証拠画像の偽装を防ぐため、隠しコマンド専用に固定しているStorageオブジェクト
  -- パスを指すURLであることを検証する（環境ごとにSupabaseのベースURLが異なる
  -- 可能性があるため、パス部分の一致のみをlikeで確認する）。
  if p_photo_url is null
    or p_photo_url not like '%/storage/v1/object/public/photos/reports/hidden-command-gieku-haku.png'
  then
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
