# =============================================================================
# Spine Runtimes Environment Setup Script (PowerShell Version)
# 
# 開発者向けセットアップ手順:
#   1. このリポジトリをクローン: git clone <repo-url>
#   2. このスクリプトを実行: .\setup.ps1
#
# 注意: サブモジュールの初期化も自動で行われます
# =============================================================================

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$EXTERNAL_DIR = Join-Path $SCRIPT_DIR "external"
$SPINE_RUNTIMES_DIR = Join-Path $EXTERNAL_DIR "spine-runtimes"
$SPINE_LIBRARIES_DIR = Join-Path $SCRIPT_DIR "SpineLibraries"
$SPINE_EXAMPLES_DIR = Join-Path $SCRIPT_DIR "SpineExamples"

# 対象バージョン
$VERSIONS = @("3.6.32", "3.6.39", "3.6.53")

Write-Host "=== Spine Runtimes Environment Setup ===" -ForegroundColor Green

# external ディレクトリ作成
if (-not (Test-Path $EXTERNAL_DIR)) {
    New-Item -ItemType Directory -Path $EXTERNAL_DIR -Force | Out-Null
}

# サブモジュールの初期化・更新
Write-Host "Updating spine-runtimes submodule..." -ForegroundColor Yellow
git submodule update --recursive

# 作業ディレクトリに移動
Push-Location $SPINE_RUNTIMES_DIR

try {
    # 各バージョンのセットアップ
    foreach ($version in $VERSIONS) {
        Write-Host "Setting up version $version..." -ForegroundColor Cyan
        
        # バージョンをチェックアウト
        git checkout $version | Out-Null
        
        # ライブラリディレクトリの作成とコピー
        $version_lib_dir = Join-Path $SPINE_LIBRARIES_DIR $version
        if (-not (Test-Path $version_lib_dir)) {
            New-Item -ItemType Directory -Path $version_lib_dir -Force | Out-Null
        }
        
        # C# ライブラリのコピー
        $csharp_src = "spine-csharp\src"
        if (Test-Path $csharp_src) {
            $dest = Join-Path $version_lib_dir "spine-csharp"
            if (Test-Path $dest) {
                Remove-Item -Recurse -Force $dest
            }
            Copy-Item -Recurse $csharp_src $dest
            Write-Host "  Copied spine-csharp for $version" -ForegroundColor Gray
        }
        
        # XNA ライブラリのコピー
        $xna_src = "spine-xna\src"
        if (Test-Path $xna_src) {
            $dest = Join-Path $version_lib_dir "spine-xna"
            if (Test-Path $dest) {
                Remove-Item -Recurse -Force $dest
            }
            Copy-Item -Recurse $xna_src $dest
            Write-Host "  Copied spine-xna for $version" -ForegroundColor Gray
        }
        
        # MonoGame ライブラリのコピー
        $monogame_src = "spine-monogame\src"
        if (Test-Path $monogame_src) {
            $dest = Join-Path $version_lib_dir "spine-monogame"
            if (Test-Path $dest) {
                Remove-Item -Recurse -Force $dest
            }
            Copy-Item -Recurse $monogame_src $dest
            Write-Host "  Copied spine-monogame for $version" -ForegroundColor Gray
        }
        
        # サンプルのコピー
        $version_examples_dir = Join-Path $SPINE_EXAMPLES_DIR $version
        if (-not (Test-Path $version_examples_dir)) {
            New-Item -ItemType Directory -Path $version_examples_dir -Force | Out-Null
        }
        
        if (Test-Path "examples") {
            $dest = Join-Path $version_examples_dir "examples"
            if (Test-Path $dest) {
                Remove-Item -Recurse -Force $dest
            }
            Copy-Item -Recurse "examples" $dest
            Write-Host "  Copied examples for $version" -ForegroundColor Gray
        }
    }
    
    # 元のブランチに戻る
    try {
        git checkout main 2>$null
    } catch {
        try {
            git checkout master 2>$null
        } catch {
            # ブランチ切り替えに失敗しても続行
        }
    }
} finally {
    Pop-Location
}

# SkeletonDebugRenderer.cs の削除
Write-Host "Removing SkeletonDebugRenderer.cs files..." -ForegroundColor Yellow
Get-ChildItem -Path $SPINE_LIBRARIES_DIR -Name "SkeletonDebugRenderer.cs" -Recurse | Remove-Item -Force
Write-Host "  Removed all SkeletonDebugRenderer.cs files" -ForegroundColor Gray

Write-Host "=== Setup completed ===" -ForegroundColor Green
Write-Host "Libraries: $SPINE_LIBRARIES_DIR" -ForegroundColor White
Write-Host "Examples: $SPINE_EXAMPLES_DIR" -ForegroundColor White
Write-Host "Versions: $($VERSIONS -join ', ')" -ForegroundColor White
