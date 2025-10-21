#!/bin/bash

# dotnet run --project ./SpineScreenshotCli/SpineScreenshotCli.csproj -- "$@"

# dotnet run \
#   --atlas ../example/prc/100711.atlas \
#   --skel ../example/prc/100711.skel \
#   --skin joy \
#   --animation all \
#   --frame 1 \
#   --out-dir ./out \
#   --out "100711-joy-_ANIME_.png" \
#   --size 1024,1196 \
#   --position 500,0 \
#   --use-alpha \
#   --premultiplied-alpha


dotnet run `
  --atlas ../example/prc/100711.atlas `
  --skel ../example/prc/100711.skel `
  --skin joy `
  --animation all `
  --frame 1 `
  --out-dir ./out `
  --out "100711-joy-_ANIME_.png" `
  --size 1024,1152 `
  --position 512,1152 `
  --use-alpha `
  --premultiplied-alpha