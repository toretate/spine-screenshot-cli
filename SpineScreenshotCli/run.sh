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


  dotnet run \
  --atlas ../example/prc/100711.atlas \
  --skel ../example/prc/100711.skel \
  --skin joy \
  --animation all \
  --frame 1 \
  --out-dir ./out \
  --out "100711-joy-_ANIME_.png" \
  --size 2048,2048 \
  --position 512,512 \
  --use-alpha \
  --premultiplied-alpha