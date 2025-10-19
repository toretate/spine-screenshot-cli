#!/bin/bash

# dotnet run --project ./SpineScreenshotCli/SpineScreenshotCli.csproj -- "$@"

dotnet run \
  --atlas ../example/prc/100711.atlas \
  --skel ../example/prc/100711.skel \
  --skin anger \
  --animation eye_open \
  --frame 1 \
  --output ./out \
  --size 1024,1196 \
  --position 500,0 \
  --background "#FFFFFF" \
  --use-alpha \
  --premultiplied-alpha