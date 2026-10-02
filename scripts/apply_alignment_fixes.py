"""Apply confirmed cue-alignment corrections (round 3 — boundaries re-derived
from the original HEAD data by reading full lecture context).

Only `zh` is changed; `en`, ids, start/end and sourceHash are preserved.

Operations:
  explicit : set one cue's zh to a reviewed translation (used at merge/split
             boundaries where a rotation alone is not exact).
  shift    : a contiguous run whose Chinese is uniformly offset by one cue.
             ahead  -> zh[i] currently holds the translation of en[i+1]
                       (new[i] = old[i-1] for i>s, new[s] = fresh)
             behind -> zh[i] currently holds the translation of en[i-1]
                       (new[i] = old[i+1] for i<e, new[e] = fresh)

A before/after record is written to data/import-reports/alignment-repairs.json.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# (cid, lid, cueId) -> reviewed zh
EXPLICIT = {
    # 1070124 / Adding a LocationPicker Component — cue 38 duplicated cue 37
    ("1070124", "13728162", 38):
        "我的整個 picker 邏輯，而在這個 div 裡，我想要一個 ion-button，上面寫著 select location",

    # 1362070 / Onwards to a new Project Setup — reordered 52-61 + duplicate at 61
    ("1362070", "35733894", 52): "你當然可以在那之後把它關掉，",
    ("1362070", "35733894", 53): "也就是用 Control + C，",
    ("1362070", "35733894", 54): "但你應該總是重新啟動那個後端伺服器，",
    ("1362070", "35733894", 55): "也就是在 backend-api 資料夾中，",
    ("1362070", "35733894", 56): "每當你想回去",
    ("1362070", "35733894", 57): "處理那個 react-frontend 時，",
    ("1362070", "35733894", 58): "因為那個前端之後",
    ("1362070", "35733894", 59): "必須能夠與那個後端溝通。",
    ("1362070", "35733894", 60): "而為此，後端伺服器",
    ("1362070", "35733894", 61): "必須啟動並運行中。",

    # 1436092 / What are (Local) Notifications? — merge at 32-34
    ("1436092", "31894908", 32): "當然，這可能不太合理",
    ("1436092", "31894908", 33): "傳送一則 Notification 給自己",
    ("1436092", "31894908", 34): "而且是立即送達的，",

    # 1708340 / Accepting & Passing Functions as Values — merge at 38 + split at 45-46
    ("1708340", "37131302", 38): "相反地，你還必須確保那個子層 widget，",
    ("1708340", "37131302", 39): "也就是應該發起 state 變更的那個，",
    ("1708340", "37131302", 46): "嗯，你可能還記得，在前一個課程段落裡",

    # 1708340 / Module Summary (responsive UI) — merge at 8
    ("1708340", "37143786", 8): "由該 widget 的父 widget 所套用，",

    # 1708340 / Finetuning Explicit Animations — merge at 49-51
    ("1708340", "37145102", 49): "而 drive 就只是讓我們能把我們的 animation",
    ("1708340", "37145102", 50): "從介於零和 1",

    # 1708340 / Module Summary (animations) — merge/reorder at 18-21
    ("1708340", "37145126", 18): "並將它轉換為不同的起始值與結束值，",
    ("1708340", "37145126", 19): "這是借助 Tween 做到的。",
    ("1708340", "37145126", 20): "我們甚至微調了動畫時長的分配。",
    ("1708340", "37145126", 21): "方法是加入這樣的 curve 設定。",
    ("1708340", "37145126", 22): "這就是加入明確動畫的方式。",

    # 1879018 / Writing First Deno Code — merge at 33
    ("1879018", "20342215", 33):
        "你想用 JavaScript 還是 TypeScript 來寫這段程式碼，都取決於你自己，",

    # 1879018 / An Example Node REST API — merge at 18
    ("1879018", "20342263", 18): "而且 API 越簡單、",
    ("1879018", "20342263", 19): "我們在那裡要做的工作越少，",

    # 3873464 / Getting Started with the "Share Meal" Form — duplicate at 34
    ("3873464", "41159756", 34): "而那是我們接下來要處理的內容。",
    ("3873464", "41159756", 35): "而在那之後，",
    ("3873464", "41159756", 36): "我們要確保這個表單可以被送出。",

    # 3873464 / Loading Unknown Images — merge at 58 + duplicate at 65
    ("3873464", "43341022", 58): "所以我們必須做的是，我們得前往",
    ("3873464", "43341022", 59): "這個 next.config 檔案，",
    ("3873464", "43341022", 60): "並且可以說是解鎖這個特定的外部網站，",
    ("3873464", "43341022", 61): "以允許從那裡載入圖片。",
    ("3873464", "43341022", 62): "而你只要在這裡加上 images 這個屬性，",
    ("3873464", "43341022", 63): "也就是加到這個設定物件上，",
    ("3873464", "43341022", 64): "並且把它設成一個物件就可以了。",
    ("3873464", "43341022", 65): "然後在裡面你可以加上 remotePatterns 設定，",

    # 3873464 / Adding Even More Components — duplicate at 121 + merge at 178
    ("3873464", "25146646", 121): "也就是簡寫語法，",
    ("3873464", "25146646", 178): "也就是我們在螢幕上使用的寬度，",

    # 3873464 / Granular Data Fetching With Suspense — split at 134-136
    ("3873464", "43340734", 134): "而這是因為技術上來說，Next.js",
    ("3873464", "43340734", 135): "當我們點擊某個月時，會重新算繪這個頁面，",
    ("3873464", "43340734", 136): "因為我們確實改變了路由參數，",
}

# (cid, lid, s, e, direction, fresh_text)
SHIFTS = [
    ("1436092", "31894908", 35, 44, "ahead", "但排定一則 Notification，"),
    ("1708340", "37131302", 40, 45, "ahead", "在這個案例裡，也就是 StartScreen widget，"),
    ("1708340", "37143786", 9, 30, "ahead", "也就是你正在使用 LayoutBuilder 的那個 widget。"),
    ("1708340", "37145102", 51, 152, "ahead", "轉換成介於另外兩個值之間的 animation。"),
    ("1708340", "37145126", 23, 48, "ahead", "而正如你所看到的，這當然"),
    ("1879018", "20342215", 34, 100, "ahead", "也就是用 JavaScript 或 TypeScript。"),
    ("1879018", "20342237", 41, 91, "ahead", "也就是可能已經發生的錯誤。"),
    ("1879018", "20342263", 20, 40, "ahead", "我們就越容易掌握這些差異，"),
    ("3873464", "25218788", 36, 130, "ahead", "給你的專案。"),
    ("3873464", "25146646", 122, 177, "behind", "但現在如果能限制一下寬度會更好，"),
    ("3873464", "43340734", 137, 217, "behind", "而現在你也知道如何使用這些工具了。"),
]


def load(cid):
    bundles = []
    for p in sorted((ROOT / "data/courses" / cid / "translations").glob("tw-*.json")):
        bundles.append((p, json.loads(p.read_bytes())))
    if not bundles:
        raise FileNotFoundError(cid)
    return bundles


def main():
    records = []
    changed_paths = set()
    files = {}
    for cid, lid, *_ in SHIFTS:
        files.setdefault(cid, load(cid))
    for cid, lid, cue in EXPLICIT:
        files.setdefault(cid, load(cid))

    def lecture(cid, lid):
        for path, bundle in files[cid]:
            for lec in bundle["lectures"]:
                if str(lec["id"]) == lid:
                    return path, bundle, lec
        raise KeyError((cid, lid))

    for (cid, lid, cue), new in EXPLICIT.items():
        path, bundle, lec = lecture(cid, lid)
        for c in lec["cues"]:
            if c["id"] == cue:
                old = c["zh"]
                c["zh"] = new
                changed_paths.add(path)
                records.append({"courseId": cid, "lectureId": lid, "cueId": cue,
                                "operation": "explicit", "en": c["en"], "old": old, "new": new})

    for cid, lid, s, e, direction, fresh in SHIFTS:
        path, bundle, lec = lecture(cid, lid)
        cues = lec["cues"]
        idx = {c["id"]: i for i, c in enumerate(cues)}
        old_zh = {c["id"]: c["zh"] for c in cues if s <= c["id"] <= e}
        for cueid in range(s, e + 1):
            i = idx[cueid]
            if direction == "ahead":
                new = old_zh[cueid - 1] if cueid > s else fresh
            else:  # behind
                new = old_zh[cueid + 1] if cueid < e else fresh
            if cues[i]["zh"] != new:
                records.append({"courseId": cid, "lectureId": lid, "cueId": cueid,
                                "operation": f"shift_{direction}", "en": cues[i]["en"],
                                "old": cues[i]["zh"], "new": new})
                cues[i]["zh"] = new
                changed_paths.add(path)

    written = {}
    for cid, bundles in files.items():
        for path, bundle in bundles:
            if path in changed_paths:
                path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2))
                written.setdefault(cid, []).append(str(path.relative_to(ROOT)))

    out = ROOT / "data/import-reports/alignment-repairs.json"
    out.write_text(json.dumps({
        "appliedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "Confirmed cue-alignment defects (round 3, boundaries re-derived); "
                 "zh changed, all other fields preserved.",
        "changedCues": len(records),
        "lectures": sorted({(r["courseId"], r["lectureId"]) for r in records}),
        "files": written,
        "records": records,
    }, ensure_ascii=False, indent=2) + "\n")
    print("changed cues:", len(records))
    for cid, lid in sorted({(r["courseId"], r["lectureId"]) for r in records}):
        n = sum(1 for r in records if r["courseId"] == cid and r["lectureId"] == lid)
        print(f"  {cid}/{lid}: {n}")
    print(out)


if __name__ == "__main__":
    main()
