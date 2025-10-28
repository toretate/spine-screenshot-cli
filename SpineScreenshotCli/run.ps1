$BASE = "../SpineExamples/3.8/examples/spineboy/export"
$SKEL = "$BASE/spineboy.atlas"
$ATLAS = "$BASE/spineboy-pro.skel"

dotnet run `
  --atlas ${ATLAS} `
  --skel ${SKEL} `
  --skin default `
  --animation extra `
  --frame 1 `
  --range 100 `
  --interval 20 `
  --out-dir ./out `
  --out "_ATLASNAME_-_SKIN_-_ANIME_-_FRAME_.webp" `
  --size 1024,1024 `
  --position 960,520 `
  --use-alpha `
  --premultiplied-alpha `
    --format webp

  # --background 444444 `
  # --out "spineboy-_SKIN_-_ANIME_-_FRAME_.webp" `
  # --use-alpha `
  # --premultiplied-alpha `