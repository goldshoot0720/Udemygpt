"""Second-pass polishing of verified zh-TW subtitles, applied in place to translations/tw-*.json.

Usage:
    python3 scripts/polish_zh.py dump COURSE_ID --orders 1-10
    python3 scripts/polish_zh.py apply COURSE_ID PATCH.json --orders 1-10
    python3 scripts/polish_zh.py status COURSE_ID

dump prints each lecture in lectureOrder as "cueId<TAB>en<TAB>zh" lines.
apply takes {"<lectureId>": {"<cueId>": "<new zh>"}} (lectures in the range may be
absent when nothing needed changing), rewrites only those cues, and records the
range as polished in polish-progress.json. English, timing and ids never change.
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIMPLIFIED = set("这们为说时会来对经还过发现么样问题实开关击应该习码数据库组国区网页设让认识语读写钮键错误输检测试证确变态环队传递调载状显缓")


def parse_orders(text):
    start, _, end = text.partition("-")
    return int(start), int(end or start)


def load_course(course):
    course_dir = ROOT / "data/courses" / str(course)
    ledger = json.loads((course_dir / "translation-progress.json").read_text(encoding="utf-8"))
    files = {}
    for path in sorted((course_dir / "translations").glob("tw-*.json")):
        files[path] = json.loads(path.read_text(encoding="utf-8"))
    by_id = {}
    for path, data in files.items():
        for lecture in data["lectures"]:
            by_id[str(lecture["id"])] = (path, lecture)
    lectures = []
    for item in ledger["lectures"]:
        lecture_id = str(item.get("lectureId") or item.get("id"))
        lectures.append((item["lectureOrder"], lecture_id, item.get("title", "")))
    lectures.sort()
    return course_dir, files, by_id, lectures


def progress_path(course_dir):
    return course_dir / "polish-progress.json"


def load_progress(course_dir):
    path = progress_path(course_dir)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"version": 1, "polishedOrders": [], "changedCues": 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["dump", "apply", "status"])
    parser.add_argument("course")
    parser.add_argument("patch", nargs="?")
    parser.add_argument("--orders")
    args = parser.parse_args()

    course_dir, files, by_id, lectures = load_course(args.course)
    progress = load_progress(course_dir)

    if args.command == "status":
        done = set(progress["polishedOrders"])
        remaining = [order for order, _, _ in lectures if order not in done]
        print(f"polished {len(done)}/{len(lectures)} lectures, changed cues {progress['changedCues']}")
        print(f"next order: {remaining[0] if remaining else 'none'}")
        return

    low, high = parse_orders(args.orders)
    selected = [(order, lid, title) for order, lid, title in lectures if low <= order <= high]

    if args.command == "dump":
        for order, lid, title in selected:
            _, lecture = by_id[lid]
            print(f"## {order} {lid} {title}")
            for cue in lecture["cues"]:
                print(f"{cue['id']}\t{cue['en']}\t{cue['zh']}")
        return

    patch = json.loads(Path(args.patch).read_text(encoding="utf-8"))
    allowed = {lid for _, lid, _ in selected}
    changed = 0
    touched = set()
    for lid, cues in patch.items():
        if lid not in allowed:
            raise SystemExit(f"lecture {lid} is outside orders {args.orders}")
        path, lecture = by_id[lid]
        index = {str(cue["id"]): cue for cue in lecture["cues"]}
        for cue_id, zh in cues.items():
            zh = str(zh).strip()
            if cue_id not in index:
                raise SystemExit(f"lecture {lid}: unknown cue {cue_id}")
            if not zh:
                raise SystemExit(f"lecture {lid} cue {cue_id}: empty zh")
            bad = [ch for ch in zh if ch in SIMPLIFIED]
            if bad:
                raise SystemExit(f"lecture {lid} cue {cue_id}: simplified chars {bad}")
            if index[cue_id]["zh"] != zh:
                index[cue_id]["zh"] = zh
                changed += 1
                touched.add(path)

    for path in touched:
        tail = "\n" if path.read_text(encoding="utf-8").endswith("\n") else ""
        path.write_text(json.dumps(files[path], ensure_ascii=False, indent=2) + tail, encoding="utf-8")

    done = set(progress["polishedOrders"])
    done.update(order for order, _, _ in selected)
    progress["polishedOrders"] = sorted(done)
    progress["changedCues"] += changed
    progress["updatedAt"] = datetime.now(timezone.utc).isoformat()
    progress_path(course_dir).write_text(json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"orders {args.orders}: {len(selected)} lectures, {changed} cues changed, files {len(touched)}")
    print(f"polished {len(done)}/{len(lectures)}")


if __name__ == "__main__":
    main()
