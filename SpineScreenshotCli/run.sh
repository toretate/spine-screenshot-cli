#!/bin/bash

SKEL="../spine-runtimes/examples/spineboy/export/spineboy.atlas"
ATLAS="../spine-runtimes/examples/spineboy/export/spineboy-pro.skel"

  dotnet run \
  --skel $SKEL \
  --atlas $ATLAS \
  --skin all \
  --animation all \
  --frame 5 \
  --out-dir ./out \
  --out "spineboy-_SKIN_-_ANIME_-_FRAME_.webp" \
  --size 1024,1152 \
  --position 512,1152 \
  --use-alpha \
  --background FFFFFF \
  --premultiplied-alpha \
  --format webp