# 課程英文字幕來源進度

英文原文備份與中文翻譯進度分開記錄。以下「驗證」指英文、時間軸與 SHA-256 通過檢查，不代表中文譯文已完成。

| 課程 | 英文來源狀態 | 已取得／影片總數 | 英文段數 | 翻譯批次 |
| --- | --- | ---: | ---: | ---: |
| React - The Complete Guide | 已完整驗證 | 678／678 | 80,645 | React 既有佇列 |
| Flutter & Dart - The Complete Guide | 已完整驗證 | 286／286 | 36,671 | 51 |
| NodeJS - The Complete Guide | 已完整驗證 | 479／479 | 31,419 | 42 |
| React Native - The Practical Guide | 已完整驗證 | 275／275 | 33,369 | 47 |
| CSS - The Complete Guide | 已完整驗證 | 266／266 | 15,951 | 22 |
| Svelte.js - The Complete Guide | 英文來源完整：168 堂 Udemy＋3 堂音訊轉錄 | 171／171 | 10,409 | 14 |
| NativeScript + Angular: Build Native iOS, Android & Web Apps | 已完整驗證 | 217／217 | 15,428 | 21 |
| Remix.js - The Practical Guide | 已完整驗證 | 106／106 | 10,422 | 15 |
| Angular - The Complete Guide | 已完整驗證 | 701／701 | 63,653 | 86 |
| Next.js & React - The Complete Guide | 已完整驗證 | 417／417 | 46,195 | 64 |
| Vue - The Complete Guide (incl. Router & Composition API) | 已完整驗證 | 294／294 | 33,933 | 48 |
| Ionic - Build iOS, Android & Web Apps with Ionic & Angular | 已完整驗證 | 242／242 | 13,917 | 19 |
| JavaScript - The Complete Guide (Beginner + Advanced) | 已完整驗證 | 540／540 | 37,567 | 50 |

已取得 4,672／4,672 堂影片的英文字幕來源，共 429,579 段；新增 12 門課已整理為 479 個翻譯批次。React 沿用既有佇列。13 門英文來源完整，其中 Svelte 的 3 堂使用 AssemblyAI Universal-3.5 Pro 音訊轉錄補充，共 184 段；和先前的 Whisper 結果比較後採用 AssemblyAI 原文。

原始瀏覽器匯出報告：[2026-10-01 英文匯出報告](import-reports/english-export-report-2026-10-01.json)。

## 已由音訊轉錄補充的影片

- Svelte.js - The Complete Guide 第 73 堂：[Utilizing Slots](https://www.udemy.com/course/sveltejs-the-complete-guide/learn/lecture/14689636)（沒有英文字幕）。
- Svelte.js - The Complete Guide 第 87 堂：[Binding to Element References](https://www.udemy.com/course/sveltejs-the-complete-guide/learn/lecture/14689664)（沒有英文字幕）。
- Svelte.js - The Complete Guide 第 111 堂：[Wrap Up](https://www.udemy.com/course/sveltejs-the-complete-guide/learn/lecture/14689718)（沒有英文字幕）。

這 3 堂仍沒有 Udemy 英文字幕，已使用播放器提供的影片音訊建立補充英文來源。原有 168 堂官方字幕原文與雜湊保持完整。文字教材沒有影片字幕，與影片分開計算。

擴充功能 2.4.1 已支援補充英文字幕匯入。補充來源已比對技術識別字、講座內容與時間軸，但仍屬語音辨識結果，未完成逐字人工聽校。播放器會標示「英文來源：音訊轉錄」；詳見 [Svelte 三堂補充字幕進度](courses/2360566/repair/README.md)。

## 已準備的檔案

- `data/english-download-progress.json`：13 門課的英文下載與驗證狀態。
- `data/missing-english-sources.json`：缺漏影片、堂次、連結與補件步驟。
- `data/courses/ID/English-course-ID.json`：各課英文來源；Svelte 包含明確標示的 3 堂轉錄來源，原始 168 堂備份另保留於 repair。
- `data/courses/ID/lecture-queue/`：逐堂英文來源。
- `data/courses/ID/chatgpt-batches/`：約 800 段的翻譯批次，不拆開單堂。
- `data/courses/ID/translation-progress.json`：各課獨立翻譯進度。
- React 也統一歸入 `data/courses/1362070/`，保留既有逐堂佇列與翻譯進度。
