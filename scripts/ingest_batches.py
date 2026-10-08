#!/usr/bin/env python3
"""Cut every full-<lectureId>.txt in a batch dir into cue-aligned zh JSON.

Wraps scripts/align_zh.py so a whole batch can be turned into per-cue subtitle
maps in one pass, and reports the Chinese/English character ratio of each result.
The ratio is the cheap guard against the two classic failures: a translation that
summarizes (ratio far below the course norm) and one that pads (ratio far above).

Only reads input.json and full-*.txt and writes zh-<lectureId>.txt inside the
given directories. It never touches the course ledger.

Usage:
    python3 scripts/ingest_batches.py work/chatgpt-z4 work/chatgpt-z5 [--apply]
"""
import argparse
import glob
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Measured over the already-verified lectures of course 5291332: mean 0.379,
# median 0.376, observed range 0.297-0.509.
LOW, HIGH = 0.30, 0.51


def ingest(directory, apply_maps):
    name = os.path.basename(directory.rstrip("/"))
    input_path = os.path.join(directory, "input.json")
    if not os.path.exists(input_path):
        print(f"{name}: no input.json, skipped")
        return []
    cues = json.loads(open(input_path, encoding="utf-8").read())
    rows = []
    for path in sorted(glob.glob(os.path.join(directory, "full-*.txt"))):
        lecture_id = os.path.basename(path)[len("full-"):-len(".txt")]
        if lecture_id not in cues:
            print(f"{name}: {lecture_id} has no input entry, skipped")
            continue
        script = os.path.join(ROOT, "scripts", "align_zh.py")
        done = subprocess.run(
            [sys.executable, script, input_path, lecture_id, path],
            capture_output=True, text=True, cwd=ROOT,
        )
        if done.returncode != 0:
            print(f"{name}: {lecture_id} align failed: {done.stderr.strip()[:200]}")
            continue
        zh_path = os.path.join(directory, f"zh-{lecture_id}.json")
        en_chars = sum(len(c["en"]) for c in cues[lecture_id])
        zh = json.loads(open(zh_path, encoding="utf-8").read())[lecture_id]
        zh_chars = sum(len(v) for v in zh.values())
        ratio = zh_chars / en_chars if en_chars else 0
        flag = "OK " if LOW <= ratio <= HIGH else "RATIO!"
        rows.append({
            "batch": name, "lectureId": lecture_id, "cues": len(cues[lecture_id]),
            "en": en_chars, "zh": zh_chars, "ratio": ratio, "ok": LOW <= ratio <= HIGH,
            "zhPath": os.path.relpath(zh_path, ROOT),
        })
        print(f"{name}: {lecture_id} {len(cues[lecture_id]):3} 段 {flag} "
              f"en={en_chars} zh={zh_chars} ratio={ratio:.3f}")
    if apply_maps and rows:
        maps = [r["zhPath"] for r in rows]
        maps = [m for m in maps if os.path.exists(m)]
        if maps:
            done = subprocess.run(
                [sys.executable, "scripts/apply_zh_map.py", "5291332", *maps],
                capture_output=True, text=True, cwd=ROOT,
            )
            print(done.stdout.strip()[-400:] or done.stderr.strip()[:400])
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dirs", nargs="+")
    parser.add_argument("--apply", action="store_true",
                        help="also run apply_zh_map.py on the generated maps")
    args = parser.parse_args()
    rows = []
    for directory in args.dirs:
        rows += ingest(directory, args.apply)
    bad = [r for r in rows if not r["ok"]]
    print(f"\n{len(rows)} lectures, {sum(r['cues'] for r in rows)} cues, "
          f"ratio outliers: {len(bad)}")
    for r in bad:
        print(f"  {r['batch']}/{r['lectureId']}: {r['ratio']:.3f}")


if __name__ == "__main__":
    main()