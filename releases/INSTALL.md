# Udemy 中英/中日雙語特效字幕 2.7.9

GitHub Release 提供 Firefox 的簽章 XPI 與 ZIP、Chrome、Edge 的開發者載入包，以及 Safari 原始碼包。Firefox 的 XPI 已由 Mozilla 簽署，可直接安裝且重開瀏覽器不會被移除；未發布到瀏覽器商店。包內不包含課程影片、音訊、帳號資料或已翻譯的課程字幕。

## Firefox（115 以上）

### 方式一：安裝簽章版（建議）

1. 下載 `udemy-bilingual-firefox-2.7.9-signed.xpi`。
2. Firefox 選單「工具」→「附加元件與主題」，右上角齒輪選「從檔案安裝附加元件」。
3. 選該 XPI，按「立即安裝」。

此版本由 Mozilla 簽署，可長期安裝，重新開啟 Firefox 不會被移除。升級新版本時重複以上步驟即可。

### 方式二：暫時載入（與 v2.5.0 相同）

1. 解壓縮 `udemy-bilingual-firefox-2.7.9.zip`（或直接使用本機的擴充功能資料夾）。
2. 開啟 `about:debugging#/runtime/this-firefox`，按「載入暫用附加元件」。
3. 選擇解壓縮資料夾內的 `manifest.json`，在確認對話框按「載入」。
4. 回到 Udemy 播放器重新整理。

已從資料夾載入過的使用者不必重裝，對既有項目按「重新載入」即可取得新版本。Firefox 關閉後暫用附加元件會移除。

## 兩個 XPI 差在哪裡

Release 裡有兩支檔名很像的 XPI，**只裝 `-signed` 那一支**：

| 檔名 | 能不能安裝 |
|---|---|
| `udemy-bilingual-firefox-2.7.9-signed.xpi` | ✅ 可以，這就是你要的 |
| `udemy-bilingual-firefox-2.7.9-UNSIGNED-DO-NOT-INSTALL.xpi` | ❌ 不能，Firefox 必定拒絕 |

第二支是未簽章版本，內容與 ZIP 完全相同，**無法安裝是正常的**，它存在的目的只是讓人自行簽署時有原始檔可用。暫時載入請改用上面的方式二（解壓縮 ZIP 後用 `about:debugging` 載入），不要去雙擊它。

自行簽署請依 [取得 API Key 與 API Secret](https://addons.mozilla.org/zh-TW/developers/addon/api/key/) 建立憑證後執行 `WEB_EXT_API_KEY=<key> WEB_EXT_API_SECRET=<secret> npx web-ext@7 sign --source-dir udemy-bilingual --channel unlisted`。憑證只留在本機，不要提交進儲存庫。

## Chrome／Edge（109 以上，建議目前穩定版）

1. 下載相應的 `udemy-bilingual-chrome-2.7.9.zip` 或 `udemy-bilingual-edge-2.7.9.zip`，解壓縮到固定位置。
2. Chrome 開啟 `chrome://extensions`；Edge 開啟 `edge://extensions`。
3. 開啟「開發人員模式」，按「載入未封裝項目」，選擇包含 `manifest.json` 的資料夾。
4. 回到 Udemy 課程播放器重新整理；保留解壓縮資料夾供後續載入。

Chrome／Edge 包使用 Manifest V3 service worker，並處理非同步訊息與錯誤回傳。Firefox／Chrome／Edge 的本機儲存彼此獨立；換瀏覽器需要重新匯入譯文 JSON。

## Safari

`udemy-bilingual-safari-source-2.7.9.zip` 是 Safari Web Extension 轉換來源，不能直接安裝。本次未生成或編譯 Xcode 專案：發布主機只有 Command Line Tools，未安裝完整 Xcode。

在已安裝完整 Xcode 的 Mac 解壓縮來源包，執行 `sh convert-safari.sh`，再開啟產生的 Xcode 專案。設定開發團隊、檢查轉換工具列出的 API 相容性警告，編譯並簽署應用程式及擴充套件。Safari 版本仍待原生編譯與實際播放驗證，詳見包內 `SAFARI.md`。

## 使用

登入有觀看權限的 Udemy 帳號，開啟任一課程的 `learn/` 頁面都可使用。繁體中文在上、英文在下；透過「設定」匯入中英雙語字幕。沒有譯文的課程（含未加入翻譯清單的課程）只顯示英文，並在面板標示尚未翻譯。尚未匯入譯文時只顯示英文。課程分鐘數僅在點選「設定」後顯示，採前面影片總長加本堂播放位置的依序估算。

升級時在擴充套件管理頁面按重新載入，再重新整理課程。先保留譯文 JSON 備份；移除擴充套件可能清除瀏覽器儲存的譯文。

## 驗證檔案

macOS／Linux 在下載資料夾執行 `shasum -a 256 -c SHA256SUMS.txt`。測試涵蓋 14 門課路由與任意課程的萬用比對、字幕載入／匯出／匯入、時間軸雜湊、補充英文來源、課程分鐘數、Chromium 非同步通訊及各瀏覽器包內容。Safari 尚未完成原生測試。

官方安裝文件：[Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)、[Chrome](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)、[Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading)、[Safari](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)。
