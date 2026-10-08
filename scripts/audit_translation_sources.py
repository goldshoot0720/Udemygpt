"""Compare canonical translation bundles against per-lecture sources and ledger.

Reports structural validity separately from semantic approval. No translation
model is called and no source, translation, or progress file is modified.
"""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from prepare_batches import resolve_source


def compare(source, translation):
    errors = []
    for key in ('id', 'title', 'sourceHash'):
        if source.get(key) != translation.get(key):
            errors.append({'field': key})
    if len(source['cues']) != len(translation['cues']):
        errors.append({'field': 'cueCount'})
    for before, after in zip(source['cues'], translation['cues']):
        for key in ('id', 'start', 'end', 'en'):
            if before.get(key) != after.get(key):
                errors.append({'cueId': before['id'], 'field': key})
        if not isinstance(after.get('zh'), str) or not after['zh'].strip():
            errors.append({'cueId': before['id'], 'field': 'zh'})
    return errors


def audit(folder):
    ledger = json.loads((folder / 'translation-progress.json').read_text())
    expected = {str(l.get('lectureId', l.get('id'))): l for l in ledger['lectures']}
    translations, hashes, errors, duplicates = {}, {}, [], []
    for path in sorted((folder / 'translations').glob('*.json')):
        if not path.name.startswith('tw-') and folder.name != '2360566':
            continue
        raw = path.read_bytes()
        hashes[str(path.relative_to(ROOT))] = hashlib.sha256(raw).hexdigest()
        bundle = json.loads(raw)
        for key, value in [('version', 1), ('courseId', int(folder.name)), ('sourceLanguage', 'en'), ('targetLanguage', 'zh-TW')]:
            if bundle.get(key) != value:
                errors.append({'file': str(path.relative_to(ROOT)), 'field': key})
        for lecture in bundle.get('lectures', []):
            lid = str(lecture['id'])
            if lid in translations:
                duplicates.append(lid)
            translations[lid] = lecture
    missing = sorted(set(expected) - set(translations))
    extra = sorted(set(translations) - set(expected))
    for lid in sorted(set(expected) & set(translations)):
        item = expected[lid]
        source_path = resolve_source(item['sourceFile'])
        if not source_path.exists():
            errors.append({'lectureId': lid, 'field': 'sourceFile'})
            continue
        source = json.loads(source_path.read_text())['lectures'][0]
        errors.extend(dict(lectureId=lid, **e) for e in compare(source, translations[lid]))
        if item.get('cueCount', item.get('cues')) != len(source['cues']):
            errors.append({'lectureId': lid, 'field': 'ledgerCueCount'})
        for key, value in [('verifiedCues', len(source['cues'])), ('sourceHash', source.get('sourceHash'))]:
            if key in item and item[key] != value:
                errors.append({'lectureId': lid, 'field': 'ledger.' + key})
    return {'courseId': int(folder.name), 'expectedLectures': len(expected),
            'translatedLectures': len(set(expected) & set(translations)),
            'translatedCues': sum(len(translations[l]['cues']) for l in set(expected) & set(translations)),
            'missingLectures': missing, 'unexpectedLectures': extra, 'duplicateLectures': duplicates,
            'errors': errors, 'structuralPassed': not (missing or extra or duplicates or errors),
            'fullSemanticReviewPassed': False, 'translationFileSha256': hashes}


def main():
    rows = [audit(d) for d in sorted((ROOT / 'data/courses').iterdir()) if (d / 'translation-progress.json').exists()]
    report = {'auditedAt': datetime.now(timezone.utc).isoformat(),
              'scope': 'Canonical translated subtitles versus per-lecture English sources and ledger. Code/name/literal preservation requires contextual semantic review.',
              'fullSemanticReviewPassed': False,
              'allStructuralChecksPassed': all(r['structuralPassed'] for r in rows),
              'totalLectures': sum(r['translatedLectures'] for r in rows),
              'totalCues': sum(r['translatedCues'] for r in rows), 'courses': rows}
    path = ROOT / 'data/import-reports/translation-source-audit.json'
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    for row in rows:
        print(f"{row['courseId']}: {row['translatedLectures']}/{row['expectedLectures']}; errors={len(row['errors'])}; passed={row['structuralPassed']}")
    print(f"Total: {report['totalLectures']} lectures, {report['totalCues']} cues; semantic approval not established.")
    return 0 if report['allStructuralChecksPassed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
