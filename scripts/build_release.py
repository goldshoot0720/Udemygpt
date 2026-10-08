#!/usr/bin/env python3
"""Build every browser package and, when AMO credentials are available, the signed Firefox XPI too.

Produces both XPI flavours into dist/v版本/ so a release never ships only one:
    udemy-bilingual-firefox-版本-UNSIGNED-DO-NOT-INSTALL.xpi  unsigned, identical bytes to the ZIP
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
    parser.add_argument('--resign', action='store_true',
                        help='sign again even when a signed XPI is already present')
    args = parser.parse_args()

    version = json.loads((ROOT / 'udemy-bilingual/manifest.json').read_text(encoding='utf-8'))['version']
    output = Path(args.output).expanduser() if args.output else ROOT / 'dist' / f'v{version}'
    build(output)

    # AMO refuses to sign the same version twice, so a signature already fetched
    # from AMO (see scripts/fetch_signed.py) must be reused rather than requested
    # again; only a build whose manifest version changed can be re-signed.
    signed_path = output / f'udemy-bilingual-firefox-{version}-signed.xpi'
    if signed_path.exists() and not args.resign:
        print(f'沿用既有簽章版：{signed_path}')
    else:
        issuer, secret = read_credentials(args.key_file)
        if issuer and secret:
            signed = sign(ROOT / 'udemy-bilingual', output, version, issuer, secret, args.timeout)
            print(f'已簽署：{signed}')
        else:
            print('未提供 AMO 憑證，略過簽署版 XPI（其餘套件已產生）')

    manifest, files = package_files('firefox')
    unsigned = output / f'udemy-bilingual-firefox-{manifest["version"]}-UNSIGNED-DO-NOT-INSTALL.xpi'
    print(f'未簽署 XPI：{unsigned}')
    print(f'校驗碼：{write_checksums(output)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())