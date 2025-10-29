#!/bin/bash

# GitHub Actions をローカルで実行するためのスクリプト

set -e

echo "🚀 GitHub Actions ローカル実行環境をセットアップ中..."

# Docker が実行中かチェック
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker が実行されていません。Dockerを起動してから再実行してください。"
    exit 1
fi

# act がインストールされているかチェック
if ! command -v act &> /dev/null; then
    echo "📦 act をインストール中..."
    
    # macOS の場合
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install act
        else
            echo "❌ Homebrew がインストールされていません。以下のコマンドでインストールしてください："
            echo "curl -sSfL https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo sh"
            exit 1
        fi
    # Linux の場合
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -sSfL https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo sh
    else
        echo "❌ サポートされていないOS: $OSTYPE"
        echo "手動で act をインストールしてください: https://github.com/nektos/act#installation"
        exit 1
    fi
fi

echo "✅ act のバージョン: $(act --version)"

# 使用方法を表示
echo ""
echo "🎯 使用方法:"
echo ""
echo "1. GitHub Actions の release ワークフローをテスト実行:"
echo "   act -W .github/workflows/release.yml --eventpath .github/workflows/test-event.json"
echo ""
echo "2. 特定のジョブのみを実行:"
echo "   act -W .github/workflows/release.yml -j build-and-release"
echo ""
echo "3. ドライラン (実際には実行せずにチェックのみ):"
echo "   act -W .github/workflows/release.yml --dry-run"
echo ""
echo "4. Docker Compose 環境で開発:"
echo "   docker-compose up -d dotnet-dev"
echo "   docker-compose exec dotnet-dev bash"
echo ""

# 実行確認
read -p "🤔 release ワークフローをテスト実行しますか? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🏃 release ワークフローを実行中..."
    act -W .github/workflows/release.yml --eventpath .github/workflows/test-event.json
else
    echo "📋 準備完了！上記のコマンドを使用してテストしてください。"
fi