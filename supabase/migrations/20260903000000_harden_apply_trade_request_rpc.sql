-- apply_trade_request RPCはsecurity definerで実行される（RLSをバイパスする）ため、
-- 呼び出し元がDB側で検証されていない値を渡すと、他人のデータを不正に紐付けられて
-- しまう。以下2点のセキュリティ・整合性チェックを追加する。
--
-- 1. p_offered_report_idが申請者本人（auth.uid()）が所有するreports行のIDであることを
--    検証していなかったため、他人のreports.idを渡すと他人の在庫が自分の申請の
--    提供アイテムとして紐付けられてしまっていた。
-- 2. 同一trade_idに対する重複申請（trade_requests/chat_roomsの二重作成）を防ぐ
--    DB側のチェックがなかった。selectにfor updateを使いtradesの行ロックを取っている
--    ため、この存在チェックと組み合わせることで同時リクエストのレースも防げる。

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

  -- tradesの行ロックを取った後に判定するため、同一trade_idへの同時申請は
  -- 先着1件だけが成立し、後続は必ずこのチェックで弾かれる
  if exists (
    select 1 from public.trade_requests where trade_id = p_trade_id
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

grant execute on function public.apply_trade_request(uuid, uuid) to authenticated;

-- offered_report_idの実際の設定元がapply_trade_request RPCに変わったため、
-- 古いコメント（TradeList.tsx側で設定と記載）を修正する
comment on column public.trade_requests.offered_report_id is
  '申請者本人が提供したアイテムのreports.id。apply_trade_request RPC内で所有者検証のうえ設定される。';
