"""Checkpoint the online ChatGPT subtitle workflow. Never calls a translation model."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from prepare_batches import load, verify

ROOT = Path(__file__).resolve().parent
COURSE = ROOT / "data/courses/1362070"
LEDGER = COURSE / "translation-progress.json"


def save(value):
    temp = LEDGER.with_suffix(".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(LEDGER)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("next", "status", "started", "verify", "imported", "notified"))
    parser.add_argument("--id")
    parser.add_argument("--file")
    parser.add_argument("--evidence", help="Observed Firefox import result, required to mark imported")
    parser.add_argument("--conversation")
    args = parser.parse_args()
    ledger = load(LEDGER)
    lectures = ledger["lectures"]
    if args.action == "status":
        counts = {status: sum(x["status"] == status for x in lectures)
                  for status in ("pending", "translating", "verified", "imported")}
        print(json.dumps({"videoCount": len(lectures), "counts": counts,
                          "awaitingNotification": [x["id"] for x in lectures
                                                   if x["status"] == "imported" and not x["notified"]]}, ensure_ascii=False))
        return
    if args.action == "next":
        item = next((x for x in lectures if x["status"] != "imported"), None)
        print(json.dumps(item, ensure_ascii=False))
        return
    item = next((x for x in lectures if x["id"] == args.id), None)
    if not item:
        parser.error("Unknown lecture id")
    if args.action == "started":
        if item["status"] == "imported":
            parser.error("Already imported")
        item.update(status="translating", conversation=args.conversation)
    elif args.action == "verify":
        if not args.file:
            parser.error("--file is required")
        source, translated = load(item["sourceFile"]), load(args.file)
        if verify(source, translated) != {args.id}:
            raise ValueError("Result must contain exactly the requested lecture")
        order = int(item["lectureOrder"])
        start = (order - 1) // 50 * 50 + 1
        target = COURSE / "translations" / f"tw-{start:03d}-{start + 49:03d}.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        bundle = load(target) if target.exists() else {"version": 1, "courseId": 1362070,
            "sourceLanguage": "en", "targetLanguage": "zh-TW", "lectures": [], "errors": []}
        lecture = translated["lectures"][0]
        order_of = {str(x["id"]): int(x.get("lectureOrder", 0)) for x in lectures}
        bundle["lectures"] = [l for l in bundle["lectures"] if str(l["id"]) != str(lecture["id"])] + [lecture]
        bundle["lectures"].sort(key=lambda l: order_of.get(str(l["id"]), 0))
        target.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
        item.update(status="verified", translationFile=str(target), verifiedCues=len(lecture["cues"]))
    elif args.action == "imported":
        if item["status"] != "verified" or not args.evidence:
            parser.error("Verify first, then supply observed Firefox import evidence")
        item.update(status="imported", importEvidence=args.evidence)
    elif args.action == "notified":
        if item["status"] != "imported":
            parser.error("Cannot announce an incomplete lecture")
        item["notified"] = True
    item["updatedAt"] = datetime.now(timezone.utc).isoformat()
    save(ledger)
    print(json.dumps(item, ensure_ascii=False))


if __name__ == "__main__":
    main()
