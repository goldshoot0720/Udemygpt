#!/usr/bin/env python3
"""Create work/chatgpt-<name>/input.json for a list of lecture orders.

The translation worker reads this file, writes one continuous Chinese passage per
lecture to full-<lectureId>.txt, then scripts/align_zh.py cuts that passage into
exactly the right number of cues.

Usage:
    python3 scripts/make_batch_input.py 5291332 r1 61 62 63 76 77
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    course, name = sys.argv[1], sys.argv[2]
    orders = [int(x) for x in sys.argv[3:]]

    course_dir = ROOT / "data" / "courses" / course
    ledger = json.loads((course_dir / "translation-progress.json").read_text(encoding="utf-8"))
    index = {int(x["lectureOrder"]): x for x in ledger["lectures"]}

    batch = ROOT / "work" / f"chatgpt-{name}"
    batch.mkdir(parents=True, exist_ok=True)

    payload, total = {}, 0
    for order in orders:
        item = index[order]
        source = json.loads(Path(item["sourceFile"]).read_text(encoding="utf-8"))
        lecture = source["lectures"][0]
        payload[str(item["lectureId"])] = [{"id": c["id"], "en": c["en"]} for c in lecture["cues"]]
        total += len(lecture["cues"])

    (batch / "input.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"work/chatgpt-{name}/input.json: {len(orders)} lectures, {total} cues")


if __name__ == "__main__":
    main()