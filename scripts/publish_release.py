#!/usr/bin/env python3
"""Build, sign, commit, push and publish a GitHub Release in one command.

The chain is strictly ordered so a failure never leaves a half-published release:
    1. run every test in tests/
    2. build all browser packages into dist/v版本/ (scripts/build_release.py)
    3. require BOTH udemy-bilingual-firefox-版本-unsigned.xpi and -signed.xpi
    4. recompute SHA256SUMS.txt over every asset
    5. git add + commit + push origin main
    6. gh release create v版本 --notes-file releases/v版本.md dist/v版本/*

A release always ships both XPI flavours. If AMO signing is still queued, step 3
fails and nothing is committed or published; rerun later to resume.

Signing credentials are read from AMO_JWT_ISSUER / AMO_JWT_SECRET or from a
two-line key file outside this repository. Neither is ever written into the repo.

Usage:
    python3 scripts/publish_release.py --key-file ~/.config/udemy-bilingual/amo-key.txt
    python3 scripts/publish_release.py --key-file <path> --skip-tests
    python3 scripts/publish_release.py --dry-run          # everything except git/gh
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRACKED_PATHS = ('udemy-bilingual', 'scripts', 'tests', 'releases', 'README.md', 'ONLINE-WORKFLOW.md')


def run(command, cwd=ROOT, check=True):
    print(f'$ {" ".join(str(part) for part in command)}')
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True)
    if result.stdout.strip():
        print(result.stdout.strip())
    if check and result.returncode != 0:
        print(result.stderr.strip(), file=sys.stderr)
        raise SystemExit(f'指令失敗（exit {result.returncode}）：{" ".join(str(p) for p in command)}')
    return result


def run_tests():
    test = ROOT / 'tests/extension-packages.test.py'
    print('== 1/6 執行測試 ==')
    run([sys.executable, str(test.relative_to(ROOT))])
    for path in sorted((ROOT / 'tests').glob('*.test.cjs')):
        run(['node', path.name], cwd=ROOT / 'tests')


def build(version, key_file, skip_tests):
    print('== 2/6 建置套件 ==')
    output = ROOT / 'dist' / f'v{version}'
    command = [sys.executable, str((ROOT / 'scripts/build_release.py').relative_to(ROOT))]
    if key_file:
        command += ['--key-file', str(key_file)]
    result = run(command, check=False)
    signed = output / f'udemy-bilingual-firefox-{version}-signed.xpi'
    if result.returncode != 0 or not signed.exists():
        # Signing is commonly queued at AMO. Keep the build, publish nothing.
        print('== 3/6 簽署未完成 ==')
        print(f'缺少 {signed.name}，本次不提交、不發布。AMO 簽署完成後重新執行本指令即可續行。')
        raise SystemExit(2)
    return output


def require_both_xpi(output, version):
    print('== 3/6 檢查雙版本 XPI ==')
    for suffix in ('-unsigned', '-signed'):
        path = output / f'udemy-bilingual-firefox-{version}{suffix}.xpi'
        if not path.exists():
            raise SystemExit(f'缺少 {path.name}，發布中止（每個 Release 必須同時有簽署與未簽署兩支 XPI）。')
        print(f'  {path.name}  {hashlib.sha256(path.read_bytes()).hexdigest()}')
    unsigned = output / f'udemy-bilingual-firefox-{version}-unsigned.xpi'
    firefox_zip = output / f'udemy-bilingual-firefox-{version}.zip'
    if unsigned.read_bytes() != firefox_zip.read_bytes():
        raise SystemExit('未簽署 XPI 與 Firefox ZIP 內容不一致，中止。')


def write_checksums(output):
    print('== 4/6 重算校驗碼 ==')
    sums = output / 'SHA256SUMS.txt'
    assets = sorted(path for path in output.iterdir() if path.name not in {sums.name, '.DS_Store'})
    lines = [f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}' for path in assets]
    sums.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    for line in lines:
        print(f'  {line}')


def commit_and_push(version, message, paths):
    print('== 5/6 提交並推送 ==')
    run(['git', 'add', '--'] + [str(p) for p in paths])
    staged = run(['git', 'diff', '--cached', '--quiet'], check=False)
    if staged.returncode == 0:
        print('  沒有變更可提交，沿用上一個 commit。')
    else:
        run(['git', 'commit', '-m', message])
    branch = run(['git', 'rev-parse', '--abbrev-ref', 'HEAD']).stdout.strip()
    run(['git', 'push', 'origin', branch])


def publish(version, output, notes_file, paths):
    print('== 6/6 建立 GitHub Release ==')
    tag = f'v{version}'
    if run(['gh', 'release', 'view', tag], check=False).returncode == 0:
        print(f'  {tag} 已存在，改為補上最新資產。')
        assets = [str(p) for p in sorted(output.iterdir()) if p.name != '.DS_Store']
        run(['gh', 'upload', tag, '--clobber'] + assets)
        return
    command = ['gh', 'release', 'create', tag, '--title', f'udemy-bilingual {version}',
               '--notes-file', str(notes_file)]
    command += [str(p) for p in sorted(output.iterdir()) if p.name != '.DS_Store']
    run(command)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--key-file', help='AMO issuer/secret key file kept outside this repository')
    parser.add_argument('--notes', help='release notes file; defaults to releases/v版本.md')
    parser.add_argument('--message', help='commit message; defaults to a summary of the version')
    parser.add_argument('--paths', nargs='*', default=list(TRACKED_PATHS), help='tracked paths to stage')
    parser.add_argument('--skip-tests', action='store_true', help='skip the test suite (not recommended)')
    parser.add_argument('--dry-run', action='store_true', help='build and check only; no git or gh')
    args = parser.parse_args()

    if not shutil.which('gh'):
        raise SystemExit('找不到 gh CLI，請先安裝 GitHub CLI。')
    version = json.loads((ROOT / 'udemy-bilingual/manifest.json').read_text(encoding='utf-8'))['version']
    output = ROOT / 'dist' / f'v{version}'
    notes = Path(args.notes).expanduser() if args.notes else ROOT / 'releases' / f'v{version}.md'
    if not notes.exists():
        raise SystemExit(f'找不到發布說明檔：{notes}')

    if not args.skip_tests:
        run_tests()
    build(version, args.key_file, args.skip_tests)
    require_both_xpi(output, version)
    write_checksums(output)
    if args.dry_run:
        print(f'\n[dry-run] dist/v{version} 已就緒，未執行 git 與 gh。')
        return 0

    message = args.message or f'發布 udemy-bilingual {version}：簽署與未簽署雙版本 XPI'
    commit_and_push(version, message, args.paths)
    publish(version, output, notes, args.paths)
    print(f'\n完成：https://github.com/goldshoot0720/Udemygpt/releases/tag/v{version}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())