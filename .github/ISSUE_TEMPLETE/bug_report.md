name: "⚠️ 不具合・バグ報告"
description: "アプリの動作が期待通りでない場合はこちらから報告してください"
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        バグ報告。できるだけ詳しく記入してください。

  - type: textarea
    id: description
    attributes:
      label: 不具合の内容
      description: どのような問題が起きていますか？
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: 📋 再現手順
      description: バグを再現するための手順を書いてください
      placeholder: |
        1. 〇〇画面を開く
        2. △△ボタンを押す
        3. エラーが表示される
    validations:
      required: true

  - type: dropdown
    id: platform
    attributes:
      label: 📱 発生環境
      options:
        - iOS
        - Android
        - Web
        - その他
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: ✅ 期待される動作
      description: 本来はどう動くべきでしたか？
      placeholder: 例：ボタンを押した後にトップ画面に遷移する

  - type: textarea
    id: screenshots
    attributes:
      label: 📸 スクリーンショット
      description: エラー画面や動画があればここにドラッグ＆ドロップしてください

  - type: checkboxes
    id: checks
    attributes:
      label: 最終確認
      options:
        - label: 最新のコードで再現することを確認した