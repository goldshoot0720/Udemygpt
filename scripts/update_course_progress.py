#!/usr/bin/env python3
"""Refresh the course progress documents from translation-progress.json.

Usage: python3 scripts/update_course_progress.py COURSE_ID
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def ranges(orders):
    """Collapse a sorted list of lecture orders into inclusive ranges."""
    out, start, previous = [], orders[0], orders[0]
    for value in orders[1:]:
        if value == previous + 1:
            previous = value
            continue
        out.append((start, previous))
        start = previous = value
    out.append((start, previous))
    return out


def bundles(folder):
    """Group verified lecture orders by the 50-lecture translation bundle they live in."""
    groups = {}
    for path in sorted(folder.glob('tw-*.json')):
        data = json.loads(path.read_text(encoding='utf-8'))
        if not data.get('lectures'):
            continue
        orders = sorted(int(item['lectureOrder']) for item in data['lectures'])
        groups[path.name] = (orders, sum(len(item['cues']) for item in data['lectures']))
    return groups


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    course = sys.argv[1]
    folder = ROOT / 'data/courses' / course
    ledger = json.loads((folder / 'translation-progress.json').read_text(encoding='utf-8'))
    lectures = ledger['lectures']
    done = sorted((item for item in lectures if item['status'] in ('verified', 'imported')),
                  key=lambda item: int(item['lectureOrder']))
    if not done:
        raise SystemExit('尚未有任何已驗證譯文')
    orders = [int(item['lectureOrder']) for item in done]
    cues = sum(item['cueCount'] for item in done)
    total_cues = sum(item['cueCount'] for item in lectures)
    title = ledger.get('courseTitle') or course
    # 課程原文不一定是英文：日文課的來源檔與描述都要跟著語言走。
    code = ledger.get('sourceLanguage') or 'en'
    source_word = {'ja': '日文', 'ko': '韓文', 'de': '德文', 'fr': '法文', 'es': '西班牙文',
                   'it': '義大利文', 'pt': '葡萄牙文', 'zh': '中文', 'zh-TW': '繁體中文'}.get(code, '英文')
    source_file = f'{ {"en": "English", "ja": "Japanese", "ko": "Korean", "de": "German", "fr": "French", "es": "Spanish", "it": "Italian", "pt": "Portuguese", "zh": "Chinese", "zh-TW": "TraditionalChinese"}.get(code, "Source") }-course-{course}.json'
    ranges_text = '、'.join(f'第 {a}–{b} 堂' if a != b else f'第 {a} 堂' for a, b in ranges(orders))

    (folder / 'README.md').write_text(f'''# {title}

課程 ID：`{course}`；[返回課程索引](../README.md)。

共 {len(lectures)} 堂影片、{total_cues:,} 段{source_word}字幕。

## 進度：{len(done)} 堂已驗證（{cues:,} 段，{cues / total_cues * 100:.1f}%）

已完成堂次區間：{ranges_text}。

全部譯文皆通過 `course_queue.py verify` 的段數、{source_word}原文與時間軸 SHA-256 檢查。

- [完整{source_word}來源]({source_file})
- [繁體中文譯文](translations/README.md)
- [翻譯與匯入進度](translation-progress.json)
- [課程清單](curriculum.json)

## 檔案結構

`lecture-queue/` 保存逐堂{source_word}；`chatgpt-batches/` 保存待翻譯的{source_word}批次；
`translations/` 保存中文譯文（每 50 堂一個 `tw-起始-結束.json`）；`imports/` 保留本機原始下載備份。
''', encoding='utf-8')

    lines = [f'# {title}：繁體中文譯文', '', '[返回課程資料](../README.md)。', '',
             f'在本課程的播放器設定按「匯入中英雙語字幕」，選取此資料夾中的 JSON。課程 ID 必須為 `{course}`；',
             '進度以 [translation-progress.json](../translation-progress.json) 為準。', '', '目前的譯文檔案：', '']
    for name, (bundle_orders, bundle_cues) in bundles(folder / 'translations').items():
        if not bundle_orders:
            continue
        text = '、'.join(f'第 {a}–{b} 堂' if a != b else f'第 {a} 堂' for a, b in ranges(bundle_orders))
        lines.append(f'- `{name}`：{text}已驗證（{bundle_cues:,} 段）。')
    lines += ['', f'合計 {len(done)} 堂、{cues:,} 段已通過 SHA-256 驗證，全課 {len(lectures)} 堂尚在翻譯中。',
              '中英雙語特效字幕由 `export_ass.py` 產生，放在 `subtitles-ass/`（不加入 Git）。', '']
    (folder / 'translations/README.md').write_text('\n'.join(lines), encoding='utf-8')

    index = ROOT / 'data/courses/README.md'
    text = index.read_text(encoding='utf-8')
    import re
    text = re.sub(r'(\| \[ChatGPT & Generative AI[^\n]*?\| 5291332 \| )\d+( \| )\d+（[^）]*）',
                  lambda m: f'{m.group(1)}{len(lectures)}{m.group(2)}{len(done)}（翻譯中）', text)
    text = re.sub(r'第 14 門 ChatGPT & Generative AI（\d+ 堂）已完成 \d+ 堂、[\d,]+ 段（[\d.]+%）',
                  f'第 14 門 ChatGPT & Generative AI（{len(lectures)} 堂）已完成 {len(done)} 堂、{cues:,} 段（{cues / total_cues * 100:.1f}%）',
                  text)
    index.write_text(text, encoding='utf-8')
    print(f'{title}：{len(done)} 堂 / {cues:,} 段（{cues / total_cues * 100:.1f}%），文件已更新')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())