-- 在庫レポート投稿1件につき10ポイントを付与するRPC。
-- 「同一ユーザー×同一店舗×同一ガチャポン×同一JST暦日」につき1回だけ付与できる
-- （#26で作った points_ledger のユニークインデックスで担保する）。
--
-- 重複時に例外を投げてレポート投稿自体を失敗扱いにしたくないため、
-- insert ... on conflict do nothing で「重複していたら何もしない」を1文で表現し、
-- 実際に1行挿入できたかどうかをget diagnosticsで判定する。同時多発呼び出し
-- （連打・ネットワーク再送）に対してもon conflictがDB内部でアトミックに
-- 処理するため、別途例外ハンドラを用意する必要はない。

create or replace function public.award_report_points(
  p_report_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_report record;
  v_awarded_date date;
  v_inserted_count integer;
  v_updated_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select user_id, store_id, gachapon_id, created_at
    into v_report
    from public.reports
    where id = p_report_id;

  if not found then
    raise exception 'report not found';
  end if;

  if v_report.user_id <> v_user_id then
    raise exception 'report does not belong to the caller';
  end if;

  -- UTCのままだと日本時間の深夜0時〜9時台に「暦日」がズレるため、JSTに変換してから算出する
  v_awarded_date := (now() at time zone 'Asia/Tokyo')::date;

  -- 過去に投稿した別のreport_idを毎日使い回して呼び出すと、report_id自体は
  -- points_ledgerの重複判定キーに含まれないため、日付が変わるたびに何度でも
  -- 付与されてしまう（新しいレポートを投稿しなくても稼げてしまう）。
  -- レポートが「今日」（JST）作られたものでなければ、既に獲得済みの場合と同様に
  -- 0を返す（正規のフローではレポート投稿直後にしか呼ばれないため、ここに
  -- 到達すること自体が想定外の呼び出し）。
  if (v_report.created_at at time zone 'Asia/Tokyo')::date <> v_awarded_date then
    return 0;
  end if;

  insert into public.points_ledger (user_id, report_id, store_id, gachapon_id, points_awarded, awarded_date)
  values (v_user_id, p_report_id, v_report.store_id, v_report.gachapon_id, 10, v_awarded_date)
  on conflict (user_id, store_id, gachapon_id, awarded_date) do nothing;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 0 then
    return 0;
  end if;

  update public.profiles
    set points = points + 10
    where id = v_user_id;

  -- profiles行が存在しない場合(通常はauth.usersへのINSERTトリガーで必ず作られるが、
  -- 将来そのトリガーが壊れる/無効化される可能性に備えた防御的チェック)、台帳だけ
  -- 記録されて残高が増えない不整合を防ぐ。ここで例外を投げると、直前の
  -- points_ledger insertを含むこの関数呼び出し全体が自動的にロールバックされる。
  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'profile not found for user';
  end if;

  return 10;
end;
$$;

-- Supabaseはデフォルトでanon/authenticatedロールに対して、schema public内の関数への
-- EXECUTE権限をPUBLIC経由ではなく個別に付与している。そのため revoke ... from public
-- だけではanonのEXECUTE権限は取り消せない（実際にhas_function_privilegeで確認済み。
-- 既存のapply_trade_request RPCも同じ理由でanonが実行可能な状態になっている）。
-- anonからも明示的にrevokeする。
revoke execute on function public.award_report_points(uuid) from public, anon;
grant execute on function public.award_report_points(uuid) to authenticated;
