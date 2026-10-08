#!/usr/bin/env python3
"""Turn a batch's zh-<lectureId>.json maps into importable result files.

align_batch.py produces {lectureId: {cueId: zh}}. The extension imports one
result file per lecture, so this copies the untouched queue file and fills only
the zh field — cue ids, timing, source text and hashes stay exactly as exported.

Usage:
    python3 scripts/apply_batch.py 2426224 work/chatgpt-v1 work/chatgpt-v2
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def apply(course, batch_dir):
    course_dir = ROOT / 'data/courses' / course
    ledger = json.loads((course_dir / 'translation-progress.json').read_text(encoding='utf-8'))
    index = {str(item['lectureId']): item for item in ledger['lectures']}
    results = course_dir / 'work/results'
    results.mkdir(parents=True, exist_ok=True)
    written = []
    for path in sorted(Path(batch_dir).glob('zh-*.json')):
        lecture_id = path.stem[len('zh-'):]
        entry = index.get(lecture_id)
        if not entry:
            print(f'  {lecture_id} 不在課程 {course} 的清單中，略過')
            continue
        source = json.loads(Path(entry['sourceFile']).read_text(encoding='utf-8'))
        lecture = source['lectures'][0]
        zh = json.loads(path.read_text(encoding='utf-8'))[lecture_id]
        missing = [cue['id'] for cue in lecture['cues'] if not str(zh.get(str(cue['id']), '')).strip()]
        if missing:
            print(f'  {lecture_id} 缺 {len(missing)} 段譯文（例如 cue {missing[:3]}），略過')
            continue
        lecture['cues'] = [dict(cue, zh=str(zh[str(cue['id'])]).strip()) for cue in lecture['cues']]
        source['errors'] = []
        out = results / f'result-{lecture_id}.json'
        out.write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        written.append((lecture_id, len(lecture['cues'])))
    total = sum(count for _, count in written)
    for lecture_id, count in written:
        print(f'  result-{lecture_id}.json（{count} 段）')
    print(f'{batch_dir}：寫出 {len(written)} 堂 / {total:,} 段')


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    course, batches = sys.argv[1], sys.argv[2:]
    for batch in batches:
        apply(course, batch)


if __name__ == '__main__':
    main()