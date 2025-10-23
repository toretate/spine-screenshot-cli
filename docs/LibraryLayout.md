この資料は、このプロジェクトで使う spine-runtimes のライブラリ と Example ファイルのレイアウトについての資料になります
spine-runtimes は https://github.com/EsotericSoftware/spine-runtimes/ です

/SpineLibraries     : ライブラリRoot
  /$Version         : spine-runtimes の GitTag名。3.6.32, 3.6.39, 3.6.53 が対象。spine-libgdx-* タグは対象としない
    /spine-csharp   : 上記 GitTagの spine-csharp/src の内容
    /spine-xna      : 上記 GitTagの spine-xna/src の内容
    /spine-monogame : 上記 GitTagの spine-monogame/src の内容

/SpineExamples      : ExampleRoot
  /$Version         : spine-runtimes の GitTag名。3.6.32, 3.6.39, 3.6.53 が対象。spine-libgdx-* タグは対象としない
    /examples       : 上記 GitTagの /examples

なお、SpineLibraries, SpineExamples は .gitignore に入れるため、開発者はこのリポジトリを clone したあと↑のレイアウトに沿うようにデータを配置する

このレイアウトになるように、開発環境作成用の sh スクリプトを用意する

-- 以下、AI側のメモ欄 --

## C#での環境管理の仕組み

### 1. NuGet パッケージ管理
- 公式のSpineライブラリがNuGetで提供されている場合に使用
- PackageReference または packages.config で管理
- 複数バージョンの同時利用は困難

### 2. Git Submodules
- spine-runtimesリポジトリをサブモジュールとして追加
- 特定のタグ/コミットにピン留め可能
- `git submodule add https://github.com/EsotericSoftware/spine-runtimes.git`

### 3. Directory.Build.props による設定管理
```xml
<Project>
  <PropertyGroup>
    <SpineLibrariesPath>$(MSBuildThisFileDirectory)SpineLibraries</SpineLibrariesPath>
    <SpineExamplesPath>$(MSBuildThisFileDirectory)SpineExamples</SpineExamplesPath>
  </PropertyGroup>
</Project>
```

### 4. PowerShell/Bash スクリプトによる環境セットアップ
- setup.ps1 または setup.sh でライブラリダウンロード・配置を自動化
- 開発者が `./setup.sh` 実行するだけで環境構築完了

### 推奨アプローチ
複数バージョンの管理が必要なため：
1. **Git Submodules** + **セットアップスクリプト** の組み合わせ
2. または **PowerShellスクリプト** でGitHubから直接ダウンロード・展開

セットアップスクリプトで以下を自動化：
- 指定バージョンのspine-runtimesをダウンロード
- 必要なファイルを適切なディレクトリ構造に配置
- .gitignoreの設定確認

## Git Submodulesを使用する場合のレイアウトオプション

### オプション1: 複数サブモジュール方式
```
/spine-runtimes-3.6.32  : サブモジュール (3.6.32タグ)
/spine-runtimes-3.6.53  : サブモジュール (3.6.53タグ)
/SpineLibraries         : シンボリックリンクまたはコピースクリプトで生成
  /3.6.32
    /spine-csharp       -> ../spine-runtimes-3.6.32/spine-csharp/src
    /spine-xna          -> ../spine-runtimes-3.6.32/spine-xna/src
    /spine-monogame     -> ../spine-runtimes-3.6.32/spine-monogame/src
```

### オプション2: 単一サブモジュール + セットアップスクリプト方式
```
/spine-runtimes         : サブモジュール (最新)
/SpineLibraries         : セットアップスクリプトで生成
  /3.6.32               : 過去タグから checkout & copy
  /3.6.53               : 過去タグから checkout & copy
```

### オプション3: 修正レイアウト (推奨)
サブモジュールの特性を活かした構造：
```
/external
  /spine-runtimes       : サブモジュール
/src
  /SpineWrapper         : 各バージョンのラッパークラス
    /V3632              : 3.6.32用ラッパー
    /V3653              : 3.6.53用ラッパー
```

#### オプション3の詳細な流れ

**1. 基本構造**
```
/external/spine-runtimes/    : 単一のサブモジュール（最新版を指す）
/src/SpineWrapper/
  /V3632/
    /spine-csharp/                  : 3.6.32のソースをコピー
    SpineLoader3632.cs              : 上記ソースを使うラッパー
  /V3653/
    /spine-csharp/                  : 3.6.53のソースをコピー
    SpineLoader3653.cs              : 上記ソースを使うラッパー
```

**2. 実装の流れ**
- サブモジュールは1つだけ（最新版）
- セットアップスクリプトが各バージョンのソースを一時的にチェックアウトしてコピー
- 各バージョン専用のソースファイルを別ディレクトリに配置
- ラッパークラスは対応するバージョンのソースを参照

**3. セットアップスクリプトの動作**
```bash
# 各バージョンのソースを取得してコピー
cd external/spine-runtimes
git checkout 3.6.32
cp -r spine-csharp/src ../src/SpineWrapper/V3632/spine-csharp/
git checkout 3.6.53
cp -r spine-csharp/src ../src/SpineWrapper/V3653/spine-csharp/
```

**4. ラッパークラスの例**
```csharp
// V3632/SpineLoader3632.cs
// このディレクトリ内の spine-csharp を参照
using Spine; // V3632/spine-csharp/ から
namespace SpineWrapper.V3632 {
    public class SpineLoader3632 : ISpineLoader { ... }
}
```

**注意**: この方法だとソースファイルの重複が発生するため、
実際にはオプション2（元の要件通りのレイアウト）の方が適している可能性があります。

## Wrapperが不要な場合のオプション比較

### オプション2: 元の要件通りのレイアウト
```
/spine-runtimes         : サブモジュール（作業用）
/SpineLibraries         : セットアップスクリプトで生成
  /3.6.32
    /spine-csharp       : 3.6.32のspine-csharp/srcをコピー
    /spine-xna          : 3.6.32のspine-xna/srcをコピー
    /spine-monogame     : 3.6.32のspine-monogame/srcをコピー
  /3.6.53
    /spine-csharp       : 3.6.53のspine-csharp/srcをコピー
    /spine-xna          : 3.6.53のspine-xna/srcをコピー
    /spine-monogame     : 3.6.53のspine-monogame/srcをコピー
/SpineExamples          : セットアップスクリプトで生成
  /3.6.32/examples      : 3.6.32の/examplesをコピー
  /3.6.53/examples      : 3.6.53の/examplesをコピー
```

### オプション3: シンプル化（Wrapper不要版）
```
/external/spine-runtimes : サブモジュール（作業用のみ）
/SpineLibraries          : オプション2と同じ構造
/SpineExamples           : オプション2と同じ構造
```

**結論**: Wrapperが不要な場合、オプション2と3は実質的に同じ。
違いは作業用サブモジュールの配置場所のみ（ルート vs /external）。

**最終推奨**: オプション2（元の要件通り）
- 既存の要件を満たす
- サブモジュールは作業用なので配置場所は任意
- セットアップスクリプトで完全に自動化可能

**推奨**: オプション2。オプション1は管理が複雑になるため非推奨。

**採用決定**: オプション3（外部ライブラリの拡張性を考慮）
- `/external/spine-runtimes` サブモジュール配置
- 対象バージョン: 3.6.32, 3.6.39, 3.6.53
- セットアップスクリプト: `setup.sh` をルートに配置
