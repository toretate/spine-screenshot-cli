#!/bin/bash

# プロジェクトファイルのパス（このスクリプトと同じディレクトリにある前提）
PROJECT_PATH="./SpineScreenshotCli.csproj"

# バージョンタグ
VERSION_TAG=""

# 引数の解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            VERSION_TAG="$2"
            shift # past argument
            shift # past value
            ;;
        -v)
            VERSION_TAG="$2"
            shift # past argument
            shift # past value
            ;;
        --help|-h)
            echo "Usage: $0 [--version|-v VERSION_TAG]"
            echo ""
            echo "Options:"
            echo "  --version, -v  Specify version tag (e.g., v1.2.3)"
            echo "                 If not specified, will read from .csproj and prompt for confirmation"
            echo "  --help, -h     Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Interactive mode (reads from .csproj)"
            echo "  $0 --version v1.2.3   # Direct version specification"
            echo "  $0 -v v1.2.3          # Short form"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# バージョンタグが指定されていない場合、csprojから取得してユーザーに確認
if [[ -z "$VERSION_TAG" ]]; then
    echo "🔍 Version not specified. Reading from project file..."
    
    # csprojファイルからVersionを取得
    CSPROJ_VERSION=""
    if [[ -f "$PROJECT_PATH" ]]; then
        CSPROJ_VERSION=$(grep -o '<Version>[^<]*</Version>' "$PROJECT_PATH" | sed 's/<Version>\(.*\)<\/Version>/\1/')
        
        # Versionタグが見つからない場合、AssemblyVersionを試す
        if [[ -z "$CSPROJ_VERSION" ]]; then
            CSPROJ_VERSION=$(grep -o '<AssemblyVersion>[^<]*</AssemblyVersion>' "$PROJECT_PATH" | sed 's/<AssemblyVersion>\(.*\)<\/AssemblyVersion>/\1/')
        fi
        
        # それでも見つからない場合、FileVersionを試す
        if [[ -z "$CSPROJ_VERSION" ]]; then
            CSPROJ_VERSION=$(grep -o '<FileVersion>[^<]*</FileVersion>' "$PROJECT_PATH" | sed 's/<FileVersion>\(.*\)<\/FileVersion>/\1/')
        fi
    fi
    
    # デフォルトバージョンの設定
    if [[ -z "$CSPROJ_VERSION" ]]; then
        CSPROJ_VERSION="1.0.0"
        echo "⚠️  No version found in project file. Using default: $CSPROJ_VERSION"
    else
        echo "📋 Found version in project file: $CSPROJ_VERSION"
    fi
    
    # vプレフィックスを追加（まだ付いていない場合）
    DEFAULT_VERSION="$CSPROJ_VERSION"
    if [[ ! "$DEFAULT_VERSION" =~ ^v ]]; then
        DEFAULT_VERSION="v$DEFAULT_VERSION"
    fi
    
    echo ""
    echo "Please specify the version to use for publishing:"
    read -p "Version [$DEFAULT_VERSION]: " USER_INPUT
    
    # ユーザー入力がある場合はそれを使用、なければデフォルト
    if [[ -n "$USER_INPUT" ]]; then
        VERSION_TAG="$USER_INPUT"
    else
        VERSION_TAG="$DEFAULT_VERSION"
    fi
    
    # vプレフィックスを追加（まだ付いていない場合）
    if [[ ! "$VERSION_TAG" =~ ^v ]]; then
        VERSION_TAG="v$VERSION_TAG"
    fi
    
    echo "✅ Using version: $VERSION_TAG"
    echo ""
fi

# "v" を除去して .NET に渡すバージョン形式に変換
VERSION="${VERSION_TAG#v}"

# 出力ルート（このスクリプトからの相対パス）
OUTPUT_ROOT="./bin/Release/net9.0"
RIDS=("win-x64" "win-arm64" "linux-x64" "osx-x64" "osx-arm64")

for RID in "${RIDS[@]}"; do
    echo "📦 Publishing for $RID..."

    dotnet publish "$PROJECT_PATH" \
        -c Release \
        -r "$RID" \
        --self-contained false \
        /p:PublishSingleFile=true \
        /p:PublishTrimmed=false \
        /p:IncludeNativeLibrariesForSelfExtract=true \
        /p:Version="$VERSION" \
        /p:InformationalVersion="$VERSION_TAG"

    PUBLISH_DIR="$OUTPUT_ROOT/$RID/publish"
    ZIP_NAME="SpineScreenshotCli-$RID.zip"
    ZIP_PATH="$PUBLISH_DIR/$ZIP_NAME"

    echo "🗜️ Compressing $ZIP_NAME (excluding debug/config files)..."

    # 除外対象の拡張子
    EXCLUDED_EXTENSIONS=(".pdb" ".xml" ".json" ".dll" ".deps.json" ".runtimeconfig.json")

    # 一時ディレクトリを作成してファイルをコピー
    TEMP_DIR=$(mktemp -d)
    
    # 対象ファイルをフィルタリングしてコピー
    for FILE in "$PUBLISH_DIR"/*; do
        if [[ -f "$FILE" ]]; then
            FILENAME=$(basename "$FILE")
            EXTENSION="${FILENAME##*.}"
            
            # 拡張子をチェック（ドットを追加して比較）
            SHOULD_EXCLUDE=false
            for EXT in "${EXCLUDED_EXTENSIONS[@]}"; do
                if [[ ".$EXTENSION" == "$EXT" ]]; then
                    SHOULD_EXCLUDE=true
                    break
                fi
            done
            
            # 除外対象でない場合はコピー
            if [[ "$SHOULD_EXCLUDE" == false ]]; then
                cp "$FILE" "$TEMP_DIR/"
            fi
        fi
    done

    # zipファイルを作成
    (cd "$TEMP_DIR" && zip -r "$ZIP_PATH" .)
    
    # 一時ディレクトリを削除
    rm -rf "$TEMP_DIR"
done

echo ""
echo "✅ All targets published and zipped successfully."