$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$EXTERNAL_DIR = Join-Path $SCRIPT_DIR "external"
$SPINE_RUNTIMES_DIR = Join-Path $EXTERNAL_DIR "spine-runtimes"
$SPINE_LIBRARIES_DIR = Join-Path $SCRIPT_DIR "SpineLibraries"
$SPINE_EXAMPLES_DIR = Join-Path $SCRIPT_DIR "SpineExamples"

# 対象バージョン
$VERSIONS = @("3.6", "3.8")

Write-Host "=== Spine Runtimes Environment Setup ===" -ForegroundColor Green

function Convert-ToChoiceDescriptions {
    param (
        [string[]]$labels
    )

    return $labels | ForEach-Object {
        New-Object System.Management.Automation.Host.ChoiceDescription -ArgumentList @($_, $_)
    }
}

# 文字列配列を ChoiceDescription[] に変換
$labels = @(
    @("(&0) update submodules","update submodules"),
    @("(&1) copy libraries and examples","copy libraries and examples"),
    @("(&2) remove unused files","remove unused files"),
    @("(&3) exit","exit")
)

$options = $labels | ForEach-Object {
    New-Object System.Management.Automation.Host.ChoiceDescription -ArgumentList $_[0], $_[1]
}

do {
    # メニュー表示
    $selectIndex = $host.ui.PromptForChoice("操作選択", "実行する操作を選んでください：", $options, 0)
    Write-Host "Select:" $selectIndex

    switch($selectIndex) {
        0 {
            # external ディレクトリ作成
            if (-not (Test-Path $EXTERNAL_DIR)) {
                New-Item -ItemType Directory -Path $EXTERNAL_DIR -Force | Out-Null
            }

            # サブモジュールの初期化・更新
            Write-Host "Updating spine-runtimes submodule..." -ForegroundColor Yellow
            git submodule update --recursive
        }
        1 {
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
            
            Write-Host "=== Setup completed ===" -ForegroundColor Green
            Write-Host "Libraries: $SPINE_LIBRARIES_DIR" -ForegroundColor White
            Write-Host "Examples: $SPINE_EXAMPLES_DIR" -ForegroundColor White
            Write-Host "Versions: $($VERSIONS -join ', ')" -ForegroundColor White

            Pop-Location # 元のディレクトリに戻る
        }
        2 {
            # 作業ディレクトリに移動
            Push-Location $SPINE_RUNTIMES_DIR

            # SkeletonDebugRenderer.cs の削除
            Write-Host "Removing SkeletonDebugRenderer.cs files..." -ForegroundColor Yellow
            Get-ChildItem -Path $SPINE_LIBRARIES_DIR -Filter "SkeletonDebugRenderer.cs" -Recurse | Remove-Item -Force
            Write-Host "  Removed all SkeletonDebugRenderer.cs files" -ForegroundColor Gray


            # Utils.cs の削除 → 独自の src/Xna/Util.cs を使用するため
            Write-Host "Removing $VERSIONS Utils.cs files..." -ForegroundColor Yellow
            Get-ChildItem -Path $SPINE_LIBRARIES_DIR -Filter "Util.cs" -Recurse | Remove-Item -Force
            Write-Host "  Removed all Utils.cs files" -ForegroundColor Gray

            Pop-Location # 元のディレクトリに戻る
        }
        3 {
            Write-Host "Exit."
        }
    }
} while ($selectIndex -ne 3) # exit 選択で終わる





