"""Verify the applied alignment fixes.

1. Only `zh` changed vs HEAD (en/ids/start/end/sourceHash preserved).
2. Boundary regions of every fixed lecture read correctly.
3. Corpus-wide: no adjacent cues with identical zh but different en
   (the low-false-positive signature of this defect class).
"""
import json
import subprocess
from pathlib import Path

ROOT = Path("/Users/feng33/Documents/Udemygpt")
LECTS = [
    ("1070124", "13728162"), ("1362070", "35733894"), ("1436092", "31894908"),
    ("1708340", "37131302"), ("1708340", "37143786"), ("1708340", "37145102"),
    ("1708340", "37145126"), ("1879018", "20342215"), ("1879018", "20342237"),
    ("1879018", "20342263"), ("3873464", "25146646"), ("3873464", "25218788"),
    ("3873464", "41159756"), ("3873464", "43340734"), ("3873464", "43341022"),
]


def work_lec(cid, lid):
    for p in sorted((ROOT / "data/courses" / cid / "translations").glob("tw-*.json")):
        for lec in json.loads(p.read_bytes())["lectures"]:
            if str(lec["id"]) == lid:
                return lec
    raise KeyError((cid, lid))


def head_lec(cid, lid):
    for p in sorted((ROOT / "data/courses" / cid / "translations").glob("tw-*.json")):
        raw = subprocess.run(["git", "show", f"HEAD:{p.relative_to(ROOT)}"],
                             cwd=ROOT, capture_output=True, text=True, check=True).stdout
        for lec in json.loads(raw)["lectures"]:
            if str(lec["id"]) == lid:
                return lec
    raise KeyError((cid, lid))


print("== 1. integrity (only zh changed vs HEAD) ==")
total_zh = 0
for cid, lid in LECTS:
    h, w = head_lec(cid, lid), work_lec(cid, lid)
    assert h["title"] == w["title"] and h["sourceHash"] == w["sourceHash"]
    assert len(h["cues"]) == len(w["cues"])
    n = 0
    for a, b in zip(h["cues"], w["cues"]):
        assert a["id"] == b["id"] and a["en"] == b["en"]
        assert a["start"] == b["start"] and a["end"] == b["end"]
        n += a["zh"] != b["zh"]
    total_zh += n
    print(f"  {cid}/{lid}: OK zh-changed={n}")
print(f"  total zh changed = {total_zh}")

print("== 2. boundary spot checks ==")
for cid, lid, lo, hi in [
    ("1708340", "37143786", 7, 11), ("1708340", "37145126", 17, 23),
    ("1708340", "37145102", 49, 52), ("1879018", "20342215", 33, 35),
    ("1879018", "20342237", 40, 42), ("1879018", "20342263", 18, 21),
    ("3873464", "25218788", 35, 37), ("3873464", "25146646", 120, 122),
    ("3873464", "43340734", 135, 137), ("3873464", "43341022", 58, 61),
    ("1436092", "31894908", 32, 35), ("1708340", "37131302", 38, 40),
    ("3873464", "41159756", 34, 36), ("1070124", "13728162", 37, 38),
    ("1362070", "35733894", 54, 56),
]:
    lec = work_lec(cid, lid)
    print(f"  -- {cid}/{lid} --")
    for c in lec["cues"]:
        if lo <= c["id"] <= hi:
            print(f"    {c['id']:>4}| {c['en']}\n        | {c['zh']}")

print("== 3. corpus-wide adjacent-duplicate(zh same, en differs) ==")
hits = 0
for cdir in sorted((ROOT / "data/courses").glob("*/translations")):
    for p in sorted(cdir.glob("tw-*.json")):
        for lec in json.loads(p.read_bytes())["lectures"]:
            cs = lec["cues"]
            hits += sum(1 for i in range(len(cs) - 1)
                        if cs[i]["zh"] == cs[i + 1]["zh"] and cs[i]["en"] != cs[i + 1]["en"])
print(f"  remaining adjacent-duplicate pairs: {hits}")
print("VERIFY DONE")
