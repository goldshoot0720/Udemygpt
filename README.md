# Udemy 中英雙語特效字幕

支援課程的字幕流程：**英文原字幕 → ChatGPT 線上逐段翻譯 → 台灣繁體術語檢查 → 依英文時間軸顯示**。

版本 2.0 不再下載或使用 Udemy 中文字幕，也不使用本機翻譯模型。尚未完成英文預譯的講座只顯示英文，左上角會標示「中文待翻譯」。

## 支援課程（2.1）

以下 10 門課程的講師皆為 **Maximilian Schwarzmüller**。

- [React - The Complete Guide](https://www.udemy.com/course/react-the-complete-guide-incl-redux/)
- [Claude Code - The Practical Guide](https://www.udemy.com/course/claude-code-the-practical-guide/)
- [Codex - The Practical Guide](https://www.udemy.com/course/codex-the-practical-guide/)
- [Flutter & Dart - The Complete Guide](https://www.udemy.com/course/learn-flutter-dart-to-build-ios-android-apps/)
- [NodeJS - The Complete Guide](https://www.udemy.com/course/nodejs-the-complete-guide/)
- [React Native - The Practical Guide](https://www.udemy.com/course/react-native-the-practical-guide/)
- [CSS - The Complete Guide](https://www.udemy.com/course/css-the-complete-guide-incl-flexbox-grid-sass/)
- [Svelte.js - The Complete Guide](https://www.udemy.com/course/sveltejs-the-complete-guide/)
- [NativeScript + Angular](https://www.udemy.com/course/nativescript-angular-build-native-ios-android-web-apps/)
- [Remix.js - The Practical Guide](https://www.udemy.com/course/remix-course/)

在上述課程的 `learn/` 播放器頁面啟用。課程 ID 自動從 Udemy 取得；本堂及全課英文匯出、譯文匯入均使用目前課程 ID，譯文依課程分開儲存，並相容既有 React 譯文。新增支援不代表字幕已翻譯；新課程需先匯出英文，再交給 ChatGPT 翻譯與匯入。

更新後在 `about:debugging#/runtime/this-firefox` 重新載入此附加元件，再重新整理課程播放器頁面。

## 播放與縮放

繁體中文在上，英文在下，支援關鍵字光暈＋淡入、電影描邊、簡潔閱讀。播放器左上角「中英 CC」可開關，「設定」可調整字體、字幕高度與時間校正。

字幕與面板會補償 Firefox 的頁面縮放，包含 150%。長中文字幕會依播放器寬度縮小字級；播放器變窄或進入全螢幕也會重新計算，字幕框使用較小留白。

使用台灣術語：元件、陣列、物件、函式、變數、字串、布林、程式碼、資料、資料庫、專案、函式庫、預設、呼叫、載入、非同步、回呼、快取、伺服器、介面、原始碼。React／JSX／Hooks／props／API 識別字保留英文。

## 翻譯與匯入

1. 播放器設定按「匯出本堂英文」或「匯出全課英文」。全課匯出會讀取登入帳號可觀看的講座，完成後下載 JSON，失敗項目記錄在 errors。
2. 將英文 JSON 與 `ChatGPT-翻譯指令.md` 的指令交給 ChatGPT 線上翻譯；大型檔案應分成小批次。
3. 取得翻譯結果後檢查段數、空白 zh 及時間軸，再按「匯入 ChatGPT 譯文」。
4. 匯入時會驗證每段編號、英文與時間戳記的 SHA-256。格式錯誤或英文時間軸有改動的檔案會拒絕匯入。
5. 譯文保存在 Firefox 擴充功能本機儲存區，之後播放直接讀取。課程英文字幕版本變動時會要求重新翻譯。

## Firefox 暫時載入

1. 開啟 `about:debugging#/runtime/this-firefox`。
2. 按「載入暫用附加元件」，選擇 `udemy-bilingual/manifest.json`。
3. 回到課程頁面重新整理。

Firefox 完全關閉後暫用附加元件會移除；長期安裝需要 Mozilla 簽章。請保留譯文 JSON 作為備份。

只在指定課程的 learn 頁面執行，使用正常登入權限取得英文字幕；不下載影片、不讀取 Cookie API、不儲存登入憑證。ChatGPT 檔案上傳由使用者或授權的瀏覽器操作完成，擴充功能不擷取 ChatGPT 登入資訊。

## 主要檔案

- `udemy-bilingual/`：Firefox 擴充功能原始碼。
- `udemy-bilingual/courses.js`：支援課程清單、課程 ID 辨識與譯文儲存鍵。
- `data/`：英文素材與已驗證譯文。
- `ChatGPT-翻譯指令.md`：逐段翻譯及台灣術語要求。
- `tests/subtitle-core.test.cjs`：字幕時間邊界、重疊、倒退跳轉、語言選取及台灣術語驗證。

## 逐堂處理進度

以下進度與 `translation_queue.py` 目前專用於原有 React 課程；新增課程可使用播放器的英文匯出與譯文匯入，尚未建立逐堂翻譯進度。

已核對完整清單：727 堂講座包含 678 堂影片與 49 堂文字教材；文字教材沒有影片字幕。678 堂的 80,645 段原始英文字幕均已取得，逐堂交給 ChatGPT 線上翻譯。

`data/translation-progress.json` 保留每堂英文檔、翻譯檔、驗證與匯入狀態。`translation_queue.py next` 取得下一堂；`verify` 核對完整結果，`imported` 必須附上實際觀察到的匯入證據。每完成一堂通知一次，可中斷後續接。詳細步驟見 `ONLINE-WORKFLOW.md`。

使用者指定每完成 10 堂自動提交備份至 [GitHub 儲存庫](https://github.com/goldshoot0720/Udemygpt)，全部完成後再整理最終成果；目前仍在逐堂翻譯階段。

參考：[Mozilla 暫時安裝](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)、[OpenCC JS](https://github.com/nk2028/opencc-js)、[ChatGPT 檔案處理](https://learn.chatgpt.com/docs/use-chatgpt)。
