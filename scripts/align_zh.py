#!/usr/bin/env python3
"""Split one continuous Chinese translation into exactly N cues.

Translating cue-by-cue over a few hundred cues reliably drifts: the writer
compresses some sentences and expands others, so by the end of a lecture the
Chinese no longer lines up with the English (and `course_queue.py verify` cannot
see it, because it only compares counts and hashes).

This tool removes that failure mode. A worker translates the lecture as one
connected passage, and this script cuts the result into the cue count using
dynamic programming: every piece stays near its proportional share, no latin
token is cut in half, and the text is always consumed exactly once.

Usage:
    python3 scripts/align_zh.py work/chatgpt-k3/input.json <lectureId> full-50149041.txt
"""
import argparse
import json
import sys
from pathlib import Path

PUNCT = "。，、：；？！「」…⋯"
CLOSERS = "」』）)]"

# Letters, digits and the characters that stay inside one latin token
# (hyphenated words, paths, quoted literals, snake_case names).
TOKEN_CHARS = set(
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    "-_./'#:"
)


def valid_breaks(zh):
    """Offsets that never cut a latin token into two pieces."""
    n = len(zh)
    forbidden = set()
    i = 0
    while i < n:
        if zh[i] in TOKEN_CHARS:
            j = i
            while j < n and zh[j] in TOKEN_CHARS:
                j += 1
            forbidden.update(range(i + 1, j))
            i = j
            continue
        i += 1
    return [p for p in range(1, n) if p not in forbidden]


def split_segments(zh, weights, window=60):
    """Split zh into len(weights) pieces proportional to each cue's weight."""
    n = len(weights)
    cands = valid_breaks(zh) + [len(zh)]
    m = len(cands)
    total = float(sum(max(w, 1) for w in weights))

    targets = []
    acc = 0.0
    for w in weights:
        acc += max(w, 1)
        targets.append(len(zh) * acc / total)

    INF = float("inf")
    dp = [[INF] * m for _ in range(n)]
    par = [[-1] * m for _ in range(n)]

    win = []
    for k in range(n):
        t = targets[k]
        win.append([j for j in range(m) if abs(cands[j] - t) <= window and j >= k])

    if not win[0]:
        win[0] = list(range(m))
    for j in win[0]:
        dp[0][j] = (cands[j] - targets[0]) ** 2

    for k in range(1, n):
        prev_idx, cur_idx = win[k - 1], win[k]
        if not prev_idx or not cur_idx:
            continue
        for j in cur_idx:
            best, bj = INF, -1
            for p in prev_idx:
                if p >= j:
                    break
                if dp[k - 1][p] == INF:
                    continue
                bonus = -12.0 if (j < m - 1 and zh[cands[j] - 1] in PUNCT) else 0.0
                c = dp[k - 1][p] + (cands[j] - targets[k]) ** 2 + bonus
                if c < best:
                    best, bj = c, p
            dp[k][j] = best
            par[k][j] = bj

    j_end = m - 1
    if dp[n - 1][j_end] == INF:
        for j in range(m - 1, -1, -1):
            if dp[n - 1][j] < INF:
                j_end = j
                break
        else:
            raise SystemExit('無法切分：中文長度不足以切成這麼多段。')

    pieces = []
    j = j_end
    for k in range(n - 1, -1, -1):
        pj = par[k][j]
        start = cands[pj] if pj >= 0 else 0
        pieces.append(zh[start:cands[j]])
        j = pj if pj >= 0 else 0
    pieces.reverse()

    assert len(pieces) == n, f'切出 {len(pieces)} 段，期望 {n} 段'
    assert ''.join(pieces) == zh, '中文全文未被完整消耗'
    return pieces


def trim(piece):
    """Keep a break that looks like a clause edge; otherwise accept a bare cut."""
    for char in CLOSERS:
        if piece.endswith(char):
            return piece
    if piece and piece[-1] in PUNCT:
        return piece
    return piece


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('input', help='batch input.json holding the English cues')
    parser.add_argument('lecture_id')
    parser.add_argument('translation', help='file holding the continuous Chinese translation')
    parser.add_argument('--out', help='output path; defaults to the batch directory')
    args = parser.parse_args()

    source = Path(args.input)
    cues = json.loads(source.read_text(encoding='utf-8'))[args.lecture_id]
    raw = Path(args.translation).read_text(encoding='utf-8').strip()
    # Subtitle cues are single lines: fold the translator's paragraph wrapping away.
    zh = ''.join(raw.split())
    if not zh:
        raise SystemExit('譯文檔案是空的。')

    pieces = split_segments(zh, [len(c['en']) for c in cues])
    empty = [i + 1 for i, p in enumerate(pieces) if not p.strip()]
    if empty:
        raise SystemExit(f'第 {empty} 段切出空字串，請把中文寫得比原文更完整後重跑。')

    out = Path(args.out) if args.out else source.parent / f'zh-{args.lecture_id}.json'
    payload = {args.lecture_id: {str(c['id']): trim(p) for c, p in zip(cues, pieces)}}
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{out}  {len(cues)} 段')
    print(f'中文 {len(zh)} 字 / 英文 {sum(len(c["en"]) for c in cues)} 字')
    return 0


if __name__ == '__main__':
    sys.exit(main())