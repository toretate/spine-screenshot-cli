# Spine Extractor

Spine 2Dのatlasファイルとskelファイル、画像ファイルを指定して、描画結果のスクリーンショットを保存するCLIツールです。

## インストール

```bash
npm install
npm run build
```

## 使用方法

```bash
node dist/index.js --atlas <atlasファイルのパス> [オプション]
```

### オプション

- `--atlas <path>`: atlasファイルへのファイルパス（必須）
- `--skin <name>`: スキン名
- `--anime <name>`: アニメーション名
- `--x <number>`: 画像表示位置(x)。デフォルト: 0
- `--y <number>`: 画像表示位置(y)。デフォルト: 0
- `--w <number>`: 画像サイズ(横)。デフォルト: 1000
- `--h <number>`: 画像サイズ(縦)。デフォルト: 1000
- `--scale <number>`: 拡大率。デフォルト: 1.0
- `--frame <number>`: 指定フレームの画像を保存する。デフォルト: 1
- `-o, --output <path>`: 出力ファイルパス。デフォルト: output.png

### 使用例

```bash
# 基本的な使用方法
node dist/index.js --atlas character.atlas

# 詳細設定
node dist/index.js --atlas character.atlas --skin default --anime walk --frame 5 --scale 2.0 -o screenshot.png
```

## 仕様

- Spine Version: 3.6.53 固定
- SpineUseAlpha: ON
- TypeScript + Node.js で実装
- ts-spine 3.6ブランチを使用

## 開発

### ビルド
```bash
npm run build
```

### 開発モード（ウォッチ）
```bash
npm run dev
```

### クリーン
```bash
npm run clean
```

## 注意事項

- atlasファイルと同じディレクトリに同名の.skelファイルが必要です
- 現在の実装はプレースホルダーで、実際のSpine描画機能は今後実装予定です