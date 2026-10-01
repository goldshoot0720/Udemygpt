# Udemy 中英雙語特效字幕 2.5.0

GitHub Release 提供 Firefox、Chrome、Edge 的開發者載入包，以及 Safari 原始碼包。尚未發布到瀏覽器商店，也未提供 Mozilla 或 Apple 簽署的安裝檔。包內不包含課程影片、音訊、帳號資料或已翻譯的課程字幕。

## Firefox（115 以上）

1. 下載並解壓縮 `udemy-bilingual-firefox-2.5.0.zip`。
2. 開啟 `about:debugging#/runtime/this-firefox`，按「載入暫用附加元件」。
3. 選擇解壓縮資料夾內的 `manifest.json`，回到 Udemy 播放器重新整理。

Firefox 關閉後暫用附加元件會移除。正式長期安裝需要 Mozilla 簽章；本 ZIP 不是已簽署的 XPI。

## Chrome／Edge（109 以上，建議目前穩定版）

1. 下載相應的 `udemy-bilingual-chrome-2.5.0.zip` 或 `udemy-bilingual-edge-2.5.0.zip`，解壓縮到固定位置。
2. Chrome 開啟 `chrome://extensions`；Edge 開啟 `edge://extensions`。
3. 開啟「開發人員模式」，按「載入未封裝項目」，選擇包含 `manifest.json` 的資料夾。
4. 回到 Udemy 課程播放器重新整理；保留解壓縮資料夾供後續載入。

Chrome／Edge 包使用 Manifest V3 service worker，並處理非同步訊息與錯誤回傳。Firefox／Chrome／Edge 的本機儲存彼此獨立；換瀏覽器需要重新匯入譯文 JSON。

## Safari

`udemy-bilingual-safari-source-2.5.0.zip` 是 Safari Web Extension 轉換來源，不能直接安裝。本次未生成或編譯 Xcode 專案：發布主機只有 Command Line Tools，未安裝完整 Xcode。

在已安裝完整 Xcode 的 Mac 解壓縮來源包，執行 `sh convert-safari.sh`，再開啟產生的 Xcode 專案。設定開發團隊、檢查轉換工具列出的 API 相容性警告，編譯並簽署應用程式及擴充套件。Safari 版本仍待原生編譯與實際播放驗證，詳見包內 `SAFARI.md`。

## 使用

登入有觀看權限的 Udemy 帳號，開啟支援課程的 `learn/` 頁面。繁體中文在上、英文在下；透過「設定」匯入 ChatGPT 譯文。尚未匯入譯文時只顯示英文。課程分鐘數僅在點選「設定」後顯示，採前面影片總長加本堂播放位置的依序估算。

升級時在擴充套件管理頁面按重新載入，再重新整理課程。先保留譯文 JSON 備份；移除擴充套件可能清除瀏覽器儲存的譯文。

## 驗證檔案

macOS／Linux 在下載資料夾執行 `shasum -a 256 -c SHA256SUMS.txt`。測試涵蓋 13 門課路由、字幕載入／匯出／匯入、時間軸雜湊、補充英文來源、課程分鐘數、Chromium 非同步通訊及各瀏覽器包內容。Safari 尚未完成原生測試。

官方安裝文件：[Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)、[Chrome](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)、[Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading)、[Safari](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)。
