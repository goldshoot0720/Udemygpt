"""Heuristic misalignment scanner.

For every cue, extract technical ASCII tokens (identifiers, API names, numbers)
from the English line, then compare how many of them appear in the Chinese of
the SAME cue versus the neighbouring cues. If a cue's English tokens land more
in zh[i-1] (shift_bwd) or zh[i+1] (shift_fwd), flag it.

This is a CANDIDATE list only: normal clause reordering, ASR typos and code
identifiers all produce false positives. It is not an error count.

Writes data/import-reports/misalignment-scan.json.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKEN = re.compile(r"[A-Za-z][A-Za-z0-9_.\-]*")
STOP = set("the a an and or of to in on for is are was were be been it its this that with as at by you we i if so but not do does can could would should will shall may might have has had from your our their".split())


def tokens(text):
    out = set()
    for m in TOKEN.findall(text or ""):
        t = m.lower()
        if t in STOP or len(t) < 3:
            continue
        out.add(t)
    return out


def main():
    lectures = []
    detail = []
    for cdir in sorted((ROOT / "data/courses").glob("*/translations")):
        cid = cdir.parent.name
        for p in sorted(cdir.glob("*.json")):
            bundle = json.loads(p.read_bytes())
            for lec in bundle.get("lectures", []):
                cues = lec.get("cues", [])
                if len(cues) < 3:
                    continue
                en = [tokens(c.get("en", "")) for c in cues]
                zh = [(c.get("zh", "") or "").lower() for c in cues]
                flags = []
                for i in range(len(cues)):
                    et = en[i]
                    if not et:
                        continue
                    here = sum(1 for t in et if t in zh[i])
                    prev = sum(1 for t in et if i > 0 and t in zh[i - 1])
                    nxt = sum(1 for t in et if i + 1 < len(cues) and t in zh[i + 1])
                    best = max(here, prev, nxt)
                    if best == 0:
                        continue
                    if prev > here and prev >= nxt:
                        flags.append([cues[i]["id"], "shift_bwd", sorted(et), cues[i]["en"], cues[i].get("zh", "")])
                    elif nxt > here and nxt > prev:
                        flags.append([cues[i]["id"], "shift_fwd", sorted(et), cues[i]["en"], cues[i].get("zh", "")])
                if flags:
                    lectures.append([cid, str(lec["id"]), lec.get("title", ""), len(flags)])
                    if len(detail) < 60:
                        detail.append([cid, str(lec["id"]), lec.get("title", ""), flags[:8]])
    out = ROOT / "data/import-reports/misalignment-scan.json"
    out.write_text(json.dumps({
        "scope": "Heuristic cue-misalignment candidates (technical-token placement). "
                 "High false-positive rate; NOT an error count.",
        "flaggedLectures": len(lectures),
        "flaggedCues": sum(l[3] for l in lectures),
        "lectures": lectures,
        "detail": detail,
    }, ensure_ascii=False, indent=2) + "\n")
    print("flagged lectures:", len(lectures), "flagged cues:", sum(l[3] for l in lectures))
    print(out)


if __name__ == "__main__":
    main()
