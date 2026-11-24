# Udemy 中英/中日雙語特效字幕 2.7.14

GitHub Release 提供 Firefox、Chrome、Edge 的開發者載入包，以及 Safari 原始碼包。這一版沒有向 Mozilla 申請簽章，因此沒有 `-signed.xpi`。未發布到瀏覽器商店。包內不包含課程影片、音訊、帳號資料或已翻譯的課程字幕。

## Firefox（115 以上）

1. 解壓縮 `udemy-bilingual-firefox-2.7.14.zip`（或直接使用本機的擴充功能資料夾）。
2. 開啟 `about:debugging#/runtime/this-firefox`，按「載入暫用附加元件」。
3. 選擇解壓縮資料夾內的 `manifest.json`，在確認對話框按「載入」。
4. 回到 Udemy 播放器重新整理。

已從資料夾載入過的使用者不必重裝，對既有項目按「重新載入」即可取得新版本。Firefox 關閉後暫用附加元件會移除。

`udemy-bilingual-firefox-2.7.14-UNSIGNED-DO-NOT-INSTALL.xpi` 與 ZIP 內容相同，**雙擊安裝會被 Firefox 拒絕**。請用上面的暫時載入，不要去雙擊它。

需要長期安裝、重開瀏覽器仍保留的簽章版，請用上一版 `udemy-bilingual-firefox-2.7.13-signed.xpi`。那一版沒有左上角的堂次顯示。自行簽署請依 [取得 API Key 與 API Secret](https://addons.mozilla.org/zh-TW/developers/addon/api/key/) 建立憑證後執行 `WEB_EXT_API_KEY=<key> WEB_EXT_API_SECRET=<secret> npx web-ext@7 sign --source-dir udemy-bilingual --channel unlisted`。憑證只留在本機，不要提交進儲存庫。

## Chrome／Edge（109 以上，建議目前穩定版）

1. 下載相應的 `udemy-bilingual-chrome-2.7.14.zip` 或 `udemy-bilingual-edge-2.7.14.zip`，解壓縮到固定位置。
2. Chrome 開啟 `chrome://extensions`；Edge 開啟 `edge://extensions`。
3. 開啟「開發人員模式」，按「載入未封裝項目」，選擇包含 `manifest.json` 的資料夾。
4. 回到 Udemy 課程播放器重新整理；保留解壓縮資料夾供後續載入。

Chrome／Edge 包使用 Manifest V3 service worker，並處理非同步訊息與錯誤回傳。Firefox／Chrome／Edge 的本機儲存彼此獨立；換瀏覽器需要重新匯入譯文 JSON。

## Safari

`udemy-bilingual-safari-source-2.7.14.zip` 是 Safari Web Extension 轉換來源，不能直接安裝。本次未生成或編譯 Xcode 專案：發布主機只有 Command Line Tools，未安裝完整 Xcode。

在已安裝完整 Xcode 的 Mac 解壓縮來源包，執行 `sh convert-safari.sh`，再開啟產生的 Xcode 專案。設定開發團隊、檢查轉換工具列出的 API 相容性警告，編譯並簽署應用程式及擴充套件。Safari 版本仍待原生編譯與實際播放驗證，詳見包內 `SAFARI.md`。

## 使用

登入有觀看權限的 Udemy 帳號，開啟任一課程的 `learn/` 頁面都可使用。繁體中文在上、英文在下；透過「設定」匯入中英雙語字幕。沒有譯文的課程（含未加入翻譯清單的課程）只顯示英文，並在面板標示尚未翻譯。尚未匯入譯文時只顯示英文。播放器左上角固定顯示目前堂次與總堂次，例如 `116/351`。課程分鐘數僅在點選「設定」後顯示，採前面影片總長加本堂播放位置的依序估算。

升級時在擴充套件管理頁面按重新載入，再重新整理課程。先保留譯文 JSON 備份；移除擴充套件可能清除瀏覽器儲存的譯文。

## 驗證檔案

macOS／Linux 在下載資料夾執行 `shasum -a 256 -c SHA256SUMS.txt`。測試涵蓋 27 門課路由與任意課程的萬用比對、字幕載入／匯出／匯入、時間軸雜湊、補充英文來源、課程分鐘數、Chromium 非同步通訊及各瀏覽器包內容。Safari 尚未完成原生測試。

官方安裝文件：[Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)、[Chrome](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)、[Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading)、[Safari](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)。
