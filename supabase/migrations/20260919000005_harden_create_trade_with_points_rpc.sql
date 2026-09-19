-- /code-reviewで指摘された、create_trade_with_points RPCまわりの2つの不備を修正する。
--
-- 1. trades.report_idにunique制約が無く、同一reportに対して複数のトレード募集が
--    同時に作成されうる（例: 同一ユーザーの2端末からのほぼ同時操作）。RPC内の
--    事前チェック(exists)だけでは、2つの呼び出しが同時にそのチェックを通過して
--    しまう競合状態を防げないため、DBレベルでunique制約による保証を追加する。
--    report_idはnull許容（トレード募集時に元のreportを指定しないケースがある）
--    なため、report_idがnullでない行同士でのみ一意性を強制する部分unique index
--    にする(NULL同士はPostgresのunique制約上そもそも重複とみなされない)。
--    命名は points_ledger_user_store_gachapon_day_uidx (20260906000000) の
--    _uidx サフィックス規約に合わせる。
--
--    同種の競合状態は apply_trade_request (20260903000000) では対象行への
--    `for update` ロックで防いでいるが、今回はRPC経由の呼び出しだけでなく
--    tradesへの直接INSERTが将来発生した場合にもデータ不整合を防ぎたいため、
--    RPC内のロックではなくDBのunique制約そのものを採用する。
create unique index if not exists trades_report_id_uidx
  on public.trades (report_id)
  where report_id is not null;

-- 2. p_report_idが渡された場合、そのreportが「呼び出し者本人のものであること」は
--    既に検証していたが、「reportに紐づく具体的なアイテム(item_id)と、今回譲る
--    として指定したp_have_item_idが一致すること」は検証していなかった。
--    アプリ側(filterTradeableInventories, src/features/trade/myInventoryLogic.ts)
--    はitem_id非nullの在庫のみをトレード作成候補として絞り込んでいるが、これは
--    クライアント側のみのガードであり、将来別の呼び出し経路やクライアントの
--    バグにより、アイテム未選択(item_id=null)のreportや無関係なhave_item_idで
--    トレードが作られてしまうと、写真で証明した内容と無関係なアイテムを
--    トレードに出せてしまう。RPC側でも同じ不変条件を検証する。
--
--    あわせて、report_idが既に他のトレードに紐付いている場合は、1で追加した
--    unique indexの生のエラー(duplicate key value violates unique constraint...)
--    がそのままクライアントに渡ってしまうのを避けるため、insert前の事前チェックで
--    分かりやすいメッセージを返す（have_item_id/want_item_id同様の既存方針を踏襲）。
--    ただし事前チェックだけでは真の同時実行競合は防げないため、insert自体も
--    exception blockで包み、unique_violationを同じ分かりやすいメッセージに変換する
--    （二重の防御。実際にデータの重複を防ぐのはあくまで1のunique indexそのもの）。
create or replace function public.create_trade_with_points(
  p_points_used int,
  p_have_item_id uuid,
  p_want_item_id uuid,
  p_user_name text,
  p_item_give text,
  p_item_want text,
  p_report_id uuid default null,
  p_store_id uuid default null,
  p_gachapon_id uuid default null,
  p_photo_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_points integer;
  v_trade_id uuid;
  v_report_user_id uuid;
  v_report_item_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_have_item_id = p_want_item_id then
    raise exception 'have and want items must differ';
  end if;

  -- コストの低い定数チェック（DBアクセスなし）を先に行い、無効な入力のために
  -- 不要なクエリや行ロックを取らない。
  -- p_points_used < 1 は「残高が足りない」のではなく「送られてきた値自体が不正」
  -- という別の原因なので、insufficient pointsとは別のメッセージにする
  -- （どちらも通常のステッパーUI操作では発生しない想定だが、原因が異なる以上
  -- 同じ文言で握りつぶすと将来の調査を誤誘導しかねないため）。
  -- NULLとの比較は真にならないため is null を明示的に含めないとすり抜け、
  -- points - NULL によって profiles.points の NOT NULL 制約違反という
  -- 生のDBエラーに落ちてしまう（実DBで確認済み）。
  if p_points_used is null or p_points_used < 1 then
    raise exception 'invalid points amount';
  end if;

  if p_points_used > 20 then
    raise exception 'points exceed per-trade limit';
  end if;

  -- have_item_id/want_item_idはtradesの外部キー制約で守られてはいるが、
  -- 違反時は生のFK違反エラーがそのままクライアントに渡ってしまう。
  -- report_idと同じ水準で、存在しないIDなら分かりやすいメッセージで弾く。
  -- p_report_idに紐づくreportとの整合性チェックより先に行うことで、
  -- 「have_item_id自体が不正」なケースを「reportのアイテムと不一致」という
  -- 誤ったメッセージで報告しないようにする。
  if not exists (select 1 from public.gachapon_items where id = p_have_item_id) then
    raise exception 'have item not found';
  end if;

  if not exists (select 1 from public.gachapon_items where id = p_want_item_id) then
    raise exception 'want item not found';
  end if;

  -- p_report_idが渡された場合のみ、呼び出し者本人のレポートであること・
  -- レポートに紐づくアイテムとhave_item_idが一致すること・まだ他のトレードに
  -- 紐付いていないことを検証する。所有者チェックとアイテム一致チェックは
  -- 同じreport行を見るため、v_current_pointsと同様にSELECT ... INTOで
  -- 1回のクエリにまとめ、同じ行への二重のインデックス参照を避ける。
  if p_report_id is not null then
    select user_id, item_id
      into v_report_user_id, v_report_item_id
      from public.reports
      where id = p_report_id;

    if not found or v_report_user_id is distinct from v_user_id then
      raise exception 'report does not belong to the caller';
    end if;

    if v_report_item_id is distinct from p_have_item_id then
      raise exception 'report item does not match have item';
    end if;

    if exists (select 1 from public.trades where report_id = p_report_id) then
      raise exception 'report is already linked to a trade';
    end if;
  end if;

  select points into v_current_points
    from public.profiles
    where id = v_user_id
    for update;

  if not found then
    raise exception 'profile not found for user';
  end if;

  if v_current_points < p_points_used then
    raise exception 'insufficient points';
  end if;

  update public.profiles
    set points = points - p_points_used
    where id = v_user_id;

  begin
    insert into public.trades (
      user_id, report_id, store_id, gachapon_id, have_item_id, want_item_id,
      status, photo_url, user_name, item_give, item_want, points_used
    )
    values (
      v_user_id, p_report_id, p_store_id, p_gachapon_id, p_have_item_id, p_want_item_id,
      1, p_photo_url, p_user_name, p_item_give, p_item_want, p_points_used
    )
    returning id into v_trade_id;
  exception
    when unique_violation then
      raise exception 'report is already linked to a trade';
  end;

  return v_trade_id;
end;
$$;

-- Supabaseはデフォルトでanon/authenticatedロールに対して、schema public内の関数への
-- EXECUTE権限をPUBLIC経由ではなく個別に付与している。そのため revoke ... from public
-- だけではanonのEXECUTE権限は取り消せない（award_report_pointsの実装時に実DBで確認済み）。
-- anonからも明示的にrevokeする。
revoke execute on function public.create_trade_with_points(int, uuid, uuid, text, text, text, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.create_trade_with_points(int, uuid, uuid, text, text, text, uuid, uuid, uuid, text) to authenticated;
