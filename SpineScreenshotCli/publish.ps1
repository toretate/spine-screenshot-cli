# プロジェクトファイルのパス（このスクリプトと同じディレクトリにある前提）
$PROJECT_PATH = "./SpineScreenshotCli.csproj"

# バージョンタグ
$VERSION_TAG = ""

# 引数の解析
param(
    [string]$Version,
    [Alias("v")]
    [string]$VersionShort,
    [switch]$Help,
    [Alias("h")]
    [switch]$HelpShort
)

# ヘルプ表示
if ($Help -or $HelpShort) {
    Write-Host "Usage: .\publish.ps1 [-Version VERSION_TAG] [-v VERSION_TAG]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Version, -v   Specify version tag (e.g., v1.2.3)"
    Write-Host "                 If not specified, will read from .csproj and prompt for confirmation"
    Write-Host "  -Help, -h      Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\publish.ps1                    # Interactive mode (reads from .csproj)"
    Write-Host "  .\publish.ps1 -Version v1.2.3    # Direct version specification"
    Write-Host "  .\publish.ps1 -v v1.2.3          # Short form"
    exit 0
}

# バージョン引数の処理
if ($Version) {
    $VERSION_TAG = $Version
} elseif ($VersionShort) {
    $VERSION_TAG = $VersionShort
}

# バージョンタグが指定されていない場合、csprojから取得してユーザーに確認
if (-not $VERSION_TAG) {
    Write-Host "Version not specified. Reading from project file..."
    
    # csprojファイルからVersionを取得
    $CSPROJ_VERSION = ""
    if (Test-Path $PROJECT_PATH) {
        $content = Get-Content $PROJECT_PATH -Raw
        
        # Versionタグを検索
        if ($content -match '<Version>([^<]*)</Version>') {
            $CSPROJ_VERSION = $matches[1]
        }
        # Versionタグが見つからない場合、AssemblyVersionを試す
        elseif ($content -match '<AssemblyVersion>([^<]*)</AssemblyVersion>') {
            $CSPROJ_VERSION = $matches[1]
        }
        # それでも見つからない場合、FileVersionを試す
        elseif ($content -match '<FileVersion>([^<]*)</FileVersion>') {
            $CSPROJ_VERSION = $matches[1]
        }
    }
    
    # デフォルトバージョンの設定
    if (-not $CSPROJ_VERSION) {
        $CSPROJ_VERSION = "1.0.0"
        Write-Host "WARNING: No version found in project file. Using default: $CSPROJ_VERSION"
    } else {
        Write-Host "Found version in project file: $CSPROJ_VERSION"
    }
    
    # vプレフィックスを追加（まだ付いていない場合）
    $DEFAULT_VERSION = $CSPROJ_VERSION
    if (-not $DEFAULT_VERSION.StartsWith("v")) {
        $DEFAULT_VERSION = "v$DEFAULT_VERSION"
    }
    
    Write-Host ""
    Write-Host "Please specify the version to use for publishing:"
    $USER_INPUT = Read-Host "Version [$DEFAULT_VERSION]"
    
    # ユーザー入力がある場合はそれを使用、なければデフォルト
    if ($USER_INPUT) {
        $VERSION_TAG = $USER_INPUT
    } else {
        $VERSION_TAG = $DEFAULT_VERSION
    }
    
    # vプレフィックスを追加（まだ付いていない場合）
    if (-not $VERSION_TAG.StartsWith("v")) {
        $VERSION_TAG = "v$VERSION_TAG"
    }
    
    Write-Host "Using version: $VERSION_TAG"
    Write-Host ""
}

# "v" を除去して .NET に渡すバージョン形式に変換
$VERSION = $VERSION_TAG.TrimStart('v')

# 出力ルート（このスクリプトからの相対パス）
$OUTPUT_ROOT = "./bin/Release/net9.0"
$ARTIFACTS_DIR = "./artifacts"
$RIDS = @("win-x64", "win-arm64", "linux-x64", "osx-x64", "osx-arm64")
$SPINE_VERSIONS = @("3.6", "3.8")

# アーティファクトディレクトリを作成
if (-not (Test-Path $ARTIFACTS_DIR)) {
    New-Item -ItemType Directory -Path $ARTIFACTS_DIR -Force | Out-Null
}

foreach ($SPINE_VERSION in $SPINE_VERSIONS) {
    Write-Host ""
    Write-Host "Building Spine $SPINE_VERSION version..."
    Write-Host "========================================"
    
    # DefineConstantsをSpineバージョンから自動生成
    $DEFINE_CONSTANTS = "SPINE_$($SPINE_VERSION -replace '\.', '_')"

    foreach ($RID in $RIDS) {
        Write-Host "Publishing Spine $SPINE_VERSION for $RID..."

        # Spineバージョンごとに出力ディレクトリを分ける
        $PUBLISH_DIR = "$OUTPUT_ROOT/$SPINE_VERSION/$RID/publish"

        & dotnet publish $PROJECT_PATH `
            -c Release `
            -r $RID `
            --self-contained false `
            /p:PublishSingleFile=true `
            /p:PublishTrimmed=false `
            /p:IncludeNativeLibrariesForSelfExtract=true `
            /p:Version="$VERSION" `
            /p:InformationalVersion="$VERSION_TAG" `
            /p:SpineVersion="$SPINE_VERSION" `
            /p:DefineConstants="$DEFINE_CONSTANTS" `
            -o $PUBLISH_DIR

        $ZIP_NAME = "SpineScreenshotCli-$SPINE_VERSION-$RID.zip"
        $ZIP_PATH = Join-Path (Get-Location) "$ARTIFACTS_DIR/$ZIP_NAME"

        Write-Host "Compressing $ZIP_NAME (excluding debug/config files)..."

        # 除外対象の拡張子
        $EXCLUDED_EXTENSIONS = @(".pdb", ".xml", ".json", ".dll", ".deps.json", ".runtimeconfig.json")

        # 一時ディレクトリを作成
        $TEMP_DIR = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), [System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null
        
        try {
            # 対象ファイルをフィルタリングしてコピー
            $FILES = Get-ChildItem -Path $PUBLISH_DIR -File
            foreach ($FILE in $FILES) {
                $FILENAME = $FILE.Name
                $EXTENSION = $FILE.Extension
                
                # 拡張子をチェック
                $SHOULD_EXCLUDE = $false
                foreach ($EXT in $EXCLUDED_EXTENSIONS) {
                    if ($EXTENSION -eq $EXT) {
                        $SHOULD_EXCLUDE = $true
                        break
                    }
                }
                
                # 除外対象でない場合はコピー
                if (-not $SHOULD_EXCLUDE) {
                    Copy-Item -Path $FILE.FullName -Destination $TEMP_DIR -Force
                }
            }

            # メイン実行ファイルをリネーム
            if ($RID -like "win-*") {
                $EXECUTABLE_NAME = "SpineScreenshotCli.exe"
                $RENAMED_EXECUTABLE = "SpineScreenshotCli-$SPINE_VERSION-$($VERSION_TAG -replace '\.', '_').exe"
            } else {
                $EXECUTABLE_NAME = "SpineScreenshotCli"
                $RENAMED_EXECUTABLE = "SpineScreenshotCli-$SPINE_VERSION-$($VERSION_TAG -replace '\.', '_')"
            }
            $EXEC_PATH = Join-Path $TEMP_DIR $EXECUTABLE_NAME
            if (Test-Path $EXEC_PATH) {
                Rename-Item -Path $EXEC_PATH -NewName $RENAMED_EXECUTABLE
            }

            # zipファイルを作成
            if (Test-Path $ZIP_PATH) {
                Remove-Item $ZIP_PATH -Force
            }
            Compress-Archive -Path "$TEMP_DIR\*" -DestinationPath $ZIP_PATH -Force
        }
        finally {
            # 一時ディレクトリを削除
            if (Test-Path $TEMP_DIR) {
                Remove-Item $TEMP_DIR -Recurse -Force
            }
        }
    }
    
    Write-Host "Spine $SPINE_VERSION builds completed."
}

Write-Host ""
Write-Host "All Spine versions and targets published and zipped successfully."
Write-Host ""
Write-Host "📦 Artifacts location: $ARTIFACTS_DIR/"
Write-Host ""
Write-Host "Published versions:"
Write-Host "   - Spine 3.6: SpineScreenshotCli-3.6-[platform].zip"
Write-Host "   - Spine 3.8: SpineScreenshotCli-3.8-[platform].zip"
Write-Host ""
Write-Host "Platforms: win-x64, win-arm64, linux-x64, osx-x64, osx-arm64"
Write-Host ""
Write-Host "📁 Available artifacts:"
$zipFiles = Get-ChildItem -Path $ARTIFACTS_DIR -Filter "*.zip" -ErrorAction SilentlyContinue
if ($zipFiles) {  
    $zipFiles | ForEach-Object { Write-Host "   $($_.Name)" }
} else {
    Write-Host "   (No zip files found)"
}