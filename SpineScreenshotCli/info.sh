#!/bin/bash

SKEL="../spine-runtimes/examples/spineboy/export/spineboy.atlas"
ATLAS="../spine-runtimes/examples/spineboy/export/spineboy-pro.skel"

dotnet run \
  --skel $SKEL \
  --atlas $ATLAS \
  --info
