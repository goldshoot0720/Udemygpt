# Svelte 三堂補充字幕

原 Udemy 英文備份有 168／171 堂影片。2026-10-01 重新檢查第 73、87、111 堂的字幕清單，均只有德語、法語、葡萄牙語、印尼語及義大利語的自動字幕，未提供英文。

| 堂次 | 講座 | 已取得音訊 | 英文字幕狀態 |
| --- | --- | --- | --- |
| 73 | Utilizing Slots | 5 分 11.360 秒 | 73 段已驗證、已匯入並播放核對 |
| 87 | Binding to Element References | 5 分 16.992 秒 | 91 段已驗證、已匯入並播放核對 |
| 111 | Wrap Up | 1 分 21.856 秒 | 20 段已驗證、已匯入並播放核對 |

3 堂影片均由播放器的「下載講座」取得，再抽出 AAC 音軌。素材已移至本資料夾的 `media/`：`videos/` 為原始影片、`audio/` 為音訊、`frames/` 為參考畫面。音訊完整路徑為 `/Users/feng33/Documents/Udemygpt/data/courses/2360566/repair/media/audio/`；影片、音訊與模型不加入 Git。檔案雜湊與取得證據見 [progress.json](progress.json)。

英文使用 [MLX Whisper](https://github.com/ml-explore/mlx-examples/blob/main/whisper/README.md) 的語音辨識，設定 `task=transcribe`、`language=en`。已逐堂核對內容與片長、修正技術識別字並整理過短段落，建立 184 段原文與時間軸 SHA-256。原始轉錄保留於 `transcripts/`；修正紀錄見 [corrections.json](corrections.json)。這是自動語音辨識結果，尚未完成逐字人工聽校。中文由 [ChatGPT 網站](https://chatgpt.com/c/6abe52bb-b7d0-83ee-9188-e52943086c06) 線上翻譯。

擴充功能 2.4.1 已加入「匯入補充英文字幕」。補充 JSON 的各堂 `sourceOrigin` 必須為 `audio-transcription`，並通過課程 ID、逐段編號、非空英文、時間軸與 SHA-256 驗證。僅在 Udemy 未提供英文字幕時採用補充來源；API 權限讀取失敗不會使用補充字幕。譯文也必須符合相同原文雜湊。

Svelte 英文來源已補齊為 171／171 堂、10,409 段：168 堂 Udemy 原文＋3 堂轉錄。原有 168 堂逐堂資料與雜湊保持完整，原始檔案另存 [English-course-2360566-original-168.json](English-course-2360566-original-168.json)。

3 堂共 184 段繁體中文均非空；除 `zh` 外，所有欄位逐一比對相同，包括英文、時間、編號與來源資訊。修正過一次跨段重複文字，紀錄見 [translation-corrections.json](translation-corrections.json)；驗證報告見 [translation-verification.json](translation-verification.json)。

- [補充英文字幕 JSON](English-supplement-2360566.json)：在 Svelte 播放器設定內匯入補充英文字幕。
- [完整中英字幕 JSON](../translations/ChatGPT-Svelte-supplement-2360566.zh-TW.json)：匯入中英雙語字幕即可同時儲存 3 堂補充英文與中文。
- [progress.json](progress.json)：各堂實際匯入與播放核對證據。

這次只翻譯補件的 3 堂；其餘 168 堂的中文進度保留原有狀態。

Firefox 實際核對：三堂均顯示「中英 CC ✓」及各自 73／91／20 段就緒，標示英文來源為音訊轉錄；逐堂播放確認畫面同時顯示繁體中文與英文，測試後暫停。擴充功能 6 個測試檔案均通過，2.4.1 ZIP 完整性檢查通過。
