# 課程字幕分類索引

所有課程以課程 ID 分開保存。點選課程名稱可查看該課的英文來源、中文譯文與進度。

| 課程 | 課程 ID | 總堂數 | 已完成譯文 | 繁體中文譯文 |
| --- | ---: | ---: | ---: | --- |
| [React - The Complete Guide](1362070/README.md) | 1362070 | 678 | 678（全部完成） | [查看譯文](1362070/translations/README.md) |
| [Flutter & Dart - The Complete Guide](1708340/README.md) | 1708340 | 286 | 40 | [查看譯文](1708340/translations/README.md) |
| [NodeJS - The Complete Guide](1879018/README.md) | 1879018 | 479 | 40 | [查看譯文](1879018/translations/README.md) |
| [React Native - The Practical Guide](1436092/README.md) | 1436092 | 275 | 40 | [查看譯文](1436092/translations/README.md) |
| [CSS - The Complete Guide](1561458/README.md) | 1561458 | 266 | 40 | [查看譯文](1561458/translations/README.md) |
| [Svelte.js - The Complete Guide](2360566/README.md) | 2360566 | 171 | 100 | [查看譯文](2360566/translations/README.md) |
| [NativeScript + Angular: Build Native iOS, Android & Web Apps](2126948/README.md) | 2126948 | 217 | 50 | [查看譯文](2126948/translations/README.md) |
| [Remix.js - The Practical Guide](4958062/README.md) | 4958062 | 106 | 106（全部完成） | [查看譯文](4958062/translations/README.md) |
| [Angular - The Complete Guide](756150/README.md) | 756150 | 701 | 40 | [查看譯文](756150/translations/README.md) |
| [Next.js & React - The Complete Guide](3873464/README.md) | 3873464 | 417 | 40 | [查看譯文](3873464/translations/README.md) |
| [Vue - The Complete Guide (incl. Router & Composition API)](995016/README.md) | 995016 | 294 | 90 | [查看譯文](995016/translations/README.md) |
| [Ionic - Build iOS, Android & Web Apps with Ionic & Angular](1070124/README.md) | 1070124 | 242 | 92 | [查看譯文](1070124/translations/README.md) |
| [JavaScript - The Complete Guide (Beginner + Advanced)](2508942/README.md) | 2508942 | 540 | 40 | [查看譯文](2508942/translations/README.md) |

13 門課影片講座合計 4,672 堂（不含文章與測驗）。React 優先處理、678 堂已全部完成（每 25 堂自動提交）。Remix 106 堂已全部完成（10,422 段）；Svelte 已完成前 100 堂；NativeScript 已完成前 50 堂。Vue 已完成前 90 堂。Ionic 已完成 92 堂；CSS、React Native、Flutter、Next.js、NodeJS、JavaScript 與 Angular 已完成前 40 堂；Svelte 含 3 堂音訊補件譯文。下一輪從 Svelte 或堂數少的課程繼續。

每課分類：

- `English-course-ID.json`：完整英文來源。
- `lecture-queue/`：逐堂英文。
- `chatgpt-batches/`：英文翻譯批次。
- `translations/`：繁體中文譯文。
- `translation-progress.json`：驗證、匯入與待處理狀態。
- `curriculum.json`：完整課程清單。

Svelte 的 `repair/` 額外保存音訊轉錄與校正證據；各課 `imports/` 保存原始下載備份。跨課程匯出與整理紀錄集中在 `data/import-reports/`。
