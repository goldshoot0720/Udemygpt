#!/usr/bin/env python3
"""Rank cue-shift candidates for a course into an actionable review worklist.

Consumes the JSON written by scripts/detect_shift.py and adds two independent
signals of its own:

  dup   — adjacent cues carrying identical Chinese. A shift by one almost always
          shows up here, because the duplicated pair is where the rotation lands.
  span  — the length of the widest flagged run in the lecture.

Both detector output and these signals are CANDIDATES, not error counts: normal
Chinese clause reordering, ASR splits and code identifiers all produce false
positives, and the shift detector flags both directions at the same window when
it is unsure. Lectures where every run is contradicted by a run of the opposite
direction in the same place are reported separately as low confidence.

Usage:
    python3 scripts/detect_shift.py . /tmp/shift.json 6
    python3 scripts/qc_shift_report.py COURSE_ID /tmp/shift.json
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def adjacent_duplicates(bundle_lectures):
    """Map lectureId -> count of adjacent cue pairs with identical Chinese."""
    out = {}
    for lec in bundle_lectures:
        zh = [str(c.get("zh", "")).strip() for c in lec["cues"]]
        hits = sum(1 for a, b in zip(zh, zh[1:]) if a and a == b)
        if hits:
            out[str(lec["id"])] = hits
    return out


def main():
    course, shift_path = sys.argv[1], sys.argv[2]
    course_dir = ROOT / "data/courses" / course
    ledger = json.loads((course_dir / "translation-progress.json").read_text(encoding="utf-8"))
    meta = {str(x["lectureId"]): x for x in ledger["lectures"]}

    rows = json.loads(Path(shift_path).read_text(encoding="utf-8"))
    if isinstance(rows, dict):
        rows = rows.get("results", [])

    lectures = []
    for path in sorted((course_dir / "translations").glob("tw-*.json")):
        lectures += json.loads(path.read_text(encoding="utf-8"))["lectures"]
    dup = adjacent_duplicates(lectures)

    by_lecture = defaultdict(list)
    for r in rows:
        by_lecture[r["l"]].append(r)

    findings = []
    for lid, regions in by_lecture.items():
        info = meta[lid]
        span = max(r["b"] - r["a"] for r in regions)
        # A window flagged in both directions at the same place means the
        # detector could not decide; treat it as noise rather than evidence.
        wins = defaultdict(set)
        for r in regions:
            wins[(r["a"], r["b"])].add(r["o"])
        contradicted = sum(1 for v in wins.values() if len(v) > 1)
        confidence = "low" if contradicted >= len(wins) / 2 else ("high" if span >= 8 or dup.get(lid) else "medium")
        findings.append({
            "lectureId": lid,
            "lectureOrder": int(info["lectureOrder"]),
            "title": info["title"],
            "cueCount": int(info["cueCount"]),
            "verifiedCues": info.get("verifiedCues"),
            "confidence": confidence,
            "widestRun": span,
            "adjacentDuplicatePairs": dup.get(lid, 0),
            "regions": [{"from": r["a"], "to": r["b"], "offset": r["o"], "score": round(r["m"], 1)}
                        for r in sorted(regions, key=lambda r: (r["a"], r["b"]))],
        })

    order = {"high": 0, "medium": 1, "low": 2}
    findings.sort(key=lambda f: (order[f["confidence"]], -f["widestRun"], -f["adjacentDuplicatePairs"]))

    out = {
        "courseId": course,
        "courseTitle": ledger.get("courseTitle"),
        "reviewedAt": None,
        "note": "Candidates only — each region needs human reading before repair. "
                "Rotate only when the run is uniform; merge/split boundaries need re-transcription.",
        "totals": {
            "verifiedLectures": sum(1 for x in ledger["lectures"] if x["status"] == "verified"),
            "flaggedLectures": len(findings),
            "byConfidence": {c: sum(1 for f in findings if f["confidence"] == c) for c in ("high", "medium", "low")},
        },
        "lectures": findings,
    }
    target = ROOT / "data/import-reports/cue-shift-candidates.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = [f"# 字幕錯位候選清單：{out['courseTitle']}（{course}）", "",
             f"已驗證 {out['totals']['verifiedLectures']} 堂；掃出 {out['totals']['flaggedLectures']} 堂候選"
             f"（高 {out['totals']['byConfidence']['high']}／中 {out['totals']['byConfidence']['medium']}"
             f"／低 {out['totals']['byConfidence']['low']}）。", "",
             "這是**候選**不是錯誤數量。位移檢查器在同一視窗同時標記 +1 與 -1 時代表它無法判斷，"
             "該堂列入低信心，通常是中文子句重排或識別字造成的誤判。", "",
             "修復方式：確認為整段等幅位移才可旋轉；合併或分割的邊界必須整段重譯。", "",
             "| 信心 | 堂次 | 標題 | 段數 | 最寬位移段 | 相鄰重複 | 區間 |",
             "| --- | --- | --- | --- | --- | --- | --- |"]
    for f in findings:
        regs = "、".join(f"{r['from']}–{r['to']}({'+' if r['offset'] > 0 else ''}{r['offset']})"
                         for r in f["regions"][:6])
        lines.append(f"| {f['confidence']} | {f['lectureOrder']} | {f['title']} | {f['cueCount']} | "
                     f"{f['widestRun']} | {f['adjacentDuplicatePairs']} | {regs} |")
    md = ROOT / "data/import-reports/cue-shift-candidates.md"
    md.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(json.dumps(out["totals"], ensure_ascii=False))
    print(target)
    print(md)


if __name__ == "__main__":
    main()