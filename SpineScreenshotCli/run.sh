#!/bin/bash
BASE="../SpineExamples/3.8/examples"
SKEL="${BASE}/spineboy/export/spineboy-pro.skel"
ATLAS="${BASE}/spineboy/export/spineboy.atlas"

dotnet run -p:DefineConstants="SPINE_3_8"  \
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