$SKEL = "../spine-runtimes/examples/spineboy/export/spineboy.atlas"
$ATLAS = "../spine-runtimes/examples/spineboy/export/spineboy-pro.skel"

dotnet run `
  --atlas ${SKEL} `
  --skel ${ATLAS} `
  --info
