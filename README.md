# 🎰 Gashapon Tracker & Trade (ガシャポン トラッカー & トレード)

「欲しいガチャガチャがどこにあるか分からない」  
「店舗に行ってみたら売り切れていた」  
「目当てじゃない被りアイテムを誰かと交換したい」  

街中にあふれる魅力的なカプセルトイ（ガシャポン）には、宝探しのようなワクワク感と同時に「現地に行ってみないと状況が分からない」という課題が存在します。

そんなガチャファンの課題を**マップ上でのリアルタイム在庫共有**と**ユーザー同士のトレード機能**で解決するアプリです。

---

## 📱 アプリ概要

ユーザー投稿によるリアルタイムの店舗別ガシャポン在庫レポートと、被ったアイテム・欲しいアイテムをユーザー同士で交換できるトレードチャットプラットフォームです。

- **リアルタイムマップ検索**: 現在地周辺の店舗ピンと在庫ステータス（在庫あり・残りわずか・売り切れ）を一目で確認。
- **写真付き在庫投稿**: ガチャを回したその場で撮影し、店舗・商品の最新ステータスを報告。
- **トレードマッチング＆チャット**: 被りアイテムの「出」と「求」を提示し、マッチング後に専用チャットルームで直接トレードの約束が可能。

---

## ✨ 主な機能

- **🗺️ マップ＆在庫状態表示**: Google Maps プラットフォーム上に店舗ピンを配置し、在庫状況に応じて絞り込み表示。
- **📸 リアルタイム投稿**: カメラ撮影／アルバム選択から写真を取り込み、店舗・ガチャ・アイテムを指定して在庫報告。
- **🤝 トレード投稿＆チャット**: 交換リクエスト（出・求）のカード一覧表示、交換申請の送信・承認・リアルタイムチャット・評価システム。
- **👤 マイページ・履歴管理**: ユーザーアイコン・ニックネーム・自己紹介の編集、過去の「在庫投稿」「進行中トレード」「完了したトレード」の一覧表示。
- **🔒 認証＆設定**: Supabase Auth による安全なサインイン・サインアップ・ログアウト・パスワード変更機能。

---

## 🛠 技術スタック

- **フロントエンド**: React Native (Expo v57)
- **ルーティング**: Expo Router (ファイルベースルーティング)
- **言語**: TypeScript
- **バックエンド / DB**: Supabase (PostgreSQL, Realtime, Storage, Auth)
- **マップ機能**: Google Maps Platform / `react-native-maps`
- **コンポーネント・UI**: Custom Components (`TradeCard`, `InventoryCard` 等), `@gorhom/bottom-sheet`
- **画像・メディア**: `expo-image`, `expo-image-picker`
- **安全管理**: `react-native-safe-area-context`
- **リンター / 型チェック**: ESLint (`expo lint`), TypeScript (`tsc`)

---

## 🚀 セットアップ

このプロジェクトをローカルでビルド・起動するには、`Supabase` および `Google Maps API` の設定が必要です。

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の環境変数を設定してください：

```env
EXPO_PUBLIC_SUPABASE_URL=あなたのSupabaseプロジェクトURL
EXPO_PUBLIC_SUPABASE_ANON_KEY=あなたのSupabaseAnonKey
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID=あなたのAndroid用GoogleMapsAPIキー
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS=あなたのiOS用GoogleMapsAPIキー
```

### 3. アプリの起動

```bash
npx expo start
```

- 開発用エミュレータ（Android Studio / iOS Simulator）または [Expo Go](https://expo.dev/go) でアプリを起動してください。

---

## 📖 使用方法

1. **マップ画面 (`/`)**:
   - 地図上で周辺のガシャポン店舗と最新ステータスを確認。検索欄で特定のガシャポン名でピンを絞り込み。
2. **投稿画面 (`/report-create`)**:
   - カメラボタンまたは投稿タブから、写真・店舗・ガシャポン商品・在庫ステータスを選択して報告。
3. **トレード画面 (`/post`)**:
   - トレードタブで欲しいアイテム・譲れるアイテムの投稿をチェックし、「交換申請を送る」ボタンで申請。
4. **チャット画面 (`/chat`)**:
   - マッチングした相手とリアルタイムでメッセージ・画像を送受信し、受け渡し条件を調整。トレード完了後は相手を評価。
5. **マイページ画面 (`/profile`)**:
   - アイコン・自己紹介の編集、過去の投稿・トレード履歴の閲覧、パスワード変更・ログアウトを実行。

---

## 📂 ディレクトリ構造

```text
src/
├── app/                  # Expo Router 画面階層 (ファイルベースルーティング)
│   ├── (auth)/           # 認証関連画面 (login, signup)
│   ├── (tabs)/           # メインBottom Tabs (index, post, camera, chat, profile, search)
│   ├── chat-room.tsx     # 1対1チャットルーム画面
│   ├── privacy-policy.tsx# プライバシーポリシー表示画面
│   ├── profile-setup.tsx # プロフィール設定・編集画面
│   ├── report-create.tsx # 在庫投稿作成画面
│   └── trade.tsx        # トレード一覧・検索画面
├── components/           # 共通UIコンポーネント (TradeCard, InventoryCard, TabBar 等)
├── constants/            # アプリ共通定数 (タブ定義等)
├── features/             # ドメイン・機能別モジュール
│   ├── auth/             # 認証関連 (API, Hooks)
│   ├── chat/             # チャット・評価機能 (API, Components, Hooks)
│   └── profile/          # プロフィール管理 (API, Context, Icons)
├── hooks/                # カスタムフック (useMasterData 等)
└── utils/                # 共通ユーティリティ (Supabase クライアント等)
```

---

## 📄 ライセンス

[MIT License](LICENSE)
