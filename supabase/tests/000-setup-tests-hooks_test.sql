-- pgTAPのセットアップ専用ファイル。
-- ファイル名が"000-"で始まるのは、supabase test dbがテストファイルをアルファベット順に
-- 実行するため、他のテストより必ず先に拡張機能を有効化させるための命名規則。
-- (#62〜#64の各テストはこのファイルの後に実行される前提で書く)
create extension if not exists pgtap with schema extensions;

-- セットアップ自体が壊れていないことを確認する簡易テスト
begin;
select plan(1);
select ok(true, 'pgTAP setup completed successfully');
select * from finish();
rollback;
