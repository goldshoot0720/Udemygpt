# Vue.js 日文字幕補件

本資料夾處理原課程匯出中沒有原文字幕的 14 堂。原始影片由使用者提供；影片與抽出的 AAC 音訊保存在本機，不加入 Git。來源雜湊、片長與處理進度記錄於 [progress.json](progress.json)。

日文原文缺漏也依照「無字幕影片」處理。14 堂音訊均產生了 MLX Whisper `large-v3-turbo` 與 AssemblyAI Universal-3.5 Pro 日文候選稿，並逐堂比較。這批課程含大量程式識別字；AssemblyAI 常將 API、檔名和技術名詞音譯，且第 159 堂將「靜的」辨成「性的」，所以 14 堂都保留 Whisper 原文。逐堂理由、候選檔與音訊雜湊記在[日文原文選擇報告](source-selection-ja.json)。技術名稱另依課程標題、程式畫面與課程內容校正。這是候選稿文字比較，並非逐字人工聽校。原始候選稿保留在 `transcripts/`；中譯、字幕時間軸及 source hash 維持不變。比較前的 Whisper 原文與中譯另存於[基準備份](Japanese-supplement-2426224-whisper-baseline.json)。

| 堂次 | 講座 | 語音辨識 | 繁中 | 段數 |
| ---: | --- | --- | --- | ---: |
| 7 | こうして開発環境を整える(Node.js, VSCode, create-vue) | 完成 | 完成 | 207 |
| 8 | create-vueが作成したプロジェクトはどうなっているのか | 完成 | 完成 | 414 |
| 9 | 拡張機能はこうセットアップする(Volar, ESLint, Oxlint, Prettier) | 完成 | 完成 | 234 |
| 64 | propsを利用して親から子にデータを渡す方法 | 完成 | 完成 | 344 |
| 65 | バリデーションを利用してpropsに予期しないデータが渡るのを防ぐ方法 | 完成 | 完成 | 54 |
| 66 | 高度なバリデーションをpropsに指定する方法 | 完成 | 完成 | 132 |
| 68 | emitを使ってイベントを発生させて子から親に対して通信する方法 | 完成 | 完成 | 82 |
| 69 | 引数をemitに渡して子から親にデータを渡す方法 | 完成 | 完成 | 45 |
| 70 | defineEmitsを使って明示的にemitするイベントを示す方法 | 完成 | 完成 | 55 |
| 71 | emitの命名規則はこうなっている | 完成 | 完成 | 17 |
| 73 | アプリのセットアップを行う方法 | 完成 | 完成 | 68 |
| 79 | こうして仮想DOMを使ってレンダリングをしている | 完成 | 完成 | 151 |
| 80 | 仮想DOMはコンポーネント単位ではこうなっている | 完成 | 完成 | 24 |
| 159 | こうしてTypeScriptをセットアップする | 完成 | 完成 | 109 |

- [補充日文原文與繁中譯文 JSON](Japanese-supplement-2426224.json)
- [第 7 堂中日雙語 SRT](bilingual-subtitles/Vue-007-42549830.ja.zh-TW.srt)
- [第 8 堂中日雙語 SRT](bilingual-subtitles/Vue-008-42549834.ja.zh-TW.srt)
- [第 9 堂中日雙語 SRT](bilingual-subtitles/Vue-009-42549838.ja.zh-TW.srt)
- [第 159 堂中日雙語 SRT](bilingual-subtitles/Vue-159-42563006.ja.zh-TW.srt)
- [第 80 堂中日雙語 SRT](bilingual-subtitles/Vue-080-42562654.ja.zh-TW.srt)
- [第 79 堂中日雙語 SRT](bilingual-subtitles/Vue-079-42562650.ja.zh-TW.srt)
- [第 71 堂中日雙語 SRT](bilingual-subtitles/Vue-071-42562624.ja.zh-TW.srt)
- [第 70 堂中日雙語 SRT](bilingual-subtitles/Vue-070-42562618.ja.zh-TW.srt)
- [第 69 堂中日雙語 SRT](bilingual-subtitles/Vue-069-42562616.ja.zh-TW.srt)
- [第 73 堂中日雙語 SRT](bilingual-subtitles/Vue-073-42562630.ja.zh-TW.srt)
- [第 68 堂中日雙語 SRT](bilingual-subtitles/Vue-068-42562606.ja.zh-TW.srt)
- [第 66 堂中日雙語 SRT](bilingual-subtitles/Vue-066-42562598.ja.zh-TW.srt)
- [第 65 堂中日雙語 SRT](bilingual-subtitles/Vue-065-42562596.ja.zh-TW.srt)
- [第 64 堂中日雙語 SRT](bilingual-subtitles/Vue-064-42562594.ja.zh-TW.srt)
- [課程原始匯出備份](Japanese-course-2426224-original-159.json)
- [技術名稱校正與片尾裁切紀錄](corrections.json)
- [日文缺漏清單](../../../missing-japanese-sources.json)：14 堂原文字幕缺漏與音訊路徑。
- [Whisper 選定稿基準備份](Japanese-supplement-2426224-whisper-baseline.json)：保留候選比較前的原文與中譯。
- [日文原文選擇報告](source-selection-ja.json)：14 堂 Whisper 與 AssemblyAI 比較結果。
- 安全輸入新 key 並產生候選稿：`zsh scripts/transcribe_missing_japanese_sources.zsh`（輸入時不回顯；key 不寫入檔案）。

逐堂匯入資料位於課程的 `translations/tw-*.json`；總進度位於 [translation-progress.json](../translation-progress.json)。
