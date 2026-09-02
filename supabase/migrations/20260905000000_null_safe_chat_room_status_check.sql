-- CodeRabbit CLIレビュー指摘: apply_trade_request内の重複申請チェックが
-- status <> 'rejected' というSQLの通常比較(<>)を使っていた。SQLの比較演算子は
-- 三値論理(true/false/unknown)のため、status がNULLの場合 status <> 'rejected' は
-- unknown(真ではない)と評価され、重複チェックが意図せずすり抜けてしまう。
--
-- 現状のアプリコードではchat_rooms.statusは常に明示的に設定されるため実害はないが、
-- NULL安全な比較演算子 IS DISTINCT FROM に変更し、将来的にstatusがNULLになる
-- ケースが増えても正しく「アクティブな申請」として扱われるようにする。

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

  -- IS DISTINCT FROMはNULLを「rejectedではない」＝アクティブ側として扱う
  -- NULL安全な比較演算子
  if exists (
    select 1 from public.chat_rooms
    where trade_id = p_trade_id and status is distinct from 'rejected'
  ) then
    raise exception 'trade already requested';
  end if;

  -- offered_report_idは申請者本人が所有するreports行でなければならない
  if not exists (
    select 1 from public.reports
    where id = p_offered_report_id and user_id = v_applicant_id
  ) then
    raise exception 'offered report must belong to the applicant';
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

revoke execute on function public.apply_trade_request(uuid, uuid) from public;
grant execute on function public.apply_trade_request(uuid, uuid) to authenticated;
