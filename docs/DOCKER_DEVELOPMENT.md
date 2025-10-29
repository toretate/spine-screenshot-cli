# Docker開発環境とGitHub Actions ローカル実行

## 🐳 Docker開発環境

このプロジェクトでは、一貫した開発環境を提供するためにDockerを使用できます。

### 前提条件

- Docker Desktop (Mac/Windows) または Docker Engine (Linux)
- Docker Compose

### 基本的な使用方法

```bash
# Makefileを使用する場合（推奨）
make help          # 利用可能なコマンドを表示
make setup         # 初回セットアップ
make up            # Docker環境を起動
make dev           # 開発環境にアクセス
make test          # ビルドテスト実行
make down          # 環境を停止
make clean         # 完全クリーンアップ

# docker-composeを直接使用する場合
docker-compose up -d dotnet-dev
docker-compose exec dotnet-dev bash
docker-compose down
```

### 開発環境での作業

```bash
# 開発コンテナに入る
make dev

# コンテナ内でのビルドテスト
cd SpineScreenshotCli
./publish.sh --version v0.0.0-test

# 作成されたアーティファクトを確認
ls -la artifacts/

# 個別プラットフォームのテスト
dotnet build -c Release /p:SpineVersion=3.8
dotnet build -c Release /p:SpineVersion=3.6
```

## 🎬 GitHub Actions ローカル実行

[act](https://github.com/nektos/act)を使用してGitHub Actionsをローカルでテストできます。

### セットアップ

```bash
# 自動インストールスクリプトを実行
./run-actions-locally.sh

# または手動でactをインストール (macOS)
brew install act

# または手動でactをインストール (Linux)
curl -sSfL https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo sh
```

### 使用方法

```bash
# Makefileを使用する場合（推奨）
make act-test      # リリースワークフローをテスト実行
make act-dry-run   # ドライラン（実際には実行しない）

# actを直接使用する場合
act -W .github/workflows/release.yml --eventpath .github/workflows/test-event.json
act -W .github/workflows/release.yml --dry-run
act -j build-and-release  # 特定のジョブのみ実行
```

### トラブルシューティング

#### Docker権限エラー
```bash
# Linux の場合、ユーザーをdockerグループに追加
sudo usermod -aG docker $USER
# ログアウト・ログインが必要
```

#### act実行時のメモリ不足
```bash
# Docker Desktop の場合、設定でメモリを8GB以上に増やす
# Linux の場合、スワップファイルを作成
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### GitHub Token が必要な場合
```bash
# .actrc ファイルに以下を追加
echo "-s GITHUB_TOKEN=your_token_here" >> .actrc
```

## 📁 ファイル構成

```
├── docker-compose.yml           # Docker Compose設定
├── Makefile                     # 開発用コマンド集
├── .actrc                      # act設定ファイル
├── run-actions-locally.sh      # actセットアップスクリプト
├── SpineScreenshotCli/
│   ├── artifacts/              # ビルド成果物（ZIPファイル）
│   └── publish.sh              # ビルド・パッケージスクリプト
└── .github/
    └── workflows/
        ├── release.yml         # リリースワークフロー
        └── test-event.json     # テスト用イベントデータ
```

## ⚡ クイックスタート

```bash
# 1. 初回セットアップ
make setup

# 2. Docker開発環境でテスト
make test

# 3. GitHub Actionsをローカルテスト
make act-test

# 4. 本格的な開発作業
make dev
```