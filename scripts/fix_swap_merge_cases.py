"""Fix the 5 confirmed swap/merge misalignments (cue-level zh correction).

Only rewrites the zh field of specific cues; preserves en, timestamps, cue
ids and all other metadata. Verifies the current zh value before writing so
that concurrent changes are never silently overwritten (aborts a case on
mismatch).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def find_lecture(bundle, lid):
    for lec in bundle.get("lectures", []):
        if str(lec["id"]) == str(lid):
            return lec
    return None


def load_bundle(cid, lid):
    folder = ROOT / "data/courses" / str(cid) / "translations"
    for path in sorted(folder.glob("*.json")):
        if not path.name.startswith("tw-") and str(cid) != "2360566":
            continue
        bundle = json.loads(path.read_bytes())
        if find_lecture(bundle, lid) is not None:
            return path, bundle
    return None, None


# (courseId, lectureId, {cue_index: (expected_current_zh, new_zh)})
CASES = [
    (
        1436092, "31404654",
        {
            10: ("會看到如果要在原生 React Native app 中安裝它，",
                 "可以看到有一些額外的說明"),
            11: ("有一些額外的說明。",
                 "如果要在原生 React Native app 中安裝它的話，"),
        },
    ),
    (
        1879018, "11954324",
        {
            18: ("它們之所以叫 session cookie,只是因為只要你在目前的瀏覽器裡",
                 "它們之所以叫 session cookie,只是因為它們只在你使用那個頁面期間"),
            19: ("使用那個頁面,它們就還活著。",
                 "、在目前的瀏覽器中存活。"),
        },
    ),
    (
        756150, "6656574",
        {
            8: ("在你觀看這部影片時，",
                "它應該是 4 點多的時候"),
            9: ("它應該是 4 點多。",
                "在你觀看影片的那個時間點。"),
        },
    ),
    (
        2508942, "17206146",
        {
            6: ("我們最終需要的是一種方式，從外部傳入它是否應該可見的",
                "我們最終需要的是一種方式，來傳入這個是否應該可見的資訊"),
            7: ("資訊，",
                "、以及是否應該從外部傳入，"),
        },
    ),
    (
        1708340, "37131302",
        {
            29: ("而這是把 state 往上提升這個觀念裡",
                 "而那是另一個重要、"),
            30: ("另一個很重要、",
                 "但目前還缺少的部分，"),
            31: ("所以目前還缺少的一環。",
                 "也就是把 state 往上提升這個觀念裡的一環。"),
            34: ("它是 StartScreen 和 QuestionsScreen",
                 "它是"),
            35: ("兩者的父層 widget，",
                 "StartScreen 和 QuestionsScreen 兩者的父層 widget，"),
        },
    ),
]


def main():
    changed_files = set()
    errors = []
    for cid, lid, cue_map in CASES:
        path, bundle = load_bundle(cid, lid)
        if path is None:
            errors.append(f"{cid}/{lid}: bundle not found")
            continue
        lecture = find_lecture(bundle, lid)
        cues = lecture["cues"]
        for idx, (expected, new_zh) in sorted(cue_map.items()):
            if idx >= len(cues):
                errors.append(f"{cid}/{lid} cue {idx}: index out of range")
                continue
            current = (cues[idx].get("zh") or "").strip()
            if current != expected:
                errors.append(
                    f"{cid}/{lid} cue {idx}: current zh mismatch "
                    f"(got {current!r}, expected {expected!r}) - skipped"
                )
                continue
            cues[idx]["zh"] = new_zh
        path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n")
        changed_files.add(path)
        print(f"fixed {cid}/{lid}: {len(cue_map)} cues")
    print("changed files:", len(changed_files))
    for p in sorted(changed_files):
        print("  ", p.relative_to(ROOT))
    if errors:
        print("ERRORS:")
        for e in errors:
            print("  ", e)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
