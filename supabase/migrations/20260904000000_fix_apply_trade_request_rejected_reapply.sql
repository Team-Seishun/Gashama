-- CodeRabbitレビューで指摘された2点を修正する。
--
-- 1. 却下(rejected)されたトレードに誰も再申請できなくなる不具合
--    重複申請チェックがtrade_requestsの存在有無だけを見ていたが、trade_requests.status
--    はこのアプリのどこからも更新されず（アプリの「却下」操作はchat_rooms.statusを
--    'rejected'に更新するだけ）、一度申請されたトレードはtrade_requests行が残り続け、
--    以後誰も申請できなくなっていた。実際の状態源であるchat_rooms.statusを見て、
--    'rejected'でないアクティブな申請がある場合のみブロックするよう変更する。
--    （trades.statusはこのアプリでは作成時から常に1固定で、開閉状態を表す値として
--    運用されていないため、statusによるtrades側のゲートは追加しない）
--
-- 2. security definer関数へのPUBLIC実行権限
--    Postgresは新規関数作成時、デフォルトでPUBLIC（anonロールを含む）にEXECUTE権限を
--    自動付与する。authenticatedへの付与だけではこれを取り消せていなかったため、
--    明示的にrevokeする。関数内でauth.uid() is nullを弾いているため実害はないが、
--    意図した権限境界を明示するための修正。

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

  -- 却下(rejected)された過去のやり取りは無視し、pending/approvedの
  -- アクティブなchat_roomが存在する場合のみ重複申請として弾く
  if exists (
    select 1 from public.chat_rooms
    where trade_id = p_trade_id and status <> 'rejected'
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
