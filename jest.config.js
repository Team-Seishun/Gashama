/** @type {import('jest').Config} */
// このスコープについて:
// 現状はsrc/features/points/pointsLogic.tsのような純粋なTSロジックのみを対象にしている。
// jest-expo(Expoの公式presetで、React Nativeのモジュール変換・モックを提供する)を
// 導入していないため、React Nativeコンポーネント(.tsx)のレンダリングを伴うテストは
// このままでは動かない(JSX変換やRNモジュールのモックが無く失敗する)。
// 画面コンポーネントの統合テストを追加したくなったら、jest-expo + React Native
// Testing Libraryの導入を別途検討すること。
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  // ios/androidはネイティブビルド用ディレクトリでテストファイルは存在しないため、
  // ファイルクロール対象から除外して起動を高速化する。
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/ios/', '<rootDir>/android/'],
  // tsconfig.jsonのエイリアスをJestにも認識させる。ts-jest/Jestはtsconfig.jsonの
  // pathsを自動では読まないため、明示的に対応付けが必要。
  // "@/assets/*"は"@/*"より先に評価させる必要がある(先にマッチした方が使われるため)。
  // 先に"@/*"だけを定義すると、"@/assets/foo.png"のようなimportが本来の
  // "./assets/foo.png"ではなく"./src/assets/foo.png"(存在しない)に解決されてしまう。
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
