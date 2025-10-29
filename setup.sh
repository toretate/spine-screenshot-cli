#!/bin/bash

set -e

# =============================================================================
# Spine Runtimes Environment Setup Script
# 
# 開発者向けセットアップ手順:
#   1. このリポジトリをクローン: git clone <repo-url>
#   2. このスクリプトを実行: ./setup.sh
#
# 注意: サブモジュールの初期化も自動で行われます
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTERNAL_DIR="${SCRIPT_DIR}/external"
SPINE_RUNTIMES_DIR="${EXTERNAL_DIR}/spine-runtimes"
SPINE_LIBRARIES_DIR="${SCRIPT_DIR}/SpineLibraries"
SPINE_EXAMPLES_DIR="${SCRIPT_DIR}/SpineExamples"

# 対象バージョン
VERSIONS=("3.6" "3.8")

echo "=== Spine Runtimes Environment Setup ==="

# libraries ディレクトリ削除
# rm -rf "${SPINE_LIBRARIES_DIR}"

# external ディレクトリ作成
mkdir -p "${EXTERNAL_DIR}"

# サブモジュールの初期化・更新
echo "Checking submodule status..."

# submoduleが初期化されているかチェック
if ! git submodule status external/spine-runtimes | grep -q '^[[:space:]]*[^-]'; then
    echo "Initializing spine-runtimes submodule..."
    git submodule update --init --recursive external/spine-runtimes
else
    echo "Updating spine-runtimes submodule..."
    git submodule update --recursive external/spine-runtimes
fi

# 最終確認
if [ ! -e "${SPINE_RUNTIMES_DIR}/.git" ]; then
    echo "ERROR: Failed to initialize submodule. Please check if .gitmodules exists."
    exit 1
fi

# 作業ディレクトリに移動
cd "${SPINE_RUNTIMES_DIR}"

# リモートブランチを取得
echo "Fetching all remote branches..."
git fetch --all

# 各バージョンのセットアップ
for version in "${VERSIONS[@]}"; do
    echo "Setting up version ${version}..."
    
    # バージョンブランチの存在確認とチェックアウト
    if git show-ref --verify --quiet refs/heads/"${version}" || git show-ref --verify --quiet refs/remotes/origin/"${version}"; then
        git checkout "${version}" 2>/dev/null || git checkout -b "${version}" "origin/${version}"
    else
        echo "WARNING: Branch ${version} does not exist. Skipping..."
        continue
    fi
    
    # ライブラリディレクトリの作成とコピー
    version_lib_dir="${SPINE_LIBRARIES_DIR}/${version}"
    mkdir -p "${version_lib_dir}"
    
    # C# ライブラリのコピー
    if [ -d "spine-csharp/src" ]; then
        cp -r "spine-csharp/src/" "${version_lib_dir}/spine-csharp/"
        echo "  Copied spine-csharp for ${version}"
    fi
    
    # XNA ライブラリのコピー
    if [ -d "spine-xna/src" ]; then
        cp -r "spine-xna/src/" "${version_lib_dir}/spine-xna/"
        echo "  Copied spine-xna for ${version}"
    fi
    
    # MonoGame ライブラリのコピー
    if [ -d "spine-monogame/src" ]; then
        cp -r "spine-monogame/src/" "${version_lib_dir}/spine-monogame/"
        echo "  Copied spine-monogame for ${version}"
    fi
    
    # サンプルのコピー
    version_examples_dir="${SPINE_EXAMPLES_DIR}/${version}"
    mkdir -p "${version_examples_dir}"
    
    if [ -d "examples" ]; then
        cp -r "examples" "${version_examples_dir}/"
        echo "  Copied examples for ${version}"
    fi
done

# 元のブランチに戻る
git checkout main 2>/dev/null || git checkout master 2>/dev/null || true

cd "${SCRIPT_DIR}"

# SkeletonDebugRenderer.cs の削除
echo "Removing SkeletonDebugRenderer.cs files..."
find "${SPINE_LIBRARIES_DIR}" -name "SkeletonDebugRenderer.cs" -type f -delete
echo "  Removed all SkeletonDebugRenderer.cs files"

# Util.cs の削除
echo "Removing Util.cs files..."
find "${SPINE_LIBRARIES_DIR}" -name "Util.cs" -type f -delete
echo "  Removed all Util.cs files"

# .NET 9 OrderedDictionary 曖昧性修正
echo "Fixing OrderedDictionary ambiguity for .NET 9..."
for version in "${VERSIONS[@]}"; do
    version_dir="${SPINE_LIBRARIES_DIR}/${version}"
    
    if [ -d "${version_dir}" ]; then
        # 全てのSkin.csファイルでOrderedDictionaryを完全修飾名に置換
        find "${version_dir}" -name "Skin.cs" -type f | while read -r skin_file; do
            if grep -q "OrderedDictionary<" "${skin_file}" 2>/dev/null; then
                # 安全な一時ファイル処理
                temp_file=$(mktemp)
                LC_ALL=C sed "s/private OrderedDictionary</private Spine.Collections.OrderedDictionary</g" "${skin_file}" | \
                LC_ALL=C sed "s/public OrderedDictionary</public Spine.Collections.OrderedDictionary</g" | \
                LC_ALL=C sed "s/new OrderedDictionary</new Spine.Collections.OrderedDictionary</g" > "${temp_file}"
                mv "${temp_file}" "${skin_file}"
            fi
        done
        
        echo "  Fixed OrderedDictionary ambiguity in ${version_dir}"
    fi
done



echo "=== Setup completed ==="
echo "Libraries: ${SPINE_LIBRARIES_DIR}"
echo "Examples: ${SPINE_EXAMPLES_DIR}"
echo "Versions: ${VERSIONS[*]}"
echo "Libraries: ${SPINE_LIBRARIES_DIR}"
echo "Examples: ${SPINE_EXAMPLES_DIR}"
echo "Versions: ${VERSIONS[*]}"
echo "Versions: ${VERSIONS[*]}"
