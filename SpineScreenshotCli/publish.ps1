param (
    [string]$VersionTag = "v0.0.0"
)
# "v" を除去して .NET に渡すバージョン形式に変換
$version = $VersionTag.TrimStart("v")

# プロジェクトファイルのパス（このスクリプトと同じディレクトリにある前提）
$projectPath = "./SpineScreenshotCli.csproj"

# 出力ルート（このスクリプトからの相対パス）
$outputRoot = "./bin/Release/net9.0"
$rids = @("win-x64", "win-arm64", "linux-x64", "osx-x64", "osx-arm64")

foreach ($rid in $rids) {
    Write-Host "📦 Publishing for $rid..."

    dotnet publish $projectPath `
        -c Release `
        -r $rid `
        --self-contained false `
        /p:PublishSingleFile=true `
        /p:PublishTrimmed=false `
        /p:IncludeNativeLibrariesForSelfExtract=true `
        /p:Version=$version `
        /p:InformationalVersion=$VersionTag

    $publishDir = "$outputRoot/$rid/publish"
    $zipName = "SpineScreenshotCli-$rid.zip"
    $zipPath = "$publishDir/$zipName"

    Write-Host "🗜️ Compressing $zipName (excluding debug/config files)..."

    # 除外対象の拡張子
    $excludedExtensions = @(".pdb", ".xml", ".json", ".dll", ".deps.json", ".runtimeconfig.json")

    # 対象ファイルをフィルタリング
    $filesToInclude = Get-ChildItem $publishDir -File | Where-Object {
        $excludedExtensions -notcontains $_.Extension
    } | Select-Object -ExpandProperty FullName


    Compress-Archive -Path $filesToInclude -DestinationPath $zipPath -Force
}

Write-Host "`n✅ All targets published and zipped successfully."