-- トレード募集投稿時に「ポイント消費」と「tradesへのinsert」を1つの処理としてまとめる
-- RPC。片方だけ成功する不整合（ポイントだけ減ってトレードが無い等）を防ぐため、
-- apply_trade_request と同じくsecurity definer + for update の行ロックパターンを踏襲する。

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

  -- p_report_idが渡された場合のみ、呼び出し者本人のレポートであることを検証する
  -- （award_report_pointsと同様。他人のレポートに紐付いたトレードを作れないようにする）
  if p_report_id is not null then
    if not exists (
      select 1 from public.reports
      where id = p_report_id and user_id = v_user_id
    ) then
      raise exception 'report does not belong to the caller';
    end if;
  end if;

  -- have_item_id/want_item_idはtradesの外部キー制約で守られてはいるが、
  -- 違反時は生のFK違反エラーがそのままクライアントに渡ってしまう。
  -- report_idと同じ水準で、存在しないIDなら分かりやすいメッセージで弾く
  if not exists (select 1 from public.gachapon_items where id = p_have_item_id) then
    raise exception 'have item not found';
  end if;

  if not exists (select 1 from public.gachapon_items where id = p_want_item_id) then
    raise exception 'want item not found';
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

  insert into public.trades (
    user_id, report_id, store_id, gachapon_id, have_item_id, want_item_id,
    status, photo_url, user_name, item_give, item_want, points_used
  )
  values (
    v_user_id, p_report_id, p_store_id, p_gachapon_id, p_have_item_id, p_want_item_id,
    1, p_photo_url, p_user_name, p_item_give, p_item_want, p_points_used
  )
  returning id into v_trade_id;

  return v_trade_id;
end;
$$;

-- Supabaseはデフォルトでanon/authenticatedロールに対して、schema public内の関数への
-- EXECUTE権限をPUBLIC経由ではなく個別に付与している。そのため revoke ... from public
-- だけではanonのEXECUTE権限は取り消せない（award_report_pointsの実装時に実DBで確認済み）。
-- anonからも明示的にrevokeする。
revoke execute on function public.create_trade_with_points(int, uuid, uuid, text, text, text, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.create_trade_with_points(int, uuid, uuid, text, text, text, uuid, uuid, uuid, text) to authenticated;
