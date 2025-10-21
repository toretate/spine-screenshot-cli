Spine の自動スクリーンショット作成ツールです
現在は Spine 3.6.x のみ対応しています

> SpineScreenshotCli
Spine Screenshot CLI 1.0.0+5b844fc2e882eecefe2aa9dddd5e3ccc25547487
Copyright © 2025
  Required option 'a, atlas' is missing.
  -a, --atlas              Atlas ファイル(.atlas) の指定
  -s, --skel               Skeleton ファイル(.skel or .json) の指定
  --skin                   Screenshotを取る Skin 名
  --animation              Screenshotを取る Animataion 名。all 指定で全アニメーションを対象とします
  --frame                  Screenshotを取る frame 番号。(default 0)
  --position               画像のオフセット。'x,y'形式で指定してください。(default: center)
  --size                   出力画像サイズ。'width,height'形式で指定してください。(default: 512,512)
  --scale                  画像の拡大率。(default: 1)
  --out-dir                出力フォルダ。(default: ./out)
  -o, --out                出力ファイル名 (default: 自動的にファイル名生成)。_ANIME_はanimation名で置き換えられます
  --info                   Skin及びAnimation一覧を含むファイル情報を出力します
  --premultiplied-alpha    Pre Multiplied Alpha Blending を使います (Default: false)
  --use-alpha              Alpha channel の処理を行います(Default: true)
  --background             背景色指定。#RRGGBB フォーマットで指定。 (default: transparent)
  --help                   ヘルプを表示
  --version                バージョンを表示


## ビルド環境の揃え方

VS.code のコンソールで


環境構築
```
winget install Microsoft.DotNet.SDK.9
Install-Package NuGet.CommandLine -Scope CurrentUser
git clone --branch 3.6 https://github.com/EsotericSoftware/spine-runtimes.git
```

ビルド
```
dotnet build
```