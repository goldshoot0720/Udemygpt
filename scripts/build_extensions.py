#!/usr/bin/env python3
"""Build reproducible browser-specific packages; include no course or account data."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'udemy-bilingual'


def package_files(browser):
    files = {str(path.relative_to(SOURCE)): path.read_bytes()
             for path in sorted(SOURCE.rglob('*'))
             if path.is_file() and path.name not in ('.DS_Store', '.web-extension-id')
             and not path.name.endswith('.tmp')}
    manifest = json.loads(files['manifest.json'])
    if browser == 'firefox':
        files.pop('chrome-compat.js', None)
        files.pop('chrome-service-worker.js', None)
    else:
        manifest.pop('browser_specific_settings', None)
        if browser in ('chrome', 'edge'):
            manifest['background'] = {'service_worker': 'chrome-service-worker.js'}
            manifest['minimum_chrome_version'] = '109'
            for content in manifest['content_scripts']:
                content['js'].insert(0, 'chrome-compat.js')
            files['export.html'] = files['export.html'].replace(
                b'<script src="courses.js">', b'<script src="chrome-compat.js"></script><script src="courses.js">')
        elif browser == 'safari':
            manifest['background'] = {'service_worker': 'safari-service-worker.js'}
            files.pop('chrome-compat.js', None)
            files.pop('chrome-service-worker.js', None)
            files['safari-service-worker.js'] = b'importScripts("courses.js", "background.js");\n'
            files['SAFARI.md'] = (ROOT / 'releases/SAFARI.md').read_bytes()
            files['convert-safari.sh'] = (ROOT / 'scripts/convert-safari.sh').read_bytes()
        else:
            raise ValueError(browser)
    files['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    return manifest, files


def write_archive(target, files, manifest):
    """Write a deterministic ZIP/XPI: fixed timestamps and modes, verified after writing."""
    with ZipFile(target, 'w', compression=ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            info = ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = (0o100755 if name.endswith('.sh') else 0o100644) << 16
            archive.writestr(info, data)
    with ZipFile(target) as archive:
        assert archive.testzip() is None
        assert json.loads(archive.read('manifest.json')) == manifest
    return target


def build(output=None):
    version = json.loads((SOURCE / 'manifest.json').read_text())['version']
    output = Path(output) if output else ROOT / 'dist' / f'v{version}'
    output.mkdir(parents=True, exist_ok=True)
    assets = []
    packages = {browser: package_files(browser) for browser in ('firefox', 'chrome', 'edge', 'safari')}
    for browser, (manifest, files) in packages.items():
        suffix = 'safari-source' if browser == 'safari' else browser
        assets.append(write_archive(output / f'udemy-bilingual-{suffix}-{version}.zip', files, manifest))
    # Firefox install file. It is not signed, so Firefox always refuses to install it
    # ("因為此附加元件尚未經過驗證，無法安裝"). The filename says so in plain words because
    # this file is otherwise byte-identical to the Firefox ZIP and looks installable.
    firefox_manifest, firefox_files = packages['firefox']
    assets.append(write_archive(
        output / f'udemy-bilingual-firefox-{version}-UNSIGNED-DO-NOT-INSTALL.xpi',
        firefox_files, firefox_manifest))
    instructions = output / 'INSTALL.md'
    instructions.write_bytes((ROOT / 'releases/INSTALL.md').read_bytes())
    assets.append(instructions)
    checksums = output / 'SHA256SUMS.txt'
    checksums.write_text(''.join(f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n' for path in assets))
    for path in [*assets, checksums]:
        print(path)
    return assets


if __name__ == '__main__':
    build()
