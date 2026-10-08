#!/usr/bin/env python3
"""Import an exported Udemy subtitle dump as a new translation course.

The extension writes one JSON per course. Version 2.7.10 and later name the
file after the course language (English / Japanese / …) and record the real
sourceLanguage; earlier exports hard-coded "en", so --source-language can
correct a dump whose filename says English but whose cues are Japanese.

Usage:
  python3 scripts/import_course_export.py DUMP.json [--source-language ja]
                                          [--slug vue-js-complete-guide]
                                          [--title "…"]
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SLUGS = {
    'en': 'English', 'ja': 'Japanese', 'ko': 'Korean', 'de': 'German', 'fr': 'French',
    'es': 'Spanish', 'it': 'Italian', 'pt': 'Portuguese', 'zh-TW': 'TraditionalChinese',
    'zh': 'Chinese',
}


def pad(value, width=3):
    return str(value).zfill(width)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('dump', type=Path)
    parser.add_argument('--source-language', help='correct a mislabelled sourceLanguage, e.g. ja')
    parser.add_argument('--slug', help='course slug when the dump only carries the slug folder name')
    parser.add_argument('--title', help='human readable course title')
    args = parser.parse_args()

    dump = json.loads(args.dump.read_text(encoding='utf-8'))
    course_id = str(dump['courseId'])
    code = args.source_language or dump.get('sourceLanguage') or 'en'
    slug = args.slug or dump.get('courseSlug') or ''
    title = args.title or dump.get('courseTitle') or slug or course_id
    folder = ROOT / 'data/courses' / course_id
    if (folder / 'translation-progress.json').exists():
        raise SystemExit(f'{course_id} 已經存在，先確認再匯入')
    lectures = sorted(dump['lectures'], key=lambda item: item.get('videoOrder') or 0)
    if not lectures:
        raise SystemExit('匯出檔沒有任何 lecture')

    queue = folder / 'lecture-queue'
    (queue).mkdir(parents=True)
    (folder / 'translations').mkdir()
    (folder / 'work' / 'results').mkdir(parents=True)
    source_name = f'{SLUGS.get(code, "Source")}-course-{course_id}.json'
    (folder / source_name).write_text(json.dumps(dump, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (folder / 'curriculum.json').write_text(
        json.dumps(dump.get('curriculum', []), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    entries = []
    for order, lecture in enumerate(lectures, 1):
        queue_name = f'{SLUGS.get(code, "Source")}-{pad(order)}-{lecture["id"]}.json'
        single = {key: dump.get(key) for key in
                  ('version', 'courseId', 'courseSlug', 'courseTitle', 'targetLanguage')}
        single['sourceLanguage'] = code
        single['lectures'] = [{key: value for key, value in lecture.items() if key != 'sourceLanguage'}
                              | {'sourceLanguage': code}]
        (queue / queue_name).write_text(json.dumps(single, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        entries.append({
            'lectureId': str(lecture['id']), 'title': lecture.get('title', ''),
            'lectureOrder': lecture.get('lectureOrder') or order,
            'videoOrder': lecture.get('videoOrder') or order,
            'cueCount': len(lecture['cues']), 'sourceHash': lecture.get('sourceHash', ''),
            'sourceFile': str(queue / queue_name), 'status': 'pending',
        })

    ledger = {'version': 1, 'courseId': int(course_id), 'courseSlug': slug, 'courseTitle': title,
              'sourceLanguage': code, 'targetLanguage': 'zh-TW', 'lectures': entries}
    (folder / 'translation-progress.json').write_text(
        json.dumps(ledger, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    errors = dump.get('errors', [])
    print(f'{title}（{course_id}，{code}）')
    print(f'  來源：{source_name}')
    print(f'  影片：{len(lectures)} 堂 / {sum(len(l["cues"]) for l in lectures):,} 段'
          + (f'；{len(errors)} 堂缺少字幕' if errors else ''))
    if errors:
        print('  缺字幕：' + '、'.join(str(item.get('title') or item.get('id')) for item in errors[:6])
              + ('…' if len(errors) > 6 else ''))
    print(f'  下一堂：python3 course_queue.py next --course {course_id}')


if __name__ == '__main__':
    main()