-- anon/authenticatedロールの列権限(profiles.points/trades.points_used等)・
-- RPCのEXECUTE権限(apply_trade_request等)が意図通りかを検証する。
--
-- 背景: PR #35で「列レベルでREVOKEしたつもりが、テーブルレベルの権限が
-- 優先されて実は無効だった」という不備が見つかった。has_column_privilege
-- だけでは「その列に権限があるか」しか分からず、テーブルレベル権限による
-- 上書きを見逃した経緯がある。そのため、pgTAPのcolumn_privs_areで
-- 対象ロールがその列に持つ権限の完全な集合(多すぎても少なすぎても失敗する)
-- を検証する方式にしている。
--
-- 禁止側(points/points_used)だけでなく、許可側の代表列(nickname/user_name)も
-- 確認する。禁止側だけを見ていると、将来誰かが誤ってテーブルレベルのINSERT/
-- UPDATEを丸ごとREVOKEしてしまい、正規の列編集機能まで壊してしまう
-- regressionを検知できないため。
--
-- あわせて、apply_trade_request/award_report_points/create_trade_with_points
-- の3 RPCのEXECUTE権限も検証する(#63のスコープ拡張の決定による)。authenticated
-- のみEXECUTEでき、anonはEXECUTEできないことを確認する。
begin;
select plan(14);

-- profiles.points: SELECTのみ(テーブルレベルのデフォルト)、INSERT/UPDATEは不可
select column_privs_are(
  'public', 'profiles', 'points', 'authenticated', ARRAY['SELECT'],
  'authenticatedはprofiles.pointsをSELECTのみでき、INSERT/UPDATEはできない'
);
select column_privs_are(
  'public', 'profiles', 'points', 'anon', ARRAY['SELECT'],
  'anonはprofiles.pointsをSELECTのみでき、INSERT/UPDATEはできない'
);

-- profiles.nickname: 引き続きSELECT/INSERT/UPDATEできる(許可側の代表列)
select column_privs_are(
  'public', 'profiles', 'nickname', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'],
  'authenticatedはprofiles.nicknameをSELECT/INSERT/UPDATEできる'
);
select column_privs_are(
  'public', 'profiles', 'nickname', 'anon', ARRAY['SELECT', 'INSERT', 'UPDATE'],
  'anonはprofiles.nicknameをSELECT/INSERT/UPDATEできる'
);

-- trades.points_used: SELECTのみ、INSERT/UPDATEは不可
select column_privs_are(
  'public', 'trades', 'points_used', 'authenticated', ARRAY['SELECT'],
  'authenticatedはtrades.points_usedをSELECTのみでき、INSERT/UPDATEはできない'
);
select column_privs_are(
  'public', 'trades', 'points_used', 'anon', ARRAY['SELECT'],
  'anonはtrades.points_usedをSELECTのみでき、INSERT/UPDATEはできない'
);

-- trades.user_name: 引き続きSELECT/INSERT/UPDATEできる(許可側の代表列)
select column_privs_are(
  'public', 'trades', 'user_name', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'],
  'authenticatedはtrades.user_nameをSELECT/INSERT/UPDATEできる'
);
select column_privs_are(
  'public', 'trades', 'user_name', 'anon', ARRAY['SELECT', 'INSERT', 'UPDATE'],
  'anonはtrades.user_nameをSELECT/INSERT/UPDATEできる'
);

-- apply_trade_request(uuid, uuid): authenticatedのみEXECUTEできる
select function_privs_are(
  'public', 'apply_trade_request', ARRAY['uuid', 'uuid'], 'authenticated', ARRAY['EXECUTE'],
  'authenticatedはapply_trade_requestをEXECUTEできる'
);
select function_privs_are(
  'public', 'apply_trade_request', ARRAY['uuid', 'uuid'], 'anon', ARRAY[]::name[],
  'anonはapply_trade_requestをEXECUTEできない'
);

-- award_report_points(uuid): authenticatedのみEXECUTEできる
select function_privs_are(
  'public', 'award_report_points', ARRAY['uuid'], 'authenticated', ARRAY['EXECUTE'],
  'authenticatedはaward_report_pointsをEXECUTEできる'
);
select function_privs_are(
  'public', 'award_report_points', ARRAY['uuid'], 'anon', ARRAY[]::name[],
  'anonはaward_report_pointsをEXECUTEできない'
);

-- create_trade_with_points(int, uuid, uuid, text, text, text, uuid, uuid, uuid, text):
-- authenticatedのみEXECUTEできる
select function_privs_are(
  'public', 'create_trade_with_points',
  ARRAY['integer', 'uuid', 'uuid', 'text', 'text', 'text', 'uuid', 'uuid', 'uuid', 'text'],
  'authenticated', ARRAY['EXECUTE'],
  'authenticatedはcreate_trade_with_pointsをEXECUTEできる'
);
select function_privs_are(
  'public', 'create_trade_with_points',
  ARRAY['integer', 'uuid', 'uuid', 'text', 'text', 'text', 'uuid', 'uuid', 'uuid', 'text'],
  'anon', ARRAY[]::name[],
  'anonはcreate_trade_with_pointsをEXECUTEできない'
);

select * from finish();
rollback;
