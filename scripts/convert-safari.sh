#!/bin/sh
set -eu
# Run from the extracted Safari source package. Requires full Xcode.
extension_path=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_path=${1:-"$extension_path/../UdemyBilingualSafariProject"}
if xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
  packager=safari-web-extension-packager
elif xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  packager=safari-web-extension-converter
else
  echo "Install full Xcode and select it with xcode-select before creating the Safari project." >&2
  exit 1
fi
exec xcrun "$packager" "$extension_path" --project-location "$project_path" --app-name "Udemy Bilingual" --bundle-identifier "com.goldshoot0720.udemybilingual" --swift --copy-resources --macos-only --no-open --no-prompt
