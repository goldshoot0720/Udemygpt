import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
from zipfile import ZipFile

root = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('build_extensions', root / 'scripts/build_extensions.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
with tempfile.TemporaryDirectory() as temp:
    output = Path(temp)
    assets = builder.build(output)
    original = {path.name: path.read_bytes() for path in assets}
    builder.build(output)
    assert all(path.read_bytes() == original[path.name] for path in assets)
    for browser in ('firefox', 'chrome', 'edge', 'safari'):
        manifest, expected = builder.package_files(browser)
        suffix = 'safari-source' if browser == 'safari' else browser
        with ZipFile(output / f'udemy-bilingual-{suffix}-{manifest["version"]}.zip') as package:
            assert set(package.namelist()) == set(expected)
            assert all(package.read(name) == data for name, data in expected.items())
            assert package.testzip() is None
            assert manifest['manifest_version'] == 3
            assert manifest['permissions'] == ['storage']
            for script in manifest['content_scripts'][0]['js']:
                assert script in package.namelist()
            if browser == 'firefox':
                assert manifest['background']['scripts'] == ['courses.js', 'background.js']
                assert manifest['browser_specific_settings']['gecko']['id'] == 'udemy-bilingual@local.personal'
                assert 'chrome-compat.js' not in package.namelist()
            else:
                assert 'browser_specific_settings' not in manifest
                worker = manifest['background']['service_worker']
                assert worker in package.namelist()
                if browser in ('chrome', 'edge'):
                    assert manifest['content_scripts'][0]['js'][0] == 'chrome-compat.js'
                    assert package.read('export.html').index(b'chrome-compat.js') < package.read('export.html').index(b'export.js')
                else:
                    assert 'SAFARI.md' in package.namelist()
                    assert 'convert-safari.sh' in package.namelist()
            assert not any(name.startswith('data/') or name.endswith(('.mp4', '.m4a', '.pem', '.key')) for name in package.namelist())
    firefox_manifest, firefox_expected = builder.package_files('firefox')
    xpi = output / f'udemy-bilingual-firefox-{firefox_manifest["version"]}-unsigned.xpi'
    assert xpi.exists()
    with ZipFile(xpi) as package:
        assert set(package.namelist()) == set(firefox_expected)
        assert all(package.read(name) == data for name, data in firefox_expected.items())
        assert package.testzip() is None
        assert json.loads(package.read('manifest.json')) == firefox_manifest
        # Nothing that could pass as a Mozilla signature may ship in the package.
        assert not any(name.startswith('META-INF') or name.endswith(('.rsa', '.sf', '.pem', '.key')) for name in package.namelist())
    assert xpi.read_bytes() == (output / f'udemy-bilingual-firefox-{firefox_manifest["version"]}.zip').read_bytes()
    for line in (output / 'SHA256SUMS.txt').read_text().splitlines():
        checksum, name = line.split('  ')
        assert hashlib.sha256((output / name).read_bytes()).hexdigest() == checksum
print('PASS: Reproducible Firefox/Chrome/Edge/Safari-source ZIPs, scripts/manifests, no course media or secrets, and SHA-256 checksums.')
