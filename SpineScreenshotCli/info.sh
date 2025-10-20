#!/bin/bash

# dotnet run --project ./SpineScreenshotCli/SpineScreenshotCli.csproj -- "$@"

dotnet run \
  --atlas ../example/prc/100711.atlas \
  --skel ../example/prc/100711.skel \
  --info
