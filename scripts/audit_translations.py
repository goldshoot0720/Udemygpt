"""Structural audit: compare every course's translated bundles against the
English source. Verifies, per lecture: cue count, cue ids, `en`, `start`,
`end` and `sourceHash`; and that no Chinese string is empty.

Writes data/import-reports/translation-quality-audit.json. Does NOT grant
semantic approval.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSES = ROOT / "data/courses"


def load_source(course_dir):
    p = next(course_dir.glob("English-course-*.json"))
    return json.loads(p.read_bytes())


def load_translations(course_dir):
    out = {}
    for path in sorted((course_dir / "translations").glob("*.json")):
        bundle = json.loads(path.read_bytes())
        for lec in bundle.get("lectures", []):
            out.setdefault(str(lec["id"]), []).append(lec)
    return out


def main():
    report = []
    t_lect = t_cues = 0
    for course_dir in sorted(p for p in COURSES.iterdir() if p.is_dir()):
        cid = course_dir.name
        if not cid.isdigit():
            continue
        src = load_source(course_dir)
        tr = load_translations(course_dir)
        src_ids = [str(l["id"]) for l in src["lectures"]]
        dup_tr = {k: v for k, v in tr.items() if len(v) > 1}
        structural = True
        empty_zh = 0
        matched = 0
        cues = 0
        src_by_id = {str(l["id"]): l for l in src["lectures"]}
        for lid in src_ids:
            if lid not in tr:
                continue
            matched += 1
            s = src_by_id[lid]
            t = tr[lid][0]
            ok = (len(s["cues"]) == len(t["cues"])
                  and s.get("sourceHash") == t.get("sourceHash")
                  and all(a["id"] == b["id"] and a["en"] == b["en"]
                          and a["start"] == b["start"] and a["end"] == b["end"]
                          for a, b in zip(s["cues"], t["cues"])))
            if not ok:
                structural = False
            for b in t["cues"]:
                if not str(b.get("zh", "")).strip():
                    empty_zh += 1
            cues += len(t["cues"])
        t_lect += matched
        t_cues += cues
        report.append({
            "courseId": int(cid),
            "lecturesTotal": len(src["lectures"]),
            "lecturesTranslated": matched,
            "cues": cues,
            "structural": structural,
            "emptyZh": empty_zh,
            "duplicateLectureIds": sorted(dup_tr),
        })
        print(f"{cid}: {matched}/{len(src['lectures'])} lectures; {cues} cues; "
              f"structural={structural}; emptyZh={empty_zh}")
    print(f"Total: {t_lect} lectures; {t_cues} cues. Semantic approval: not established.")
    out = ROOT / "data/import-reports/translation-structural-audit.json"
    out.write_text(json.dumps({
        "scope": "Per-lecture structural comparison of translations against the English source.",
        "courses": report,
        "totals": {"lectures": t_lect, "cues": t_cues},
    }, ensure_ascii=False, indent=2) + "\n")
    print(out)


if __name__ == "__main__":
    main()
