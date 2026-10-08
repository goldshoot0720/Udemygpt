#!/usr/bin/env python3
"""Flag translated lectures whose cues have drifted out of alignment.

`course_queue.py verify` proves the cue count, the English text and the timing
are untouched; it cannot see that cue 71 shows the translation of cue 73. That
is the failure that survives every structural check and reaches the viewer.

The detector compares each cue's Chinese length with its share of the lecture's
total length and accumulates the difference. In an aligned lecture the running
total oscillates around zero; in a drifting one it wanders off and only returns
to zero at the very end. The peak excursion, measured in average cue lengths, is
therefore a direct measure of how far the text has slipped.

Usage:
    python3 scripts/detect_drift.py 5291332            # flag only
    python3 scripts/detect_drift.py 5291332 --limit 2  # show the worst cues
"""
import argparse
import json
import sys
from pathlib import Path


def drift(cues, zh):
    total_en = sum(len(cue['en']) for cue in cues) or 1
    total_zh = sum(len(zh.get(str(cue['id']), '')) for cue in cues) or 1
    ratio = total_zh / total_en
    average = total_zh / max(len(cues), 1)

    running = 0.0
    peak = 0.0
    peak_at = 1
    for index, cue in enumerate(cues, start=1):
        expected = len(cue['en']) * ratio
        running += len(zh.get(str(cue['id']), '')) - expected
        if abs(running) > abs(peak):
            peak, peak_at = running, index
    return abs(peak) / max(average, 1), peak_at, len(cues)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('course')
    parser.add_argument('--threshold', type=float, default=4.0,
                        help='peak excursion in average cue lengths before flagging (default 4)')
    parser.add_argument('--limit', type=int, default=0, help='print this many flagged cues')
    args = parser.parse_args()

    course_dir = Path('data/courses') / args.course
    ledger = json.loads((course_dir / 'translation-progress.json').read_text(encoding='utf-8'))
    flagged = []
    checked = 0

    for lecture in ledger['lectures']:
        if lecture.get('status') != 'verified':
            continue
        result = course_dir / 'work' / 'results' / f"result-{lecture['lectureId']}.json"
        # 佇列檔名跟著該課原始語言（English-*／Japanese-*），且編號未必等於
        # lectureOrder，所以一律走台帳記錄的 sourceFile。
        source = Path(lecture['sourceFile'])
        if not result.exists() or not source.exists():
            continue
        data = json.loads(result.read_text(encoding='utf-8'))
        entries = data['lectures'][0]['cues'] if 'lectures' in data else data.get('cues', [])
        zh = {str(cue['id']): cue.get('zh', '') for cue in entries}
        cues = json.loads(source.read_text(encoding='utf-8'))['lectures'][0]['cues']
        if not zh or len(zh) != len(cues):
            continue
        checked += 1
        offset, at, count = drift(cues, zh)
        if offset > args.threshold:
            flagged.append((offset, lecture['lectureOrder'], lecture['lectureId'], lecture['title'], at, count, cues, zh))

    flagged.sort(reverse=True)
    print(f'檢查 {checked} 堂已驗證譯文，偏移門檻 {args.threshold} 段')
    if not flagged:
        print('沒有發現累積錯位。')
        return 0
    print(f'發現 {len(flagged)} 堂可能有累積錯位：')
    for offset, order, lid, title, at, count, _, _ in flagged[:40]:
        print(f'  第{order:3d}堂 {lid}  偏移 {offset:.1f} 段（第 {at}/{count} 段）  {title[:40]}')

    if args.limit:
        print('\n逐段對照：')
        for offset, order, lid, _, at, count, cues, zh in flagged[:args.limit]:
            print(f'\n第{order}堂 {lid}（偏移 {offset:.1f} 段，峰值在第 {at}/{count} 段）')
            for index in range(max(1, at - 3), min(count, at + 3) + 1):
                cue = cues[index - 1]
                print(f'  [{index:3d}] EN: {cue["en"][:70]}')
                print(f'        ZH: {zh[str(cue["id"])][:34]}')
    return 1


if __name__ == '__main__':
    sys.exit(main())