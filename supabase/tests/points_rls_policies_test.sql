-- RLS(行単位セキュリティ)ポリシーが、想定外のロールに権限を許していないかを
-- 検証する。
--
-- 方針(#64のgrillingで確定):
-- ・「本人限定」「グループ限定」のような間違えやすい複雑な条件を持つポリシー
--   (profiles更新、chat_rooms/chat_messagesの閲覧、points_ledgerの閲覧)は、
--   実際にauth.uid()を偽装して他人のデータが見えない/書き換えられないことを
--   振る舞いベースで検証する。
-- ・「誰でも閲覧できるだけ」のような単純なポリシー、および今回フィクスチャの
--   新規作成コストが高いと判断したポリシー(chat_rooms/chat_messagesのINSERT等)
--   は、ポリシーの存在・対象ロール・コマンド種別のみを確認する軽いチェックに
--   留める。
--
-- 振る舞いベースの検証は、新しくテスト用の行をINSERTするのではなく、
-- 既存の実データ(本番相当のリンク済みプロジェクト上に既に存在する行)を使う。
-- 理由: chat_rooms.trade_id等、マイグレーションに現れない土台テーブルの
-- 正確なNOT NULL/外部キー制約が不明なため、新規INSERTでフィクスチャを
-- 組み立てようとすると失敗するリスクがある。既存行を読むだけ、または
-- 既存行に対してUPDATEを試みてROLLBACKする分には、この不確実性の影響を
-- 受けない。
--
-- なりすまし方法(#61で専用ツール(basejump等)を導入しない方針としたため自前実装):
-- set local role authenticated;
-- set local request.jwt.claims to '{"sub":"<uuid>","role":"authenticated"}';
-- で対象ユーザーとしてログインした状態を再現し、reset role; で元(postgres/
-- superuser)に戻す。
begin;
select plan(35);

-- 検証に使う実データをあらかじめ拾っておく(まだロール変更前=superuserなので
-- RLSの影響を受けずに全行を見られる)。
create temporary table pgtap_rls_fixture as
with room as (
  select id as room_id, user_1_id, user_2_id
  from public.chat_rooms
  limit 1
),
msg as (
  select room_id as message_room_id
  from public.chat_messages
  limit 1
),
ledger as (
  select user_id as ledger_user
  from public.points_ledger
  limit 1
),
profile_pair as (
  select id as profile_a
  from public.profiles
  order by id
  limit 1
)
select
  room.room_id,
  room.user_1_id,
  room.user_2_id,
  msg.message_room_id,
  ledger.ledger_user,
  profile_pair.profile_a,
  (
    select id from public.profiles
    where id not in (room.user_1_id, room.user_2_id)
    limit 1
  ) as room_stranger,
  (
    select id from public.profiles
    where id <> ledger.ledger_user
    limit 1
  ) as ledger_stranger,
  (
    select id from public.profiles
    where id <> profile_pair.profile_a
    limit 1
  ) as profile_b
from room, msg, ledger, profile_pair;

-- フィクスチャが取得できなかった場合(本番データが空等)は、原因が分かるよう
-- 明示的に失敗させる(振る舞いベースのテストが無意味にスキップされて
-- 見かけ上パスするのを防ぐ)。
select ok(
  (select room_id is not null and message_room_id is not null and ledger_user is not null
     and profile_a is not null and room_stranger is not null and ledger_stranger is not null
     and profile_b is not null
   from pgtap_rls_fixture),
  'RLS検証に使う実データ(chat_rooms/chat_messages/points_ledger/profilesの既存行)が揃っている'
);

-- =====================================================================
-- 深く検証: profiles (本人だけ更新できる)
-- =====================================================================
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', profile_a, 'role', 'authenticated')::text,
  true
) from pgtap_rls_fixture;

update public.profiles
set nickname = 'pgtap-rls-self-update'
where id = (select profile_a from pgtap_rls_fixture);

select is(
  (select nickname from public.profiles where id = (select profile_a from pgtap_rls_fixture)),
  'pgtap-rls-self-update',
  '本人はprofiles.nicknameを自分の行に対して更新できる'
);

update public.profiles
set nickname = 'pgtap-rls-hacked'
where id = (select profile_b from pgtap_rls_fixture);

reset role;

select isnt(
  (select nickname from public.profiles where id = (select profile_b from pgtap_rls_fixture)),
  'pgtap-rls-hacked',
  '他人はprofiles.nicknameを更新できない(RLSでブロックされ、元の値のまま)'
);

-- =====================================================================
-- 深く検証: chat_rooms (当事者だけ閲覧できる)
-- =====================================================================
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', user_1_id, 'role', 'authenticated')::text,
  true
) from pgtap_rls_fixture;

select ok(
  exists(select 1 from public.chat_rooms where id = (select room_id from pgtap_rls_fixture)),
  '当事者(user_1_id)はchat_roomsの自分の部屋を閲覧できる'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', room_stranger, 'role', 'authenticated')::text,
  true
) from pgtap_rls_fixture;

select ok(
  not exists(select 1 from public.chat_rooms where id = (select room_id from pgtap_rls_fixture)),
  '無関係な第三者はchat_roomsの他人の部屋を閲覧できない'
);

reset role;

-- =====================================================================
-- 深く検証: chat_messages (ルーム参加者だけ閲覧できる)
-- =====================================================================
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', user_2_id, 'role', 'authenticated')::text,
  true
) from pgtap_rls_fixture;

select ok(
  exists(
    select 1 from public.chat_messages
    where room_id = (select message_room_id from pgtap_rls_fixture)
  ),
  'ルーム参加者(user_2_id、送信者でなくても)はchat_messagesを閲覧できる'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', room_stranger, 'role', 'authenticated')::text,
  true
) from pgtap_rls_fixture;

select ok(
  not exists(
    select 1 from public.chat_messages
    where room_id = (select message_room_id from pgtap_rls_fixture)
  ),
  'ルーム非参加者はchat_messagesを閲覧できない'
);

reset role;

-- =====================================================================
-- 深く検証: points_ledger (本人だけ閲覧できる)
-- =====================================================================
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', ledger_user, 'role', 'authenticated')::text,
  true
) from pgtap_rls_fixture;

select ok(
  exists(select 1 from public.points_ledger where user_id = (select ledger_user from pgtap_rls_fixture)),
  '本人はpoints_ledgerの自分の獲得履歴を閲覧できる'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', ledger_stranger, 'role', 'authenticated')::text,
  true
) from pgtap_rls_fixture;

select ok(
  not exists(select 1 from public.points_ledger where user_id = (select ledger_user from pgtap_rls_fixture)),
  '他人はpoints_ledgerの他人の獲得履歴を閲覧できない'
);

reset role;

-- =====================================================================
-- 軽くチェック: ポリシーの存在・対象ロール・コマンド種別のみ確認する。
-- (「誰でも閲覧できるだけ」の単純なポリシー、およびフィクスチャ新規作成の
-- コストが高いと判断したポリシー)
--
-- 対象ロールを明示していないポリシー(ダッシュボード上は"public"と表示される)は
-- pg_policy.polroles上は空集合({0}という特殊値になり、実在するロールとは
-- 一致しない)として記録されるため、期待値はARRAY[]::name[]にしている。
-- =====================================================================

-- profiles: SELECT(誰でも閲覧可)・INSERT(本人のみ、フィクスチャ新規作成は
-- 避けたため軽いチェックに留める)
select policies_are(
  'public', 'profiles',
  ARRAY['Profiles are viewable by everyone.', 'Users can insert their own profile.', 'Users can update own profile.'],
  'profilesのポリシーが3件(閲覧・追加・更新)から増減していない'
);
select policy_cmd_is('public', 'profiles', 'Profiles are viewable by everyone.', 'SELECT');
select policy_roles_are('public', 'profiles', 'Profiles are viewable by everyone.', ARRAY[]::name[]);
select policy_cmd_is('public', 'profiles', 'Users can insert their own profile.', 'INSERT');
select policy_roles_are('public', 'profiles', 'Users can insert their own profile.', ARRAY['authenticated']);

-- chat_rooms: INSERT/UPDATE(新規フィクスチャが必要なため軽いチェックに留める)
select policies_are(
  'public', 'chat_rooms',
  ARRAY['Users can view their own chat rooms', 'Users can insert their own chat rooms', 'Users can update their own chat rooms'],
  'chat_roomsのポリシーが3件(閲覧・追加・更新)から増減していない'
);
select policy_cmd_is('public', 'chat_rooms', 'Users can insert their own chat rooms', 'INSERT');
select policy_roles_are('public', 'chat_rooms', 'Users can insert their own chat rooms', ARRAY[]::name[]);
select policy_cmd_is('public', 'chat_rooms', 'Users can update their own chat rooms', 'UPDATE');
select policy_roles_are('public', 'chat_rooms', 'Users can update their own chat rooms', ARRAY[]::name[]);

-- chat_messages: INSERT(新規フィクスチャが必要)・UPDATE(条件式が未確認のため
-- ロール適用先のみ確認)
select policies_are(
  'public', 'chat_messages',
  ARRAY['Users can view messages in their rooms', 'Users can insert messages in their rooms', 'Allow users to update messages in their rooms)'],
  'chat_messagesのポリシーが3件(閲覧・追加・更新)から増減していない'
);
select policy_cmd_is('public', 'chat_messages', 'Users can insert messages in their rooms', 'INSERT');
select policy_roles_are('public', 'chat_messages', 'Users can insert messages in their rooms', ARRAY[]::name[]);
select policy_cmd_is('public', 'chat_messages', 'Allow users to update messages in their rooms)', 'UPDATE');
select policy_roles_are('public', 'chat_messages', 'Allow users to update messages in their rooms)', ARRAY['authenticated']);

-- reports: 誰でも閲覧・追加、本人のみ削除
select policies_are(
  'public', 'reports',
  ARRAY['Enable read access for all users', 'Enable insert for anon users', 'Enable insert for authenticated users', 'Enable delete for users based on user_id'],
  'reportsのポリシーが4件から増減していない'
);
select policy_roles_are('public', 'reports', 'Enable read access for all users', ARRAY['anon', 'authenticated']);
select policy_roles_are('public', 'reports', 'Enable delete for users based on user_id', ARRAY['anon', 'authenticated']);

-- stores: 誰でも閲覧のみ
select policies_are(
  'public', 'stores',
  ARRAY['Enable read access for all users'],
  'storesのポリシーが1件(閲覧のみ)から増減していない'
);
select policy_roles_are('public', 'stores', 'Enable read access for all users', ARRAY['anon', 'authenticated']);

-- gachapons: 誰でも閲覧のみ
select policies_are(
  'public', 'gachapons',
  ARRAY['Enable read access for all users'],
  'gachaponsのポリシーが1件(閲覧のみ)から増減していない'
);
select policy_roles_are('public', 'gachapons', 'Enable read access for all users', ARRAY[]::name[]);

-- gachapon_items: anon/authenticatedのみ閲覧
select policies_are(
  'public', 'gachapon_items',
  ARRAY['Enable read access for all users'],
  'gachapon_itemsのポリシーが1件(閲覧のみ)から増減していない'
);
select policy_roles_are('public', 'gachapon_items', 'Enable read access for all users', ARRAY['anon', 'authenticated']);

-- =====================================================================
-- trade_requests/tradesはRLSが無効な現状維持を確認する
-- (意図した状態かどうかは#64本体とは別issueで要相談、現状の"固定"のみ)
-- =====================================================================
select is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.trade_requests'::regclass),
  false,
  'trade_requestsは現状RLSが無効なままである'
);
select is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.trades'::regclass),
  false,
  'tradesは現状RLSが無効なままである'
);

select * from finish();
rollback;
