"""Split a prepared batch whose largest lecture is heavy into per-lecture batch files.

ChatGPT-style one-shot translation is unreliable above ~120 cues per lecture, so any
lecture over the threshold is emitted on its own; the rest of the batch stays together.

Usage: python3 scripts/split_oversized_batches.py COURSE_ID TAG [TAG ...] [--limit 120]
"""
import argparse
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("course")
    ap.add_argument("tags", nargs="+")
    ap.add_argument("--limit", type=int, default=120)
    args = ap.parse_args()
    folder = ROOT / "data/courses" / str(args.course) / "chatgpt-batches"
    for tag in args.tags:
        path = folder / f"English-lectures-{tag}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        heavy = [l for l in data["lectures"] if len(l["cues"]) > args.limit]
        light = [l for l in data["lectures"] if len(l["cues"]) <= args.limit]
        made = []
        if heavy:
            path.unlink()
            for lecture in heavy:
                single = copy.deepcopy(data)
                single["lectures"] = [lecture]
                name = f"English-lectures-{int(lecture['lectureOrder']):03d}-{int(lecture['lectureOrder']):03d}.json"
                (folder / name).write_text(json.dumps(single, ensure_ascii=False, indent=2), encoding="utf-8")
                made.append((name, 1, len(lecture["cues"])))
        if light:
            rest = copy.deepcopy(data)
            rest["lectures"] = light
            first = min(int(x["lectureOrder"]) for x in light)
            last = max(int(x["lectureOrder"]) for x in light)
            name = f"English-lectures-{first:03d}-{last:03d}.json"
            if name != path.name:
                path.unlink(missing_ok=True)
            (folder / name).write_text(json.dumps(rest, ensure_ascii=False, indent=2), encoding="utf-8")
            made.append((name, len(light), sum(len(x["cues"]) for x in light)))
        print(f"{tag} ->")
        for name, n, cues in made:
            print(f"   {name}: {n} lectures, {cues} cues")


if __name__ == "__main__":
    main()
