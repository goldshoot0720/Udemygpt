#!/usr/bin/env python3
"""Apply confirmed cue-alignment corrections for course 5291332.

Same contract as scripts/apply_alignment_fixes.py: only `zh` changes; `en`, ids,
start/end and sourceHash are preserved. Every change is recorded in
data/import-reports/alignment-repairs-5291332.json.

Operations:
  explicit : set one cue's zh to a reviewed translation (merge/split boundaries).
  shift    : a contiguous run whose Chinese is uniformly offset by one cue.
             ahead  -> zh[i] currently holds the translation of en[i+1]
                       (new[i] = old[i-1] for i>s, new[s] = fresh)
             behind -> zh[i] currently holds the translation of en[i-1]
                       (new[i] = old[i+1] for i<e, new[e] = fresh)

`fresh` is the reviewed translation for the one cue that has no counterpart in
the current (shifted) run.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COURSE = "5291332"

# (lectureId, cueId) -> reviewed zh
EXPLICIT = {
    # 169 / Blending Images — cue 33 was left holding cue 32's Chinese by the
    # chained rotations; the reviewed translation of en[33] is restored here.
    ("37781138", 33): "用於你的私人或專業專案，",
}

# (lectureId, start, end, direction, fresh)
SHIFTS = [
    # 166 / Getting Inspired by Community Prompts — zh[39..84] each held the
    # translation of en[38..83]; 1..38 and 85..96 are already aligned.
    ("37781120", 39, 84, "behind", "而事實上，再看一次，"),

    # 164 / Exploring the Settings — corrective pass. The original run
    # zh[78..113] = en[77..112] was rotated twice before the idempotency guard
    # existed, so the stored zh now reads one cue ahead. Rotating back puts
    # zh[i] on en[i]; fresh is the reviewed translation of en[78].
    ("37781112", 78, 113, "ahead", "因此也都是基於這些最初的設定。"),

    # 169 / Blending Images — same corrective pass; fresh is en[11].
    ("37781138", 11, 33, "ahead", "而且我覺得與其讓它站在街道上，"),

    # 166 / Getting Inspired by Community Prompts — corrective pass. The guard
    # list was being overwritten instead of accumulated, so the "behind" run was
    # replayed once; rotating back puts zh[i] on en[i]. fresh is en[39].
    ("37781120", 39, 84, "ahead", "向你展示更多撰寫提示詞的方法，"),

    # 164 / Exploring the Settings — this lecture carried a second, independent
    # behind-run at 86..113 (zh[85] and zh[86] were duplicates). 114 re-aligns.
    ("37781112", 86, 113, "behind", "我們看過了許多選項，"),

    # 164 / Exploring the Settings — a third behind-run at 56..77, picked up on
    # the follow-up detector pass. 55 and 78 re-align.
    ("37781112", 56, 77, "behind", "仍然是基於這個最初的 prompt，"),

    # 164 / Exploring the Settings — residual behind-run at 79..85 left by the
    # earlier chained passes; 78 and 86 re-align. fresh is en[85].
    ("37781112", 79, 85, "behind", "這就是 low 的 stylize 等級。"),

    # 169 / Blending Images — a second behind-run at 17..32. Cue 33 already
    # carries the reviewed translation of en[33], so the run stops at 32 and
    # fresh is en[32].
    ("37781138", 17, 32, "behind", "並把它用在你的日常工作中，"),
]

# A (lectureId, start, end, direction) run is applied at most once. Rotations are
# not idempotent — re-running one would shift the run a second time — so the
# previous report is consulted before anything is written.
REPORT = ROOT / "data/import-reports/alignment-repairs-5291332.json"


def load():
    bundles = [(p, json.loads(p.read_text(encoding="utf-8")))
               for p in sorted((ROOT / "data/courses" / COURSE / "translations").glob("tw-*.json"))]
    if not bundles:
        raise FileNotFoundError(COURSE)
    return bundles


def main():
    bundles = load()
    changed = set()

    report = json.loads(REPORT.read_text(encoding="utf-8")) if REPORT.exists() else {}
    applied_runs = report.get("runs", [])
    applied = {(r["lectureId"], r["start"], r["end"], r["direction"]) for r in applied_runs}
    prior = list(report.get("records", []))
    records = []
    applied_now = 0

    def lecture(lid):
        for path, bundle in bundles:
            for lec in bundle["lectures"]:
                if str(lec["id"]) == lid:
                    return path, bundle, lec
        raise KeyError(lid)

    for (lid, cueid), new in EXPLICIT.items():
        path, _bundle, lec = lecture(lid)
        for c in lec["cues"]:
            if c["id"] == cueid:
                records.append({"lectureId": lid, "cueId": cueid, "operation": "explicit",
                                "en": c["en"], "old": c["zh"], "new": new})
                c["zh"] = new
                changed.add(path)
                applied_now += 1

    runs = list(applied_runs)
    for lid, s, e, direction, fresh in SHIFTS:
        key = (lid, s, e, direction)
        if key in applied:
            print(f"  skip {lid} {s}-{e} {direction} (already applied)")
            continue
        runs.append({"lectureId": lid, "start": s, "end": e, "direction": direction})
        path, _bundle, lec = lecture(lid)
        cues = lec["cues"]
        idx = {c["id"]: i for i, c in enumerate(cues)}
        old_zh = {c["id"]: c["zh"] for c in cues if s <= c["id"] <= e}
        for cueid in range(s, e + 1):
            i = idx[cueid]
            new = old_zh[cueid - 1] if (direction == "ahead" and cueid > s) else \
                  old_zh[cueid + 1] if (direction == "behind" and cueid < e) else fresh
            if cues[i]["zh"] != new:
                records.append({"lectureId": lid, "cueId": cueid, "operation": f"shift_{direction}",
                                "en": cues[i]["en"], "old": cues[i]["zh"], "new": new})
                cues[i]["zh"] = new
                changed.add(path)
                applied_now += 1

    written = {}
    for path, bundle in bundles:
        if path in changed:
            path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            written[str(path.relative_to(ROOT))] = True

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "appliedAt": datetime.now(timezone.utc).isoformat(),
        "courseId": COURSE,
        "scope": "Confirmed cue-alignment defects; zh changed, all other fields preserved.",
        "changedCues": len(records) + len(prior),
        "changedCuesThisRun": applied_now,
        "lectures": sorted({r["lectureId"] for r in records}),
        "files": sorted(written),
        "runs": runs,
        "records": prior + records,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("changed cues this run:", applied_now)
    for lid in sorted({r["lectureId"] for r in records}):
        print(f"  {lid}: {sum(1 for r in records if r['lectureId'] == lid)}")
    print(REPORT)


if __name__ == "__main__":
    main()