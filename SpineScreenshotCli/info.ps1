$BASE = "../SpineExamples/3.8/examples/spineboy/export"
$SKEL = "$BASE/spineboy.atlas"
$ATLAS = "$BASE/spineboy-pro.skel"

dotnet run `
  --atlas ${ATLAS} `
  --skel ${SKEL} `
  --info
