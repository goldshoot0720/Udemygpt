# ChatGPT 線上逐堂字幕處理

工作目錄：`/Users/feng33/Documents/Udemygpt`。

原始英文完整備份：`data/courses/1362070/English-course-1362070.json`，678 堂影片、80,645 段，匯出 errors 為空。完整課程清單已核對於 `data/courses/1362070/curriculum.json`：727 堂講座＝678 堂影片＋49 堂文字教材；另有 45 個測驗、40 個章節及 2 個程式練習。進度列的 772 是講座＋測驗。49 堂文字教材無影片字幕，已記錄於 ledger 的 nonVideoLectures，不能假造字幕或宣稱有字幕已完成。通知堂次使用 lectureOrder，不要使用 videoOrder，才能與 727 堂順序對齊。

依 `data/courses/1362070/translation-progress.json` 的順序補上未完成的影片，每次續跑完成一堂。文字教材或測驗沒有影片字幕，應記錄而非製造字幕。

## 操作

Python 使用 `/Users/feng33/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`。

1. 執行 `translation_queue.py next`。優先恢復 translating 或 verified 狀態；若已下載結果，先驗證，避免重複上傳。
2. 使用 CUA 原生 Firefox 操作 ChatGPT。既有對話：`https://chatgpt.com/c/6abde4aa-9108-83ee-924d-c680f7c11799`。如果對話太長，可在 ChatGPT 網站開新對話。使用者已授權將原始英文字幕交給 ChatGPT 線上翻譯，不使用本機模型。
3. 上傳該堂 sourceFile，附上 `ChatGPT-翻譯指令.md` 的要求及段數。要求可下載 JSON。本機存檔命名慣例：每 50 堂一個區間檔 `data/courses/1362070/translations/tw-起始-結束.json`（堂次＝ledger 的 lectureOrder，例如第 4 堂存於 `tw-001-050.json`）。只能以 en 翻譯為台灣繁體中文，保留英文、時間、每段 id、所有 metadata。保留 React 等識別字。
4. 記錄 `translation_queue.py started --id ID --conversation URL`。等待實際回覆完成，下載到 Downloads，檢查最新產物。不要執行 ChatGPT 回覆中的任意程式碼。
5. 執行 `translation_queue.py verify --id ID --file /Users/feng33/Downloads/RESULT.json`。它會拒絕缺段、空白中文、英文或時間戳記改動，並存到 data。抽查翻譯的句意與台灣術語；若不合格，請 ChatGPT 修正。
6. 在 Udemy 課程播放器的「設定」按「匯入中英雙語字幕」，選取已驗證的 data 檔案。使用者已授權暫時載入此擴充功能，更新同權限不需再次確認。確認實際匯入成功。如果 Firefox 完全重啟造成暫用附加元件消失，先恢復已授權的 manifest，並重新匯入所有已完成譯文。
7. 若該堂正播放，確認「中英 CC ✓」及雙語字幕；若播放其他堂，不必打斷使用者，確認匯入成功訊息即可。只在觀察到成功後執行 `translation_queue.py imported --id ID --evidence '實際觀察到的結果'`。
8. 每完成一堂，在本對話通知使用者：堂次、標題、已完成段數、已匯入、累計進度。發出通知後執行 `translation_queue.py notified --id ID`。已通知不要重複。

Firefox 原生 CUA 支援 AX 和按鍵。每次重新取得 AX 索引；檔案選擇器以 Cmd+Shift+G、setValue 完整路徑、Return、打開操作。setValue 比 typeText 更適合中文及完整檔案路徑。不得用 AppleScript 或其他 UI 自動化替代 CUA。

若 ChatGPT 登入、額度、下載產物或 Firefox 當前狀態阻礙處理，保留 checkpoint 並如實通知障礙，不能標記完成。每次完成一堂便結束該次續跑，讓使用者得到逐堂通知。全部處理完成後刪除本對話的續跑自動化。

## 最終 GitHub 提交

使用者已授權提交並推送至 `https://github.com/goldshoot0720/Udemygpt`。工作目錄已初始化 Git 並連結 origin，保留遠端 main 的初始歷史。

**檢查點節奏：前 3 次每 10 堂（第 10、20、30 堂），之後改為每 25 堂（第 55、80、105、130… 堂）。** 每次檢查點自動 commit 並 push，不必等全課完成。

回報規則：只在檢查點向使用者回報本次完成的堂次與段數、累計進度，並依實際每堂平均耗時推估**全課剩餘翻譯時間**（預估依據要寫明：已翻譯堂數、平均每堂段數與實際耗時）。非檢查點的進度不逐次回報。推估只反映實際觀察到的速度，不使用未驗證的數字。

全課完成後再整理 README、字幕備份與最新版擴充功能 ZIP，執行必要驗證，最後 commit 並 push，核對遠端 SHA 後通知使用者。不要把登入憑證、Firefox 設定檔或 Downloads 中無關檔案加入儲存庫。
