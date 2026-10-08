#!/usr/bin/env python3
"""Wait for AMO to finish signing a version, then download the signed XPI.

AMO accepts an unlisted upload immediately (automated_signing) but the XPI only
becomes downloadable minutes later. Re-uploading the same version is rejected
with 409, so the correct way to finish a release is to wait for the queued
signature and fetch it, not to submit again.

The AMO credential is read from AMO_JWT_ISSUER / AMO_JWT_SECRET or from a
two-line key file outside this repository; it is never written to the repo.

Usage:
    python3 scripts/fetch_signed.py 2.7.7 --key-file ~/.config/udemy-bilingual/amo-key.txt
    python3 scripts/fetch_signed.py 2.7.7 --key-file <path> --wait 1800
"""
import argparse
import base64
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_release import read_credentials  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
ADDON = 'udemy-bilingual@local.personal'
API = f'https://addons.mozilla.org/api/v4/addons/{ADDON}'


def token(issuer, secret):
    """Build a JWT the way AMO expects: HS256 over iss/iat/exp/aud."""
    def b64(raw):
        return base64.urlsafe_b64encode(raw).rstrip(b'=').decode()

    header = b64(json.dumps({'alg': 'HS256', 'typ': 'JWT'}, separators=(',', ':')).encode())
    now = int(time.time())
    payload = b64(json.dumps({
        'iss': issuer,
        'iat': now,
        'exp': now + 300,
        'aud': API + '/',
    }, separators=(',', ':')).encode())
    signature = base64.urlsafe_b64encode(
        hmac.new(secret.encode(), f'{header}.{payload}'.encode(), hashlib.sha256).digest()
    ).rstrip(b'=').decode()
    return f'{header}.{payload}.{signature}'


def request(url, jwt, data=None):
    req = urllib.request.Request(url, headers={'Authorization': f'JWT {jwt}'})
    if data is not None:
        req.data = data
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read()


def version_info(version, jwt):
    try:
        return json.loads(request(f'{API}/versions/{version}/', jwt))
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('version')
    parser.add_argument('--key-file', help='AMO issuer/secret key file outside this repository')
    parser.add_argument('--wait', type=int, default=1800, help='seconds to wait for the signature')
    parser.add_argument('--output', help='output directory; defaults to dist/v版本/')
    args = parser.parse_args()

    issuer, secret = read_credentials(args.key_file)
    if not (issuer and secret):
        raise SystemExit('缺少 AMO 憑證（AMO_JWT_ISSUER / AMO_JWT_SECRET 或 --key-file）。')
    jwt = token(issuer, secret)
    output = Path(args.output).expanduser() if args.output else ROOT / 'dist' / f'v{args.version}'
    output.mkdir(parents=True, exist_ok=True)
    target = output / f'udemy-bilingual-firefox-{args.version}-signed.xpi'

    deadline = time.time() + args.wait
    attempt = 0
    while True:
        attempt += 1
        info = version_info(args.version, jwt)
        if info is None:
            print(f'第 {attempt} 次：AMO 上還沒有 {args.version}，等待上傳…')
        else:
            file = (info.get('files') or [{}])[0]
            if file.get('signed'):
                payload = request(file['download_url'], jwt)
                expected = (file.get('hash') or '').removeprefix('sha256:')
                actual = hashlib.sha256(payload).hexdigest()
                if expected and expected != actual:
                    raise SystemExit(f'下載的 XPI 雜湊不符：AMO {expected}，實際 {actual}')
                target.write_bytes(payload)
                print(f'已簽署並下載：{target}')
                print(f'SHA-256 {actual}（與 AMO 回報一致）')
                return 0
            print(f'第 {attempt} 次：{args.version} 尚未簽署'
                  f'（processed={info.get("processed")}, reviewed={info.get("reviewed")}）')
        if time.time() >= deadline:
            raise SystemExit(f'等待簽署逾時（{args.wait} 秒）。稍後再執行本指令即可續行。')
        time.sleep(30)


if __name__ == '__main__':
    sys.exit(main())