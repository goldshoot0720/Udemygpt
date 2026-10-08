# 課程字幕分類索引

所有課程以課程 ID 分開保存。點選課程名稱可查看該課的英文來源、中文譯文與進度。

> 「全部完成」代表譯文覆蓋完成；全量語意校對尚未完成。品質結果與已修正問題見 [翻譯品質檢查](../import-reports/translation-quality-review.md)；覆蓋、術語、**段落錯位**的完整核查、以及 15 堂已確認錯位講座的修正紀錄，見 [課程翻譯驗證報告 2026-10-03](../import-reports/translation-verification-2026-10-03.md)；第二輪（還原 ef88a62 錯字、全庫錯位／重複／誤譯修正）見 [第二輪報告](../import-reports/translation-verification-2026-10-03-round2.md)。


| 課程 | 課程 ID | 總堂數 | 已完成譯文 | 繁體中文譯文 |
| --- | ---: | ---: | ---: | --- |
| [React - The Complete Guide](1362070/README.md) | 1362070 | 678 | 678（全部完成） | [查看譯文](1362070/translations/README.md) |
| [Flutter & Dart - The Complete Guide](1708340/README.md) | 1708340 | 286 | 286（全部完成） | [查看譯文](1708340/translations/README.md) |
| [NodeJS - The Complete Guide](1879018/README.md) | 1879018 | 479 | 479（全部完成） | [查看譯文](1879018/translations/README.md) |
| [React Native - The Practical Guide](1436092/README.md) | 1436092 | 275 | 275（全部完成） | [查看譯文](1436092/translations/README.md) |
| [CSS - The Complete Guide](1561458/README.md) | 1561458 | 266 | 266（全部完成） | [查看譯文](1561458/translations/README.md) |
| [Svelte.js - The Complete Guide](2360566/README.md) | 2360566 | 171 | 171（全部完成） | [查看譯文](2360566/translations/README.md) |
| [NativeScript + Angular: Build Native iOS, Android & Web Apps](2126948/README.md) | 2126948 | 217 | 217（全部完成） | [查看譯文](2126948/translations/README.md) |
| [Remix.js - The Practical Guide](4958062/README.md) | 4958062 | 106 | 106（全部完成） | [查看譯文](4958062/translations/README.md) |
| [Angular - The Complete Guide](756150/README.md) | 756150 | 701 | 701（全部完成） | [查看譯文](756150/translations/README.md) |
| [Next.js & React - The Complete Guide](3873464/README.md) | 3873464 | 417 | 417（全部完成） | [查看譯文](3873464/translations/README.md) |
| [Vue - The Complete Guide (incl. Router & Composition API)](995016/README.md) | 995016 | 294 | 294（全部完成） | [查看譯文](995016/translations/README.md) |
| [Ionic - Build iOS, Android & Web Apps with Ionic & Angular](1070124/README.md) | 1070124 | 242 | 242（全部完成） | [查看譯文](1070124/translations/README.md) |
| [JavaScript - The Complete Guide (Beginner + Advanced)](2508942/README.md) | 2508942 | 540 | 540（全部完成） | [查看譯文](2508942/translations/README.md) |
| [ChatGPT & Generative AI - The Complete Guide](5291332/README.md) | 5291332 | 待匯出 | 0（待匯出英文字幕） | [查看譯文](5291332/translations/README.md) |

13 門已完成課程影片講座合計 4,672 堂（不含文章與測驗）；第 14 門 ChatGPT & Generative AI 已加入擴充功能支援，尚待匯出英文字幕。

13 門課影片講座合計 4,672 堂（不含文章與測驗）。React 優先處理、678 堂已全部完成（每 25 堂自動提交）。Remix 106 堂已全部完成（10,422 段）；Svelte 171 堂已全部完成（10,409 段）；NativeScript 217 堂已全部完成（15,428 段）。Vue 294 堂已全部完成。Ionic 242 堂已全部完成；React Native 275 堂已全部完成；CSS 266 堂已全部完成；Flutter 已完成 286 堂（全部完成，36,671 段）；Next.js 417 堂已全部完成（46,195 段）；NodeJS 已全部完成 479 堂（31,419 段）；JavaScript 已全部完成 540 堂（37,567 段）；Angular 已完成 701 堂；Svelte 含 3 堂音訊補件譯文。剩餘課程依各課即時翻譯進度接續處理。

每課分類：

- `English-course-ID.json`：完整英文來源。
- `lecture-queue/`：逐堂英文。
- `chatgpt-batches/`：英文翻譯批次。
- `translations/`：繁體中文譯文。
- `translation-progress.json`：驗證、匯入與待處理狀態。
- `curriculum.json`：完整課程清單。

Svelte 的 `repair/` 額外保存音訊轉錄與校正證據；各課 `imports/` 保存原始下載備份。跨課程匯出與整理紀錄集中在 `data/import-reports/`。
