"""Scan zh-TW translations for mainland-China terminology that should use the
Taiwan terms required by ChatGPT-翻譯指令.md.

Reports every occurrence with context so substring false positives can be
reviewed (e.g. 「終端」inside the correct 「終端機」, 「進程」inside
「編碼進程式碼」, 「數組」inside 「變數組合」).
"""
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# mainland term -> recommended Taiwan term
TERMS = {
    "數組": "陣列", "對象": "物件", "函數": "函式", "變量": "變數",
    "字符串": "字串", "數據": "資料", "數據庫": "資料庫", "異步": "非同步",
    "緩存": "快取", "服務器": "伺服器", "接口": "介面", "源碼": "原始碼",
    "默認": "預設", "調用": "呼叫", "加載": "載入", "回調": "回呼",
    "循環": "迴圈", "打印": "列印", "進程": "行程", "線程": "執行緒",
    "終端": "終端機", "信息": "資訊", "視頻": "影片", "文件夾": "資料夾",
    "鏈接": "連結", "用戶": "使用者", "內存": "記憶體", "硬盤": "硬碟",
    "寬帶": "寬頻", "軟件": "軟體", "硬件": "硬體", "程序": "程式",
    "編程": "程式設計", "磁盤": "磁碟",
    "配置": "設定", "保存": "儲存", "刷新": "重新整理", "全局": "全域",
    "局部": "區域", "屏蔽": "遮蔽", "隊列": "佇列", "棧": "堆疊",
    "導入": "匯入", "導出": "匯出",
}
# terms whose mainland form is a strict substring of a correct Taiwan word
# and therefore need word-boundary-ish review rather than raw counts
RISKY = {"終端", "進程", "循環", "對象", "導入", "導出", "程序", "用戶", "局部", "保存"}


def main():
    counts = Counter()
    examples = defaultdict(list)
    for cdir in sorted((ROOT / "data/courses").glob("*/translations")):
        for p in sorted(cdir.glob("*.json")):
            bundle = json.loads(p.read_bytes())
            for lec in bundle.get("lectures", []):
                for c in lec.get("cues", []):
                    zh = c.get("zh", "")
                    for term in TERMS:
                        if term in zh:
                            counts[term] += 1
                            if len(examples[term]) < 3:
                                examples[term].append(
                                    {"course": cdir.parent.name, "lecture": lec["id"],
                                     "cue": c["id"], "zh": zh})
    print("term hits (raw, includes substring false positives):")
    for term, n in counts.most_common():
        flag = "  <- review (substring risk)" if term in RISKY else ""
        print(f"  {term} -> {TERMS[term]}: {n}{flag}")
        for ex in examples[term]:
            print(f"      {ex['course']}/{ex['lecture']} cue {ex['cue']}: {ex['zh'][:60]}")
    out = ROOT / "data/import-reports/term-scan.json"
    out.write_text(json.dumps({
        "terms": TERMS, "counts": counts,
        "examples": {k: v for k, v in examples.items()},
    }, ensure_ascii=False, indent=2) + "\n")
    print(out)


if __name__ == "__main__":
    main()
