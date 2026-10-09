# Svelte 三堂補充字幕

原 Udemy 英文備份有 168／171 堂影片。2026-10-01 重新檢查第 73、87、111 堂的字幕清單，均只有德語、法語、葡萄牙語、印尼語及義大利語的自動字幕，未提供英文。

| 堂次 | 講座 | 已取得音訊 | 英文字幕狀態 |
| --- | --- | --- | --- |
| 73 | Utilizing Slots | 5 分 11.360 秒 | 73 段；AssemblyAI 信心值 0.989 |
| 87 | Binding to Element References | 5 分 16.992 秒 | 91 段；AssemblyAI 信心值 0.991 |
| 111 | Wrap Up | 1 分 21.856 秒 | 20 段；AssemblyAI 信心值 0.989 |

3 堂影片均由播放器的「下載講座」取得，再抽出 AAC 音軌。素材已移至本資料夾的 `media/`：`videos/` 為原始影片、`audio/` 為音訊、`frames/` 為參考畫面。音訊完整路徑為 `/Users/feng33/Documents/Udemygpt/data/courses/2360566/repair/media/audio/`；影片、音訊與模型不加入 Git。檔案雜湊與取得證據見 [progress.json](progress.json)。

初版使用 [MLX Whisper](https://github.com/ml-explore/mlx-examples/blob/main/whisper/README.md)，原始稿保留在 `transcripts/`。2026-10-09 再用 AssemblyAI Universal-3.5 Pro 轉錄並逐堂比較；技術用語較完整的 AssemblyAI 結果選為目前英文原文，候選稿保留於 `transcripts/assemblyai/`。候選稿的逐字時間戳映射至原有字幕分段，維持 73／91／20 段與既有中文譯文，並重新計算原文雜湊。選擇原因與雜湊記錄於 [assemblyai-selection.json](assemblyai-selection.json)。這仍是自動語音辨識結果，尚未逐字聽校。中文原譯由 [ChatGPT 網站](https://chatgpt.com/c/6abe52bb-b7d0-83ee-9188-e52943086c06) 產生；本次只更新英文來源與時間戳，保留原有繁體中文內容。

擴充功能 2.4.1 已加入「匯入補充英文字幕」。補充 JSON 的各堂 `sourceOrigin` 必須為 `audio-transcription`，並通過課程 ID、逐段編號、非空英文、時間軸與 SHA-256 驗證。僅在 Udemy 未提供英文字幕時採用補充來源；API 權限讀取失敗不會使用補充字幕。譯文也必須符合相同原文雜湊。

Svelte 英文來源已補齊為 171／171 堂、10,409 段：168 堂 Udemy 原文＋3 堂轉錄。原有 168 堂逐堂資料與雜湊保持完整，原始檔案另存 [English-course-2360566-original-168.json](English-course-2360566-original-168.json)。

3 堂共 184 段繁體中文均非空；本次英文與時間戳更新後，中文內容雜湊仍與更新前相同。修正過一次跨段重複文字，紀錄見 [translation-corrections.json](translation-corrections.json)；目前原文雜湊與中文保留狀態見 [translation-verification.json](translation-verification.json)。

- [補充英文字幕 JSON](English-supplement-2360566.json)：在 Svelte 播放器設定內匯入補充英文字幕。
- [完整中英字幕 JSON](../translations/ChatGPT-Svelte-supplement-2360566.zh-TW.json)：匯入中英雙語字幕即可同時儲存 3 堂補充英文與中文。
- [progress.json](progress.json)：各堂實際匯入與播放核對證據。
- [AssemblyAI 原始候選稿](transcripts/assemblyai/)：原始逐字文字、逐字時間戳與模型信心值。
- [候選稿轉錄工具](../../../../scripts/transcribe_missing_assemblyai.py)：依 `data/missing-english-sources.json` 上傳有音訊的無英文字幕講座；key 從 `ASSEMBLYAI_API_KEY` 環境變數讀取，不寫入檔案。
- [原文選擇與同步工具](select-assemblyai-source.cjs)：保留逐堂分段和譯文，更新目前選定英文與時間戳。

這次只翻譯補件的 3 堂；其餘 168 堂的中文進度保留原有狀態。

Firefox 曾核對舊 Whisper 來源的三堂字幕均正常顯示。新版 AssemblyAI 英文來源已更新到匯入 JSON；Firefox 本機儲存仍需重新匯入 [完整中英字幕 JSON](../translations/ChatGPT-Svelte-supplement-2360566.zh-TW.json) 才會同步新的原文雜湊與時間戳。
