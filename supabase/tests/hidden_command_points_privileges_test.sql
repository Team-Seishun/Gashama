-- 技育博デモ用隠しコマンドのRPC award_hidden_command_points(text) について、
-- anon/authenticatedロールのEXECUTE権限を検証する。
--
-- award_report_points等の既存RPCと同じ理由（Supabaseはanon/authenticatedへの
-- EXECUTE権限を個別付与しているため、revoke ... from publicだけでは
-- anonのEXECUTE権限を取り消せない）で、authenticatedのみEXECUTEでき、
-- anonはEXECUTEできないことを確認する。
begin;
select plan(2);

select function_privs_are(
  'public', 'award_hidden_command_points', ARRAY['text'], 'authenticated', ARRAY['EXECUTE'],
  'authenticatedはaward_hidden_command_pointsをEXECUTEできる'
);
select function_privs_are(
  'public', 'award_hidden_command_points', ARRAY['text'], 'anon', ARRAY[]::name[],
  'anonはaward_hidden_command_pointsをEXECUTEできない'
);

select * from finish();
rollback;
