# 課程英文字幕來源進度

英文原文備份與中文翻譯進度分開記錄。以下「驗證」指英文、時間軸與 SHA-256 通過檢查，不代表中文譯文已完成。

| 課程 | 英文來源狀態 | 已取得／影片總數 | 英文段數 | 翻譯批次 |
| --- | --- | ---: | ---: | ---: |
| React - The Complete Guide | 已完整驗證 | 678／678 | 80,645 | React 既有佇列 |
| Flutter & Dart - The Complete Guide | 已完整驗證 | 286／286 | 36,671 | 51 |
| NodeJS - The Complete Guide | 已完整驗證 | 479／479 | 31,419 | 42 |
| React Native - The Practical Guide | 已完整驗證 | 275／275 | 33,369 | 47 |
| CSS - The Complete Guide | 已完整驗證 | 266／266 | 15,951 | 22 |
| Svelte.js - The Complete Guide | 有缺漏，已驗證可用原文 | 168／171 | 10,225 | 14 |
| NativeScript + Angular: Build Native iOS, Android & Web Apps | 已完整驗證 | 217／217 | 15,428 | 21 |
| Remix.js - The Practical Guide | 已完整驗證 | 106／106 | 10,422 | 15 |
| Angular - The Complete Guide | 已完整驗證 | 701／701 | 63,653 | 86 |
| Next.js & React - The Complete Guide | 已完整驗證 | 417／417 | 46,195 | 64 |
| Vue - The Complete Guide (incl. Router & Composition API) | 已完整驗證 | 294／294 | 33,933 | 48 |
| Ionic - Build iOS, Android & Web Apps with Ionic & Angular | 待下載 | 待取得 | 0 | 待準備 |
| JavaScript - The Complete Guide (Beginner + Advanced) | 待下載 | 待取得 | 0 | 待準備 |

## 缺少英文字幕的影片

- Svelte.js - The Complete Guide 第 73 堂：[ Utilizing Slots ](https://www.udemy.com/course/sveltejs-the-complete-guide/learn/lecture/14689636)（沒有英文字幕）。
- Svelte.js - The Complete Guide 第 87 堂：[ Binding to Element References ](https://www.udemy.com/course/sveltejs-the-complete-guide/learn/lecture/14689664)（沒有英文字幕）。
- Svelte.js - The Complete Guide 第 111 堂：[ Wrap Up ](https://www.udemy.com/course/sveltejs-the-complete-guide/learn/lecture/14689718)（沒有英文字幕）。

缺漏影片保留在課程清單中，尚未取得的字幕不得列為完成。文字教材沒有影片字幕，與上述缺漏影片分開計算。

可先等待講師提供英文字幕，或從合法取得的音訊轉錄帶時間軸的英文 VTT／SRT 並人工校對。採用轉錄來源時，需要先在擴充功能加入外部英文字幕匯入支援，再進行中文翻譯與同步播放。目前未擷取影片音訊，也未進行語音轉錄。

## 已準備的檔案

- `data/english-download-progress.json`：13 門課的英文下載與驗證狀態。
- `data/missing-english-sources.json`：缺漏影片、堂次、連結與補件步驟。
- `data/courses/ID/English-course-ID.json`：各課原始英文備份。
- `data/courses/ID/lecture-queue/`：逐堂英文來源。
- `data/courses/ID/chatgpt-batches/`：約 800 段的翻譯批次，不拆開單堂。
- `data/courses/ID/translation-progress.json`：各課獨立翻譯進度。
- React 沿用 `data/English-course-1362070.json` 與原有逐堂佇列，保留既有翻譯進度。
