#!/usr/bin/env python3
"""QA work/chatgpt-<batch>/zh-*.json against the course ledger and source cues.

Checks per lecture: cue-count parity, cue-id sequence, empty values, simplified
characters, English left untranslated, and a cumulative length-drift check that
catches the failure mode `course_queue.py verify` cannot see (a translation
that stays the right length overall but drifts against the English partway).

Usage:
    python3 scripts/qa_zh_batch.py 5291332 work/chatgpt-q1 [--max-drift 2.5]
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

# The project's canonical Simplified / Japanese-kanji blacklist. Reused rather than
# re-listed: a second, hand-typed copy here already produced a false positive on
# 算/除, which are valid traditional characters.
from scan_simplified import FORBIDDEN  # noqa: E402


def simplified_chars(text):
    """Characters whose canonical Taiwanese form differs, ignoring self-maps."""
    return sorted({ch for ch in text if FORBIDDEN.get(ch, ch) != ch})


CJK = re.compile(r"[\u3400-\u9fff\u3040-\u30ff]")
LATIN_WORD = re.compile(r"[A-Za-z]{4,}")
# A cue may legitimately stay pure Latin when it is a preserved technical term
# ("markdown。", "hashtag，"). Only flag a Latin-only cue that actually reads like
# an English sentence, so the check catches untranslated prose instead.
STOPWORD = re.compile(r"\b(the|and|that|this|with|you|are|for|have|will|which|"
                      r"from|about|into|just|can|not|but|they|them|what|when)\b",
                      re.IGNORECASE)


def density(text):
    """CJK characters per unit of source length; used for drift detection."""
    return len(CJK.findall(text))


def drift_report(en_cues, zh_cues):
    """Return the worst cumulative-length drift position, or None.

    Both sides are compared in cumulative CJK-equivalent length: English is
    converted to an equivalent count so that a cue-by-cue translation keeps the
    two curves on top of each other. A large gap means the Chinese text is
    running ahead of or behind the English it is supposed to follow.
    """
    width = max(len(en_cues), len(zh_cues))
    worst, worst_at = 0.0, None
    en_run = zh_run = 0.0
    for i in range(width):
        if i < len(en_cues):
            en_run += density(en_cues[i]) or len(en_cues[i]) * 0.62
        if i < len(zh_cues):
            zh_run += density(zh_cues[i])
        if en_run > 0:
            gap = abs(zh_run - en_run) / en_run
            if gap > worst:
                worst, worst_at = gap, i + 1
    return worst, worst_at


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("course")
    ap.add_argument("batch", help="work/chatgpt-<batch> path")
    ap.add_argument("--max-drift", type=float, default=2.5)
    args = ap.parse_args()

    ledger = json.loads((ROOT / "data" / "courses" / args.course /
                         "translation-progress.json").read_text(encoding="utf-8"))
    items = {str(x["lectureId"]): x for x in ledger["lectures"]}

    batch = Path(args.batch)
    if not batch.is_absolute():
        batch = ROOT / batch
    files = sorted(batch.glob("zh-*.json"))
    if not files:
        raise SystemExit(f"no zh-*.json in {batch}")

    failures = 0
    total_cues = 0
    for path in files:
        for lid, cue_map in json.loads(path.read_text(encoding="utf-8")).items():
            item = items.get(str(lid))
            if item is None:
                print(f"FAIL {lid}: not in ledger")
                failures += 1
                continue
            source = json.loads(Path(item["sourceFile"]).read_text(encoding="utf-8"))
            cues = source["lectures"][0]["cues"]
            problems = []

            ids = [int(k) for k in cue_map]
            if sorted(ids) != [c["id"] for c in cues]:
                problems.append(f"cue-id mismatch ({len(ids)} vs {len(cues)})")
            empty = [k for k, v in cue_map.items() if not str(v).strip()]
            if empty:
                problems.append(f"empty {empty[:5]}")

            en = [str(c["en"]) for c in cues]
            zh = [str(cue_map.get(str(c["id"]), "")) for c in cues]
            bad_simp = sorted({ch for text in zh for ch in simplified_chars(text)})
            if bad_simp:
                problems.append(f"simplified/japanese {''.join(bad_simp)}")
            untranslated = [i + 1 for i, text in enumerate(zh)
                            if CJK.search(text) is None and STOPWORD.search(text)]
            if untranslated:
                problems.append(f"untranslated {untranslated[:8]}")

            drift, at = drift_report(en, zh)
            if drift > args.max_drift:
                problems.append(f"drift {drift:.2f} at cue {at}")

            status = item["status"]
            note = "" if status == "pending" else f" [{status}]"
            total_cues += len(cues)
            if problems:
                failures += 1
                print(f"FAIL order {item['lectureOrder']:>3} {lid}: {'; '.join(problems)}{note}")
            else:
                print(f"ok   order {item['lectureOrder']:>3} {lid} "
                      f"cues={len(cues)} drift={drift:.2f}{note}")

    print(f"\n{len(files)} files, {total_cues} cues, {failures} failing")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())