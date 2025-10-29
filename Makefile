# SpineScreenshotCli Docker開発環境

.PHONY: help setup up down dev test clean act-install act-test act-dry-run

help: ## ヘルプを表示
	@echo "SpineScreenshotCli Docker開発環境"
	@echo ""
	@echo "利用可能なコマンド:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## 初期セットアップ
	@echo "🔧 初期セットアップを実行中..."
	./setup.sh
	@echo "✅ セットアップ完了"

up: ## Docker環境を起動
	@echo "🚀 Docker環境を起動中..."
	docker-compose up -d dotnet-dev
	@echo "✅ 環境が起動しました"

down: ## Docker環境を停止
	@echo "🛑 Docker環境を停止中..."
	docker-compose down
	@echo "✅ 環境を停止しました"

dev: up ## 開発環境にアクセス
	@echo "🔧 開発環境にアクセス中..."
	docker-compose exec dotnet-dev bash

test: ## ローカルでビルドテスト
	@echo "🧪 ローカルビルドテスト実行中..."
	docker-compose exec dotnet-dev bash -c "cd SpineScreenshotCli && ./publish.sh --version v0.0.0-test"

clean: down ## 環境をクリーンアップ
	@echo "🧹 クリーンアップ中..."
	docker-compose down -v --remove-orphans
	docker system prune -f
	rm -rf SpineScreenshotCli/artifacts/
	rm -rf SpineScreenshotCli/bin/
	rm -rf SpineScreenshotCli/obj/
	@echo "✅ クリーンアップ完了"

act-install: ## GitHub Actions ローカル実行ツール (act) をインストール
	@echo "📦 act をインストール中..."
	@./run-actions-locally.sh

act-test: ## GitHub Actions ワークフローをローカルテスト
	@echo "🧪 GitHub Actions ワークフローをテスト実行中..."
	act -W .github/workflows/release.yml --eventpath .github/workflows/test-event.json

act-dry-run: ## GitHub Actions ワークフローのドライラン
	@echo "🔍 GitHub Actions ワークフローのドライラン実行中..."
	act -W .github/workflows/release.yml --eventpath .github/workflows/test-event.json --dry-run

# デフォルトターゲット
all: help