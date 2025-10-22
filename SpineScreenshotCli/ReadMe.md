Spine の自動スクリーンショット作成ツールです
現在は Spine 3.6.x のみ対応しています

```
> SpineScreenshotCli
Spine Screenshot CLI 1.0.0+5b844fc2e882eecefe2aa9dddd5e3ccc25547487
Copyright © 2025
  Required option 'a, atlas' is missing.
  -a, --atlas              Atlas ファイル(.atlas) の指定
  -s, --skel               Skeleton ファイル(.skel or .json) の指定
  --skin                   スクショを取る Skin 名。all 指定で全 skin を対象とします
  --animation              スクショを取る Animataion 名。all 指定で全アニメーションを対象とします
  --fps                    フレームレート。 (default 30)
  --frame                  開始フレーム番号(default 1)。all 指定で全フレーム
  --range                  開始フレームからのスクショ範囲（フレーム単位）(default 0)。all 指定で終了まで
  --interval               range内でのスクショ間隔（フレーム単位）（default 0）
  --position               画像のオフセット。'x,y'形式で指定してください。(default: center)
  --size                   出力画像サイズ。'width,height'形式で指定してください。(default: 512,512)
  --scale                  画像の拡大率。(default: 1)
  --out-dir                出力フォルダ。(default: ./out)
  -o, --out                出力ファイル名 (default: 自動的にファイル名生成)
  --info                   Skin及びAnimation一覧を含むファイル情報を出力します
  --premultiplied-alpha    Pre Multiplied Alpha Blending を使います (Default: false)
  --use-alpha              Alpha channel の処理を行います(Default: true)
  --background             背景色指定。RRGGBB フォーマットで指定。 (default: transparent)
  --background-bg          背景画像指定。(default: background指定に寄る)
  --help                   ヘルプを表示
  --version                バージョンを表示
```

## 出力ファイル名ルール
-o に指定する出力ファイル名にはテンプレートを指定できます
 * _SKIN_  : skin名で置き換えられます
 * _ANIME_ : animation名で置き換えられます
 * _FRAME_ : スクショが撮られたframe番号で置き換えられます(4桁数字)
 * _XY_    : positionで置き換えらられます(XxY)
 * _SIZE_  : sizeで置き換えられます(WIDTHxHEIGHT)


## スクショのタイミング指定

例1: 5フレーム目のみ
--frame 5

例2: 5フレーム目～終了
--frame 5 --range all

例3: 5フレーム目～15フレーム目 を 全フレーム
--frame 5 --range 10

例4: 5フレーム目～15フレーム目 を 2フレーム毎(5,7,9,11,13,15)
--frame 5 --range 10 --interval 2

例5: 全フレーム
--frame all

例6: 全フレームを 5フレーム毎
--frame all --interval 5


# ビルド環境の揃え方

VS.code のコンソールで下記を実行する

##  環境構築

```
winget install Microsoft.DotNet.SDK.9
Install-Package NuGet.CommandLine -Scope CurrentUser
git clone --branch 3.6 https://github.com/EsotericSoftware/spine-runtimes.git
```

ビルド
```
dotnet build
```

# 対応状況

下記に項目があるからと言って、実装するわけではありません（特にマルチビルド、Spineバージョン）

* [x] SkinとAnimation情報の表示 (--info 指定)
* [x] skin 指定
* [x] anime 指定
* [x] ヘッドレス撮影処理
* [x] 1フレーム目のスクショ保存
* [x] anime all 対応
* [ ] skin all 対応
* [x] 背景色指定 (-background)
* [ ] 背景画像指定 (-background-bg)
* [ ] frame
    * [x] frame指定の実装(30FPS固定)
    * [ ] frame all の実装
    * [x] FPS指定の実装
    * [ ] range の実装
    * [ ] range all の実装
    * [ ] interval の実装
* [ ] ファイル名
    * [x] ファイル名指定保存
    * [x] Animeテンプレート
    * [ ] Skinテンプレート
    * [ ] Frameテンプレート
    * [ ] XYテンプレート
    * [ ] SIZEテンプレート
* [ ] ファイル形式
    * [x] PNG
    * [ ] APNG
    * [ ] JPEG
    * [ ] GIF
    * [x] WebP (静止画)
    * [ ] WebP (アニメ)
* [ ] グリッド画像保存
* [ ] マルチビルド
    * [x] win-x64
    * [ ] win-x86
    * [ ] win-arm64
    * [ ] linux-x64
    * [ ] linux-musl-x64
    * [ ] linux-musl-arm64
    * [ ] linux-arm
    * [ ] linux-arm64
    * [ ] linux-bionic-arm64
    * [ ] linux-loongarch64
    * [x] osx-x64
    * [ ] osx-arm64
    * [ ] ios-arm64
    * [ ] iossimulator-arm64
    * [ ] iossimulator-x64
    * [ ] android-arm64
    * [ ] android-arm
    * [ ] android-x64
    * [ ] android-x86
* [ ] リリース処理
    * [ ] GithubActions による自動ビルド
    * [ ] GithubActions による自動テスト
    * [ ] リリースバイナリの公開対応(手動)
    * [ ] リリースバイナリの公開対応(自動)
* [ ] Spine Version
    * [ ] 2.1.08 対応
    * [ ] 2.1.25 対応
    * [ ] 3.1.07 対応
    * [ ] 3.4.02 対応
    * [ ] 3.5.35 対応
    * [ ] 3.5.51 対応
    * [x] 3.6.32 対応 3.6 ブランチで対応済？
    * [x] 3.6.39 対応 3.6 ブランチで対応済？
    * [x] 3.6.53 対応
    * [ ] 3.7.83 対応
    * [ ] 3.7.94 対応
    * [ ] 3.8.95 対応
    * [ ] 4.0.31 対応
    * [ ] 4.0.64 対応
    * [ ] 4.1.00 対応
* [ ] Runtime
    * [-] .NET Framework 3.5 SP1 対応 → 対応予定無し
    * [-] .NET Framework 4.6.2 対応 → 対応予定無し
    * [-] .NET Framework 4.7 対応 → 対応予定無し
    * [-] .NET Framework 4.7.1 対応 → 対応予定無し
    * [-] .NET Framework 4.7.2 対応 → 対応予定無し
    * [-] .NET Framework 4.8 対応 → 対応予定無し
    * [-] .NET Framework 4.8.1 対応 → 対応予定無し
    * [ ] .NET  8 対応
    * [x] .NET  9 対応：XNA, MonoGame(Mac) で確認
    * [ ] .NET 10 対応
    * [ ] npm (Spine 3.8 未満のSkeltonBinaryが公式TSライブラリ未対応)
    * [ ] その他：良くわかってない。.NET版があるから問題無し？
* [ ] 資料
    * [ ] ヘルプ(--help) 作成
    * [ ] まともな Readme 作成
    * [ ] リリース物の利用案内
    * [ ] Dotnetが入っていない環境向け資料
    * [ ] AI向け Readme 作成
    * [ ] 言語
        * [x] 日本語
        * [ ] 英語
        * [ ] 翻訳実行ボタン
