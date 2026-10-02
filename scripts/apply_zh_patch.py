"""Apply reviewed zh corrections to translation bundles.

Patch file: JSON list of {"c": courseId, "l": lectureId, "id": cueId, "zh": newZh}
(optionally "old": expected current zh — the cue is refused if it differs).
Only `zh` changes; en/ids/timing/sourceHash and each file's trailing-newline
style are preserved. Every change is appended to the given record file.

Usage: python3 scripts/apply_zh_patch.py PATCH.json RECORD.json [--label TEXT]
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("patch")
    ap.add_argument("record")
    ap.add_argument("--label", default="")
    args = ap.parse_args()
    patch = json.loads(Path(args.patch).read_text())
    want = {}
    for p in patch:
        want.setdefault(str(p["c"]), {}).setdefault(str(p["l"]), {})[int(p["id"])] = p
    records, missing = [], {(str(p["c"]), str(p["l"]), int(p["id"])) for p in patch}
    for cid, lecs in want.items():
        for path in sorted((ROOT / "data/courses" / cid / "translations").glob("tw-*.json")):
            raw = path.read_text()
            bundle = json.loads(raw)
            changed = False
            for lec in bundle["lectures"]:
                fixes = lecs.get(str(lec["id"]))
                if not fixes:
                    continue
                for cue in lec["cues"]:
                    p = fixes.get(cue["id"])
                    if not p:
                        continue
                    missing.discard((cid, str(lec["id"]), cue["id"]))
                    if "old" in p and p["old"] != cue["zh"]:
                        raise SystemExit(f"stale patch {cid}/{lec['id']}#{cue['id']}: {cue['zh']!r}")
                    if not p["zh"].strip():
                        raise SystemExit(f"empty zh {cid}/{lec['id']}#{cue['id']}")
                    if p["zh"] != cue["zh"]:
                        records.append({"courseId": cid, "lectureId": str(lec["id"]), "cueId": cue["id"],
                                        "en": cue["en"], "old": cue["zh"], "new": p["zh"]})
                        cue["zh"] = p["zh"]
                        changed = True
            if changed:
                text = json.dumps(bundle, ensure_ascii=False, indent=2)
                path.write_text(text + ("\n" if raw.endswith("\n") else ""))
    if missing:
        raise SystemExit(f"cues not found: {sorted(missing)[:10]}")
    rec_path = Path(args.record)
    log = json.loads(rec_path.read_text()) if rec_path.exists() else {"batches": []}
    log["batches"].append({"appliedAt": datetime.now(timezone.utc).isoformat(),
                           "label": args.label, "changedCues": len(records), "records": records})
    log["changedCues"] = sum(b["changedCues"] for b in log["batches"])
    rec_path.write_text(json.dumps(log, ensure_ascii=False, indent=2) + "\n")
    print("changed cues:", len(records))


if __name__ == "__main__":
    main()
