"""Checkpoint ChatGPT subtitle translations for non-React courses, smallest course first. Never calls a translation model."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from prepare_batches import load, verify

ROOT = Path(__file__).resolve().parent
COURSES = ROOT / "data/courses"
SKIP = {"1362070"}  # React keeps its own checkpoint in translation_queue.py


def ledger_path(course):
    return COURSES / str(course) / "translation-progress.json"


def save(path, value):
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(path)


def courses():
    """Non-React courses ordered by lecture count, then cue count."""
    found = []
    for path in COURSES.glob("*/translation-progress.json"):
        if path.parent.name in SKIP:
            continue
        ledger = load(path)
        lectures = ledger["lectures"]
        found.append({"courseId": ledger["courseId"], "title": ledger.get("courseTitle", ""),
                      "lectures": len(lectures), "cues": sum(x.get("cueCount", 0) for x in lectures),
                      "done": sum(x["status"] in ("verified", "imported") for x in lectures)})
    return sorted(found, key=lambda x: (x["lectures"], x["cues"]))


def target_file(course, order):
    start = (int(order) - 1) // 50 * 50 + 1
    return COURSES / str(course) / "translations" / f"tw-{start:03d}-{start + 49:03d}.json"


def store(course, ledger, lecture):
    """Merge one verified lecture into its 50-lecture bundle, keeping lectureOrder sorting."""
    target = target_file(course, lecture["lectureOrder"])
    target.parent.mkdir(parents=True, exist_ok=True)
    bundle = load(target) if target.exists() else {key: ledger[key] for key in (
        "version", "courseId", "courseSlug", "courseTitle", "sourceLanguage", "targetLanguage") if key in ledger}
    bundle.setdefault("errors", [])
    rest = [x for x in bundle.get("lectures", []) if str(x["id"]) != str(lecture["id"])]
    bundle["lectures"] = sorted(rest + [lecture], key=lambda x: int(x["lectureOrder"]))
    target.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("order", "next", "status", "started", "verify", "imported"))
    parser.add_argument("--course", help="Course ID; next defaults to the smallest unfinished course")
    parser.add_argument("--id", help="Lecture ID")
    parser.add_argument("--file", help="ChatGPT result JSON; may hold one lecture or a whole batch")
    parser.add_argument("--evidence", help="Observed Firefox import result, required to mark imported")
    parser.add_argument("--conversation")
    args = parser.parse_args()
    now = datetime.now(timezone.utc).isoformat()

    if args.action == "order":
        for item in courses():
            print(json.dumps(item, ensure_ascii=False))
        return
    if args.action == "next":
        order = [x for x in courses() if not args.course or str(x["courseId"]) == args.course]
        for course in order:
            ledger = load(ledger_path(course["courseId"]))
            lectures = sorted(ledger["lectures"], key=lambda x: int(x["lectureOrder"]),
                              reverse=ledger.get("processingDirection") == "descending")
            item = next((x for x in lectures
                         if x["status"] in ("pending", "translating")), None)
            if item:
                print(json.dumps({"courseId": course["courseId"], "courseTitle": course["title"], **item},
                                 ensure_ascii=False))
                return
        print("null")
        return

    if not args.course or str(args.course) in SKIP:
        parser.error("--course is required (React uses translation_queue.py)")
    path = ledger_path(args.course)
    ledger = load(path)
    lectures = ledger["lectures"]
    by_id = {str(x["lectureId"]): x for x in lectures}

    if args.action == "status":
        counts = {s: sum(x["status"] == s for x in lectures) for s in ("pending", "translating", "verified", "imported")}
        print(json.dumps({"courseId": ledger["courseId"], "videoCount": len(lectures), "counts": counts}, ensure_ascii=False))
        return
    if args.action == "verify":
        if not args.file:
            parser.error("--file is required")
        translated = load(args.file)
        ids = [str(x["id"]) for x in translated.get("lectures", [])]
        if args.id and ids != [args.id]:
            raise ValueError("Result must contain exactly the requested lecture")
        unknown = [i for i in ids if i not in by_id]
        if not ids or unknown:
            raise ValueError(f"Lectures not in this course ledger: {unknown or 'none supplied'}")
        for identity in ids:
            item = by_id[identity]
            source = load(item["sourceFile"])
            result = {**translated, "lectures": [x for x in translated["lectures"] if str(x["id"]) == identity]}
            verify(source, result)
            # Keep every source field (order, hash, title); only take the verified Chinese.
            lecture = source["lectures"][0]
            lecture["cues"] = [{**cue, "zh": new["zh"].strip()} for cue, new in zip(lecture["cues"], result["lectures"][0]["cues"])]
            target = store(args.course, ledger, lecture)
            item.update(status="verified", verified=True, translationFile=str(target.relative_to(ROOT)),
                        verifiedCues=len(lecture["cues"]), updatedAt=now)
            print(json.dumps({"lectureId": identity, "lectureOrder": item["lectureOrder"], "cues": len(lecture["cues"]),
                              "translationFile": item["translationFile"]}, ensure_ascii=False))
        save(path, ledger)
        return

    item = by_id.get(str(args.id))
    if not item:
        parser.error("Unknown lecture id")
    if args.action == "started":
        if item["status"] in ("verified", "imported"):
            parser.error("Already verified")
        item.update(status="translating", conversation=args.conversation)
    elif args.action == "imported":
        if item["status"] != "verified" or not args.evidence:
            parser.error("Verify first, then supply observed Firefox import evidence")
        item.update(status="imported", imported=True, importEvidence=args.evidence)
    item["updatedAt"] = now
    save(path, ledger)
    print(json.dumps(item, ensure_ascii=False))


if __name__ == "__main__":
    main()
