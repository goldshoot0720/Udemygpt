# Udemy 中英雙語特效字幕

Firefox、Chrome、Edge 開發者載入包與 Safari 轉換來源包見 [GitHub Releases](https://github.com/goldshoot0720/Udemygpt/releases)。安裝方式與簽章限制見 [安裝指南](releases/INSTALL.md)。執行 `python3 scripts/build_extensions.py` 可重建四種套件，輸出至 `dist/v版本/`。

支援課程的字幕流程：**英文原字幕 → ChatGPT 線上逐段翻譯 → 台灣繁體術語檢查 → 依英文時間軸顯示**。

版本 2.0 不再下載或使用 Udemy 中文字幕，也不使用本機翻譯模型。尚未完成英文預譯的講座只顯示英文，左上角會標示「中文待翻譯」。

13 門課的字幕已統一依課程分類，從 [課程字幕索引](data/courses/README.md) 按課程名稱查看。各課使用 `data/courses/課程ID/`，繁體中文譯文放在其中的 `translations/`，英文來源、翻譯佇列與進度也保存在同一課程資料夾。

## 支援課程（2.3）

以下 13 門課程的講師皆為 **Maximilian Schwarzmüller**。

- [React - The Complete Guide](https://www.udemy.com/course/react-the-complete-guide-incl-redux/) — 678 堂
- [Flutter & Dart - The Complete Guide](https://www.udemy.com/course/learn-flutter-dart-to-build-ios-android-apps/) — 286 堂
- [NodeJS - The Complete Guide](https://www.udemy.com/course/nodejs-the-complete-guide/) — 479 堂
- [React Native - The Practical Guide](https://www.udemy.com/course/react-native-the-practical-guide/) — 275 堂
- [CSS - The Complete Guide](https://www.udemy.com/course/css-the-complete-guide-incl-flexbox-grid-sass/) — 266 堂
- [Svelte.js - The Complete Guide](https://www.udemy.com/course/sveltejs-the-complete-guide/) — 171 堂
- [NativeScript + Angular](https://www.udemy.com/course/nativescript-angular-build-native-ios-android-web-apps/) — 217 堂
- [Remix.js - The Practical Guide](https://www.udemy.com/course/remix-course/) — 106 堂
- [Angular - The Complete Guide](https://www.udemy.com/course/the-complete-guide-to-angular-2/) — 701 堂
- [Next.js & React - The Complete Guide](https://www.udemy.com/course/nextjs-react-the-complete-guide/) — 417 堂
- [Vue - The Complete Guide (incl. Router & Composition API)](https://www.udemy.com/course/vuejs-2-the-complete-guide/) — 294 堂
- [Ionic - Build iOS, Android & Web Apps with Ionic & Angular](https://www.udemy.com/course/ionic-2-the-practical-guide-to-building-ios-android-apps/) — 242 堂
- [JavaScript - The Complete Guide (Beginner + Advanced)](https://www.udemy.com/course/javascript-the-complete-guide-2020-beginner-advanced/) — 540 堂

13 門課合計 **4,672** 堂影片（不含文章與測驗）。

在上述課程的 `learn/` 播放器頁面啟用。課程 ID 自動從 Udemy 取得；本堂及全課英文匯出、譯文匯入均使用目前課程 ID，譯文依課程分開儲存，並相容既有 React 譯文。新增支援不代表字幕已翻譯；新課程需先匯出英文，再交給 ChatGPT 翻譯與匯入。

更新後在 `about:debugging#/runtime/this-firefox` 重新載入此附加元件，再重新整理課程播放器頁面。

## 課程影片分鐘數（2.4）

點選播放器左上角「設定」後，面板才顯示目前講座、總影片分鐘數、已觀看分鐘數與未觀看分鐘數；關閉設定或按 Escape 即隱藏。讀取完整課程清單中的影片時長，只累加影片；文章及測驗不計入影片分鐘數。講座編號保留文章項目，例如 React 的 `23. Destructuring`。

已觀看採「依序觀看估算」：目前講座之前的影片總長＋本堂播放位置；未觀看＝總影片分鐘數－已觀看。播放、暫停、前後跳轉及切換講座會自動更新，以原速影片長度計算，不受倍速或字幕時間校正影響。這不是 Udemy 完成勾選或實際觀看歷史；跳過前面的影片仍會算入依序進度。

React 標示的 71 小時換算為約 4,260 分鐘；面板優先使用各堂影片的實際時長加總，所以可能與整數小時標示略有差異。時長缺漏時顯示待補及「—」，避免把不完整加總當成完整時長；可按「重新讀取時長」重試。

## 播放與縮放

繁體中文在上，英文在下，支援關鍵字光暈＋淡入、電影描邊、簡潔閱讀。播放器左上角「中英 CC」可開關，「設定」可調整字體、字幕高度與時間校正。

字幕與面板會補償 Firefox 的頁面縮放，包含 150%。長中文字幕會依播放器寬度縮小字級；播放器變窄或進入全螢幕也會重新計算，字幕框使用較小留白。

使用台灣術語：元件、陣列、物件、函式、變數、字串、布林、程式碼、資料、資料庫、專案、函式庫、預設、呼叫、載入、非同步、回呼、快取、伺服器、介面、原始碼。React／JSX／Hooks／props／API 識別字保留英文。

## 翻譯與匯入

在已登入的課程播放器網址加上 `?subtitleExport=batch`（原本已有查詢參數則加上 `&subtitleExport=batch`），即可開啟「課程英文字幕匯出」。此專用分頁須保持開啟，可逐課下載目前清單中的英文 JSON 與匯出報告。預設沿用 React 既有完整英文備份；影片與文章清單分別記錄，缺少英文字幕或無觀看權限的項目會列入報告。選項頁也有相同介面；若跨來源請求無回應，使用播放器內的匯出頁。

下載後執行 `node prepare_course_sources.cjs /完整路徑/Udemy-English-course-ID.json`，驗證英文、時間軸雜湊、影片覆蓋範圍與缺漏記錄，並在 `data/courses/ID/` 保存原文、逐堂英文檔及約 800 段的 ChatGPT 批次（不拆開單堂）。各課程獨立的翻譯進度會初始化為待翻譯；既有進度不會重設。`data/english-download-progress.json` 記錄 13 門課的下載與驗證狀態，和 React 既有翻譯進度分開。

英文來源的逐課統計與缺漏處理方式見 [課程英文字幕來源進度](data/english-source-summary.md)。沒有英文字幕的影片先列為待補來源；若改由影片音訊轉錄，需校對英文與時間軸。擴充功能 2.4.1 可在設定中「匯入補充英文字幕」；只有 Udemy 未提供英文字幕時才使用轉錄來源。補充來源與 ChatGPT 譯文都驗證課程、段數及原文時間軸雜湊。Svelte 三堂已補齊 184 段英文與 ChatGPT 繁體中文、匯入並逐堂播放核對；專用進度見 [補充字幕進度](data/courses/2360566/repair/README.md)。

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
- `data/courses/README.md`：按課程名稱查找英文來源、中文譯文與進度。
- `data/courses/課程ID/`：各課完整英文來源、課程清單、逐堂英文、翻譯批次與獨立進度。
- `data/courses/課程ID/translations/`：各課繁體中文譯文；React 以每 50 堂的 `tw-起始-結束.json` 保存，Svelte 補件中英字幕也集中在此。
- `data/courses/課程ID/imports/`：原始字幕 JSON 與課程清單下載備份，保留原檔名，僅保存在本機。
- `data/import-reports/`：原始匯出報告與搬移紀錄，`migration-2026-10-01.json` 記錄原路徑、新路徑及 SHA-256。
- `data/courses/2360566/repair/media/`：Svelte 補字幕用的影片、音訊與參考畫面，分別放在 `videos/`、`audio/`、`frames/`，僅保留於本機。
- `ChatGPT-翻譯指令.md`：逐段翻譯及台灣術語要求。
- `tests/subtitle-core.test.cjs`：字幕時間邊界、重疊、倒退跳轉、語言選取及台灣術語驗證。

## 其他課程（堂數少的優先，跳過 React）

`course_queue.py` 處理 React 以外的 12 門課，依堂數由少到多排序：Remix 106 → Svelte 171 → NativeScript 217 → Ionic 242 → CSS 266 → React Native 275 → Flutter 286 → Vue 294 → Next.js 417 → NodeJS 479 → JavaScript 540 → Angular 701。這 12 門課合計 3,994 堂影片。各課堂數與進度一覽見 [課程字幕分類索引](data/courses/README.md)。

Remix 已全部完成 106 堂（10,422 段）。Svelte 已全部完成 171 堂（10,409 段，含 3 堂音訊補件）。NativeScript 217 堂已全部完成（15,428 段）。Ionic 已全部完成 242 堂（13,917 段）。CSS 已驗證前 155 堂（9,540 段）。React Native 已全部完成 275 堂（33,369 段）。Flutter 已驗證 102 堂（12,804 段）。Vue 已驗證 240 堂（26,348 段）。Next.js 已驗證 90 堂（10,174 段）。NodeJS 已驗證 90 堂（7,904 段）。JavaScript 已驗證 90 堂（5,657 段）。Angular 已驗證 106 堂（10,648 段）。下一輪從 Svelte 或堂數少的課程繼續。

- `python3 course_queue.py order`：列出課程順序與完成堂數。
- `python3 course_queue.py next`：取得最小未完成課程的下一堂（`--course ID` 限定課程）。
- `python3 course_queue.py verify --course ID --file ChatGPT結果.json`：可放單堂或整個 `chatgpt-batches` 批次結果；驗證後依 lectureOrder 併入 `translations/tw-起始-結束.json`，並更新該課 `translation-progress.json`。
- `python3 course_queue.py imported --course ID --id 講座ID --evidence '實際匯入結果'`。

## 中英雙語特效字幕檔（.ass）

`python3 export_ass.py 課程ID` 把 `translations/` 中已完成的講座合併為中英雙語 `.ass`，輸出到 `data/courses/課程ID/subtitles-ass/`（不加入 Git）。繁體中文在上、英文在下，樣式對應擴充功能：`--effect glow`（預設，光暈底框＋淡入＋關鍵字高亮）、`cinema`（電影描邊）、`minimal`（簡潔閱讀）。另有 `--lecture 講座ID`、`--offset 秒數`、`--font 字型`。可用 VLC、PotPlayer、IINA 等播放器載入。

## 逐堂處理進度

`translation_queue.py` 專用於 React，讀寫 `data/courses/1362070/`。其他課程的英文來源、逐堂佇列及翻譯批次同樣保存在各自的 `data/courses/課程ID/`；每課 `translation-progress.json` 記錄自己的中文進度，下載英文不代表譯文已完成。補件來源另列於 `data/missing-english-sources.json`。

已核對完整清單：727 堂講座包含 678 堂影片與 49 堂文字教材；文字教材沒有影片字幕。678 堂的 80,645 段原始英文字幕均已取得，逐堂交給 ChatGPT 線上翻譯。

`data/courses/1362070/translation-progress.json` 保留每堂英文檔、翻譯檔、驗證與匯入狀態。`translation_queue.py next` 取得下一堂；`verify` 核對完整結果，`imported` 必須附上實際觀察到的匯入證據。每完成一堂通知一次，可中斷後續接。詳細步驟見 `ONLINE-WORKFLOW.md`。

使用者指定優先處理 React，每 25 堂自動提交備份至 [GitHub 儲存庫](https://github.com/goldshoot0720/Udemygpt)。React 已全部完成 678 堂（第 676-678 堂已提交；每 25 堂自動提交）。其他課程由堂數少的開始。Remix 106 堂已全部完成；Svelte 171 堂已全部完成；NativeScript 217 堂已全部完成（15,428 段）。Vue 已完成 240 堂。Ionic 242 堂已全部完成；React Native 275 堂已全部完成；CSS 已完成前 155 堂；Flutter 已完成 102 堂；Next.js 已完成 90 堂；NodeJS 已完成 90 堂；JavaScript 已完成 90 堂；Angular 已完成 106 堂。下一輪從 Svelte 或堂數少的課程繼續。

參考：[Mozilla 暫時安裝](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)、[OpenCC JS](https://github.com/nk2028/opencc-js)、[ChatGPT 檔案處理](https://learn.chatgpt.com/docs/use-chatgpt)。
