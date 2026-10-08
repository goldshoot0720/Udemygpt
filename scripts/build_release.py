#!/usr/bin/env python3
"""Build every browser package and, when AMO credentials are available, the signed Firefox XPI too.

Produces both XPI flavours into dist/v版本/ so a release never ships only one:
    udemy-bilingual-firefox-版本-unsigned.xpi  unsigned, identical bytes to the Firefox ZIP
    udemy-bilingual-firefox-版本-signed.xpi   Mozilla-signed, directly installable

Signing needs an AMO unlisted-signing credential. Supply it either way:
    export AMO_JWT_ISSUER='user:xxxx:yy' AMO_JWT_SECRET='...'
    python3 scripts/build_release.py --key-file ~/.config/udemy-bilingual/amo-key.txt

The key file is read from outside this repository and is never written to it.
Without credentials the signed XPI is skipped and the unsigned packages are still built.
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

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from build_extensions import build, package_files  # noqa: E402


def read_credentials(key_file):
    """Return (issuer, secret) from the environment or a two-line key file outside the repo."""
    issuer = os.environ.get('AMO_JWT_ISSUER') or os.environ.get('WEB_EXT_API_KEY')
    secret = os.environ.get('AMO_JWT_SECRET') or os.environ.get('WEB_EXT_API_SECRET')
    if key_file and not (issuer and secret):
        path = Path(key_file).expanduser()
        if path.exists():
            lines = [line.strip() for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]
            if len(lines) >= 2:
                issuer, secret = lines[0], lines[1]
    return issuer, secret


def sign(source_dir, output_dir, version, issuer, secret, timeout):
    """Ask AMO to sign the extension; return the produced XPI path or None."""
    with tempfile.TemporaryDirectory() as temp:
        env = {**os.environ, 'WEB_EXT_API_KEY': issuer, 'WEB_EXT_API_SECRET': secret}
        command = ['npx', '--yes', 'web-ext@7', 'sign', '--source-dir', str(source_dir),
                   '--channel', 'unlisted', '--artifacts-dir', temp, '--timeout', str(timeout),
                   '--no-input']
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        signed = sorted(Path(temp).glob('*.xpi'))
        if not signed:
            detail = '\n'.join(line for line in result.stdout.splitlines()[-6:] if 'at ' not in line)
            raise RuntimeError(f'簽署失敗：{detail.strip() or result.stderr[-500:]}')
        target = output_dir / f'udemy-bilingual-firefox-{version}-signed.xpi'
        shutil.copyfile(signed[0], target)
        return target


def write_checksums(output_dir):
    """Hash every asset in the output directory so SHA256SUMS.txt always covers all of them."""
    sums = output_dir / 'SHA256SUMS.txt'
    assets = sorted(path for path in output_dir.iterdir() if path.name != sums.name)
    lines = [f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}' for path in assets]
    sums.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return sums


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', help='output directory; defaults to dist/v版本/')
    parser.add_argument('--key-file', help='file outside this repo holding the AMO issuer on line 1 and secret on line 2')
    parser.add_argument('--timeout', type=int, default=300000, help='signing timeout in milliseconds')
    args = parser.parse_args()

    version = json.loads((ROOT / 'udemy-bilingual/manifest.json').read_text(encoding='utf-8'))['version']
    output = Path(args.output).expanduser() if args.output else ROOT / 'dist' / f'v{version}'
    build(output)

    issuer, secret = read_credentials(args.key_file)
    if issuer and secret:
        signed = sign(ROOT / 'udemy-bilingual', output, version, issuer, secret, args.timeout)
        print(f'已簽署：{signed}')
    else:
        print('未提供 AMO 憑證，略過簽署版 XPI（其餘套件已產生）')

    manifest, files = package_files('firefox')
    unsigned = output / f'udemy-bilingual-firefox-{manifest["version"]}-unsigned.xpi'
    print(f'未簽署 XPI：{unsigned}')
    print(f'校驗碼：{write_checksums(output)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())