#!/usr/bin/env zsh
set -euo pipefail

cd "${0:A:h:h}"
read -s "ASSEMBLYAI_API_KEY?Enter the rotated AssemblyAI API key (hidden): "
print
export ASSEMBLYAI_API_KEY
trap 'unset ASSEMBLYAI_API_KEY' EXIT

python3 scripts/transcribe_missing_assemblyai.py \
  --manifest data/missing-japanese-sources.json \
  --language ja \
  "$@"
