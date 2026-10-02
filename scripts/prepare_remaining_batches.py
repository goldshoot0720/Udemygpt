"""Prepare ChatGPT translation batches for the still-untranslated lectures of a course.

Unlike prepare_batches.py --split this only chunks the lectures that are still
pending in the course ledger, so finished work is never re-batched.

Usage:
    python3 scripts/prepare_remaining_batches.py COURSE_ID [--max-cues 500] [--from-order N]
"""
import argparse
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("course")
    parser.add_argument("--max-cues", type=int, default=500)
    parser.add_argument("--from-order", type=int, default=0)
    parser.add_argument("--to-order", type=int, default=0, help="Only lectures at or below this order")
    parser.add_argument("--tail", type=int, default=0,
                        help="Only the last N pending lectures by order (start from the end of the course)")
    parser.add_argument("--reverse", action="store_true",
                        help="Chunk from the end of the course towards the front")
    args = parser.parse_args()

    course_dir = ROOT / "data/courses" / str(args.course)
    ledger = json.loads((course_dir / "translation-progress.json").read_text(encoding="utf-8"))
    pending = [x for x in ledger["lectures"]
               if x["status"] == "pending" and int(x["lectureOrder"]) >= args.from_order
               and (not args.to_order or int(x["lectureOrder"]) <= args.to_order)]
    pending.sort(key=lambda x: int(x["lectureOrder"]))
    if args.tail:
        pending = pending[-args.tail:]
    if args.reverse:
        pending.reverse()
    if not pending:
        print("no pending lectures")
        return

    sources = []
    for item in pending:
        sources.append(json.loads(Path(item["sourceFile"]).read_text(encoding="utf-8")))

    template = copy.deepcopy(sources[0])
    template["errors"] = []

    chunks, current, count = [], [], 0
    for source in sources:
        size = len(source["lectures"][0]["cues"])
        if current and count + size > args.max_cues:
            chunks.append(current)
            current, count = [], 0
        current.append(source["lectures"][0])
        count += size
    if current:
        chunks.append(current)

    folder = course_dir / "chatgpt-batches"
    for lectures in chunks:
        first = min(int(x["lectureOrder"]) for x in lectures)
        last = max(int(x["lectureOrder"]) for x in lectures)
        data = copy.deepcopy(template)
        data["lectures"] = lectures
        name = f"English-lectures-{first:03d}-{last:03d}.json"
        (folder / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{name}: {len(lectures)} lectures, {sum(len(x['cues']) for x in lectures)} cues "
              f"(orders {first}-{last})")
    print(f"{len(chunks)} batch files, {sum(len(x['cues']) for c in chunks for x in c)} cues pending")


if __name__ == "__main__":
    main()
