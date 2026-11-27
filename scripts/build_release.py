#!/usr/bin/env python3
"""Build every browser package and require the matching signed and unsigned Firefox XPIs.

Produces both XPI flavours into dist/v版本/ so a release never ships only one:
    udemy-bilingual-firefox-版本-UNSIGNED-DO-NOT-INSTALL.xpi  unsigned, identical bytes to the ZIP
    udemy-bilingual-firefox-版本-signed.xpi   Mozilla-signed, directly installable

Signing needs an AMO unlisted-signing credential. Supply it either way:
    export AMO_JWT_ISSUER='user:xxxx:yy' AMO_JWT_SECRET='...'
    python3 scripts/build_release.py --key-file ~/.config/udemy-bilingual/amo-key.txt

The key file is read from outside this repository and is never written to it.
An incomplete release exits with an error. Pass --unsigned-only explicitly for local testing.
"""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from build_extensions import build, package_files  # noqa: E402
from fetch_signed import fetch_signed, read_credentials, token, version_info  # noqa: E402


def stage_firefox_source(destination):
    """Write a clean Firefox-only source tree for AMO to sign.

    Signing the repository's udemy-bilingual/ directory hands AMO every file in
    it, including chrome-compat.js and chrome-service-worker.js. Those are never
    referenced by the Firefox manifest, but they still ship inside the signed
    XPI, so the published Firefox package would carry Chrome-only sources.
    Staging the packaged Firefox file set keeps both artefacts identical apart
    from Mozilla's signature.
    """
    manifest, files = package_files('firefox')
    destination.mkdir(parents=True, exist_ok=True)
    (destination / 'manifest.json').write_bytes(files['manifest.json'])
    for name, data in files.items():
        if name == 'manifest.json':
            continue
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return destination


def sign(source_dir, output_dir, version, issuer, secret, timeout):
    """Ask AMO to sign the extension; return the produced XPI path or None."""
    with tempfile.TemporaryDirectory() as temp:
        artifacts = Path(temp) / 'artifacts'
        stage = stage_firefox_source(Path(temp) / 'source')
        env = {**os.environ, 'WEB_EXT_API_KEY': issuer, 'WEB_EXT_API_SECRET': secret}
        command = ['npx', '--yes', 'web-ext@7', 'sign', '--source-dir', str(stage),
                   '--channel', 'unlisted', '--artifacts-dir', str(artifacts),
                   '--timeout', str(timeout), '--no-input']
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        signed = sorted(artifacts.glob('*.xpi'))
        if not signed:
            raise RuntimeError(describe_failure(result))
        target = output_dir / f'udemy-bilingual-firefox-{version}-signed.xpi'
        shutil.copyfile(signed[0], target)
        return target


def describe_failure(result):
    """Explain why signing produced no XPI.

    web-ext prints the real reason (bad JWT, revoked key, AMO queue) near the end
    of stdout or on stderr; without this the caller only ever sees an empty
    message and there is nothing to act on.
    """
    def interesting(text):
        noise = ('at ', 'npm warn', 'npm notice', 'DeprecationWarning', 'trace-')
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return [line for line in lines
                if not any(marker in line for marker in noise)
                and not line.startswith(('$ ', 'node internal'))]

    lines = interesting(result.stdout) + interesting(result.stderr)
    lines = lines[-8:]
    if not lines:
        lines = [f'web-ext 結束但沒有產出 XPI（exit {result.returncode}）']
    return '簽署失敗：\n' + '\n'.join(f'  {line}' for line in lines)


def verify_xpi_pair(unsigned, signed):
    """Check signature metadata and ensure both archives carry the same extension."""
    with ZipFile(unsigned) as original, ZipFile(signed) as stamped:
        if stamped.testzip() is not None:
            raise ValueError('簽署版 XPI 的封裝校驗失敗。')
        payload = set(original.namelist())
        members = [entry.filename for entry in stamped.infolist() if not entry.is_dir()]
        signature = {name for name in members if name.startswith('META-INF/')}
        if not {'META-INF/mozilla.rsa', 'META-INF/mozilla.sf', 'META-INF/manifest.mf'} <= signature:
            raise ValueError('簽署版 XPI 缺少 Mozilla 簽章。')
        if len(set(members)) != len(members) or set(members) - signature != payload:
            raise ValueError('兩份 XPI 的檔案清單不同。請確認版本與原始碼。')
        for name in payload:
            left, right = original.read(name), stamped.read(name)
            if name == 'manifest.json':
                # AMO may serialize the same manifest with escaped Unicode.
                matches = json.loads(left) == json.loads(right)
            else:
                matches = left == right
            if not matches:
                raise ValueError(f'兩份 XPI 的 {name} 不同。變更內容後請使用新版本號。')


def write_checksums(output_dir):
    """Hash every asset in the output directory so SHA256SUMS.txt always covers all of them."""
    sums = output_dir / 'SHA256SUMS.txt'
    assets = sorted(path for path in output_dir.iterdir() if path.is_file() and path.name not in (sums.name, '.DS_Store'))
    lines = [f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}' for path in assets]
    sums.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return sums


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', help='output directory; defaults to dist/v版本/')
    parser.add_argument('--key-file', help='file outside this repo holding the AMO issuer on line 1 and secret on line 2')
    parser.add_argument('--timeout', type=int, default=300000, help='signing timeout in milliseconds')
    parser.add_argument('--resign', action='store_true',
                        help='retrieve a fresh signed XPI from AMO even when a cached copy exists')
    parser.add_argument('--wait', type=int, default=1800, help='seconds to wait for an existing AMO submission')
    parser.add_argument('--unsigned-only', action='store_true', help='local testing only: skip the release signing step')
    args = parser.parse_args()

    version = json.loads((ROOT / 'udemy-bilingual/manifest.json').read_text(encoding='utf-8'))['version']
    base = ROOT / 'dist' / 'dev' if args.unsigned_only else ROOT / 'dist'
    output = Path(args.output).expanduser() if args.output else base / f'v{version}'
    build(output)
    if args.unsigned_only:
        print('已產生暫時測試用套件。')
        return 0

    signed = output / f'udemy-bilingual-firefox-{version}-signed.xpi'
    unsigned = output / f'udemy-bilingual-firefox-{version}-UNSIGNED-DO-NOT-INSTALL.xpi'
    issuer, secret = read_credentials(args.key_file)
    if issuer and secret:
        registered = version_info(version, token(issuer, secret))
        with tempfile.TemporaryDirectory(dir=output) as tmp:
            candidate = Path(tmp) / signed.name
            if not registered:
                try:
                    sign(ROOT / 'udemy-bilingual', Path(tmp), version, issuer, secret, args.timeout)
                except RuntimeError:
                    # An accepted upload can still be queued (or submitted concurrently).
                    if version_info(version, token(issuer, secret)) is None:
                        raise
            elif signed.is_file() and not args.resign:
                shutil.copyfile(signed, candidate)
            fetch_signed(version, candidate, issuer, secret, args.wait)
            verify_xpi_pair(unsigned, candidate)
            candidate.replace(signed)
    elif signed.is_file() and not args.resign:
        verify_xpi_pair(unsigned, signed)
    else:
        raise SystemExit('缺少 Mozilla 簽署版與 AMO 憑證，發行未完成。請設定憑證後重新執行。')
    print(f'正式安裝（Mozilla 簽署）：{signed}')
    print(f'暫時測試（未簽署）：{unsigned}')
    print(f'校驗碼：{write_checksums(output)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())