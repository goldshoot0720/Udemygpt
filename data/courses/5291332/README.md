# ChatGPT & Generative AI - The Complete Guide

課程 ID：`5291332`；[返回課程索引](../README.md)。

講師：Academind（Maximilian Schwarzmüller、Manuel Lorenz）。目前 14 門課中的第 14 門。

## 狀態：待匯出英文字幕

此課程已加入擴充功能支援清單（`udemy-bilingual/courses.js`），但**尚未取得英文字幕來源**，
因此還沒有英文檔、批次與中文譯文。取得方式需要登入的 Udemy 瀏覽器工作階段：

1. 在 Firefox 重新載入最新版擴充功能（`about:debugging#/runtime/this-firefox` → 「重新載入」）。
2. 開啟 <https://www.udemy.com/course/chatgpt-bard-bing-complete-guide-to-chatgpt-openai-apis/learn/>。
3. 網址加上 `?subtitleExport=batch`，按「匯出全課英文」，下載 JSON。
4. 執行 `node prepare_course_sources.cjs /完整路徑/Udemy-English-course-5291332.json`。

完成第 4 步後，本資料夾才會出現下列檔案：

- [完整英文來源](English-course-5291332.json)
- [課程清單](curriculum.json)
- `lecture-queue/`：逐堂英文。
- `chatgpt-batches/`：待翻譯的英文批次（約 800 段一批）。
- `translations/`：繁體中文譯文。
- [翻譯與匯入進度](translation-progress.json)

未取得英文來源前不可產生譯文，也不可宣稱任何一堂已完成翻譯。