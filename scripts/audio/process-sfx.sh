#!/usr/bin/env bash
# Stickman Arena sound-effect pipeline (AUDIO_ASSET_CATALOG.md section 4).
# Takes one downloaded clip, trims leading and trailing silence, normalises loudness, and writes
# an .ogg (primary) and .mp3 (fallback) into assets/audio/sfx/<fighter>/<ability>/. It refuses to
# run without the source URL, creator and licence, and appends one provenance row to SOURCES.tsv.
#
# usage: process-sfx.sh --in FILE --out NAME --fighter ID --ability ID \
#          --source-url URL --creator NAME --licence TEXT [--max-s 3] [--gain-db 0]
set -euo pipefail

usage() { sed -n '2,8p' "$0"; exit 2; }
IN=""; OUT=""; FIGHTER=""; ABILITY=""; SRC=""; CREATOR=""; LICENCE=""; MAX_S=""; GAIN=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --in) IN=$2; shift 2 ;;
    --out) OUT=$2; shift 2 ;;
    --fighter) FIGHTER=$2; shift 2 ;;
    --ability) ABILITY=$2; shift 2 ;;
    --source-url) SRC=$2; shift 2 ;;
    --creator) CREATOR=$2; shift 2 ;;
    --licence) LICENCE=$2; shift 2 ;;
    --max-s) MAX_S=$2; shift 2 ;;
    --gain-db) GAIN=$2; shift 2 ;;
    *) usage ;;
  esac
done
[[ -n $IN && -n $OUT && -n $FIGHTER && -n $ABILITY ]] || usage
[[ -n $SRC && -n $CREATOR && -n $LICENCE ]] || { echo "error: --source-url, --creator and --licence are required (licence record)" >&2; exit 3; }
[[ -f $IN ]] || { echo "error: no such file: $IN" >&2; exit 4; }
[[ $OUT =~ ^sfx-[a-z0-9-]+$ ]] || { echo "error: --out must be kebab-case with the sfx- prefix, e.g. sfx-knife-stab" >&2; exit 5; }
[[ $FIGHTER =~ ^[a-z0-9-]+$ && $ABILITY =~ ^[a-z0-9-]+$ ]] || { echo "error: fighter and ability ids must be kebab-case" >&2; exit 5; }

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
DEST="$ROOT/assets/audio/sfx/$FIGHTER/$ABILITY"
mkdir -p "$DEST"
MANIFEST="$ROOT/assets/audio/sfx/SOURCES.tsv"
[[ -f $MANIFEST ]] || printf 'file\tfighter\tability\tsource_url\tcreator\tlicence\tdownloaded\tedits\n' > "$MANIFEST"

# Trim silence at both ends (-50 dB threshold), optional length cap, loudness to -16 LUFS / -1.5 dBTP.
FILTERS="silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=1:stop_threshold=-50dB:stop_duration=0.05"
FILTERS="$FILTERS,areverse,silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=1:stop_threshold=-50dB:stop_duration=0.05,areverse"
[[ -n $MAX_S ]] && FILTERS="$FILTERS,atrim=0:$MAX_S"
FILTERS="$FILTERS,volume=${GAIN}dB,loudnorm=I=-16:TP=-1.5:LRA=11"

ogg="$DEST/$OUT.ogg"; mp3="$DEST/$OUT.mp3"
ffmpeg -v error -y -i "$IN" -af "$FILTERS" -ac 2 -ar 44100 -c:a libvorbis -q:a 4 "$ogg"
ffmpeg -v error -y -i "$IN" -af "$FILTERS" -ac 2 -ar 44100 -c:a libmp3lame -q:a 4 "$mp3"

dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$ogg")
printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$OUT" "$FIGHTER" "$ABILITY" "$SRC" "$CREATOR" "$LICENCE" \
  "$(date +%d/%m/%Y)" "trim-silence,loudnorm-16LUFS,max=${MAX_S:-none},gain=${GAIN}dB" >> "$MANIFEST"
printf 'wrote %s and %s (%.2f s)\n' "${ogg#$ROOT/}" "${mp3#$ROOT/}" "$dur"
