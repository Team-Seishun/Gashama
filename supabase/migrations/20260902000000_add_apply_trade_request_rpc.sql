-- トレード申請の確定処理（trade_requests → trades → chat_rooms → chat_messages の
-- 4つの書き込み）を1つのDB関数にまとめ、Postgresの関数呼び出し単位のトランザクション
-- （関数内で例外が発生すると、その関数内の変更がすべてロールバックされる）に乗せる。
-- これまではアプリ側から4回に分けてinsert/updateしており、途中（例えばネットワーク
-- エラー）で失敗するとtrade_requestsだけ作成されチャットルームが存在しない、といった
-- 不整合なデータが残る可能性があった。

create or replace function public.apply_trade_request(
  p_trade_id uuid,
  p_offered_report_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applicant_id uuid := auth.uid();
  v_trade record;
  v_room_id uuid;
begin
  if v_applicant_id is null then
    raise exception 'authentication required';
  end if;

  select id, user_id
    into v_trade
    from public.trades
    where id = p_trade_id
    for update;

  if not found then
    raise exception 'trade not found';
  end if;

  if v_trade.user_id = v_applicant_id then
    raise exception 'cannot apply to own trade';
  end if;

  insert into public.trade_requests (trade_id, applicant_id, status, offered_report_id)
  values (p_trade_id, v_applicant_id, 0, p_offered_report_id);

  update public.trades
    set status = 1
    where id = p_trade_id;

  insert into public.chat_rooms (trade_id, user_1_id, user_2_id, status)
  values (p_trade_id, v_applicant_id, v_trade.user_id, 'pending')
  returning id into v_room_id;

  insert into public.chat_messages (room_id, sender_id, message)
  values (
    v_room_id,
    v_applicant_id,
    '【システムメッセージ】' || chr(10) || '交換申請を送りました。相手の承認をお待ちください。'
  );

  return v_room_id;
end;
$$;

grant execute on function public.apply_trade_request(uuid, uuid) to authenticated;
