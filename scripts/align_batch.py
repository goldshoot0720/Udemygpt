#!/usr/bin/env python3
"""Align and validate a batch of continuous translations by lecture order.

Wraps scripts/align_zh.py for the common case: a worker drops `full-<lectureId>.txt`
files next to a batch directory, and this turns them into `zh-<lectureId>.json`
without anyone hand-writing an input.json first. The English cues come straight
from the course ledger, so the batch file can never drift out of date.

Usage:
    python3 scripts/align_batch.py work/chatgpt-q1 74 83
    python3 scripts/align_batch.py work/redo          # every full-*.txt present
    python3 scripts/align_batch.py work/chatgpt-p5 --orders 119 120 121
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COURSE = ROOT / 'data/courses'
LEDGER = '{}/translation-progress.json'
QUEUE = '{}/lecture-queue'


def load(course, orders):
    ledger = json.loads((COURSE / course / 'translation-progress.json').read_text(encoding='utf-8'))
    wanted = {int(o) for o in orders} if orders else None
    return {
        int(x['lectureOrder']): x
        for x in ledger['lectures']
        if wanted is None or int(x['lectureOrder']) in wanted
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('batch', help='batch directory holding full-<lectureId>.txt')
    parser.add_argument('from_order', nargs='?', type=int)
    parser.add_argument('to_order', nargs='?', type=int)
    parser.add_argument('--orders', nargs='*', type=int, help='explicit lecture orders')
    parser.add_argument('--course', default='5291332')
    args = parser.parse_args()

    batch = Path(args.batch)
    if not batch.is_absolute():
        batch = ROOT / batch

    if args.orders:
        orders = args.orders
    elif args.from_order and args.to_order:
        orders = list(range(args.from_order, args.to_order + 1))
    else:
        orders = []
    ledger = load(args.course, orders)
    if not orders:
        orders = sorted(ledger)

    made, missing, failed = [], [], []
    for order in orders:
        lecture = ledger.get(order)
        if not lecture:
            missing.append((order, '台帳無此章'))
            continue
        lid = lecture['lectureId']
        full = batch / f'full-{lid}.txt'
        if not full.exists():
            missing.append((order, f'{lid} 尚無 full 檔'))
            continue
        source = COURSE / args.course / 'lecture-queue' / f"English-{order:03d}-{lid}.json"
        cues = json.loads(source.read_text(encoding='utf-8'))['lectures'][0]['cues']
        input_path = batch / 'input.json'
        payload = json.loads(input_path.read_text(encoding='utf-8')) if input_path.exists() else {}
        payload[lid] = [{'id': c['id'], 'en': c['en']} for c in cues]
        input_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        result = subprocess.run(
            [sys.executable, str(ROOT / 'scripts/align_zh.py'), str(input_path), lid, str(full)],
            capture_output=True, text=True)
        if result.returncode == 0:
            made.append((order, lid, len(cues)))
        else:
            failed.append((order, lid, (result.stderr or result.stdout).strip()[-120:]))

    for order, lid, count in made:
        print(f'  第{order:3d}堂 {lid}  {count} 段 OK')
    for order, lid, reason in failed:
        print(f'  第{order:3d}堂 {lid}  失敗：{reason}')
    for order, reason in missing:
        print(f'  第{order:3d}堂  {reason}')
    print(f'\n完成 {len(made)} 堂 / 失敗 {len(failed)} / 未完成 {len(missing)}')
    return 1 if failed or missing else 0


if __name__ == '__main__':
    sys.exit(main())