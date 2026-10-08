# Vue.js 日文字幕補件

本資料夾處理原課程匯出中沒有原文字幕的 14 堂。原始影片由使用者提供；影片與抽出的 AAC 音訊保存在本機，不加入 Git。來源雜湊、片長與處理進度記錄於 [progress.json](progress.json)。

日文原文以 MLX Whisper `large-v3-turbo` 自動語音辨識。技術名稱依課程標題、程式畫面與課程內容校正；原始辨識輸出保留在 `transcripts/`。這不是逐字人工聽校。繁體中文譯文保留相同時間軸與日文原文，並提供可直接播放的中日雙語 SRT。

| 堂次 | 講座 | 語音辨識 | 繁中 | 段數 |
| ---: | --- | --- | --- | ---: |
| 7 | こうして開発環境を整える(Node.js, VSCode, create-vue) | 完成 | 完成 | 207 |
| 8 | create-vueが作成したプロジェクトはどうなっているのか | 完成 | 完成 | 414 |
| 9 | 拡張機能はこうセットアップする(Volar, ESLint, Oxlint, Prettier) | 完成 | 完成 | 234 |
| 64 | propsを利用して親から子にデータを渡す方法 | 完成 | 待處理 | — |
| 65 | バリデーションを利用してpropsに予期しないデータが渡るのを防ぐ方法 | 完成 | 待處理 | — |
| 66 | 高度なバリデーションをpropsに指定する方法 | 完成 | 待處理 | — |
| 68 | emitを使ってイベントを発生させて子から親に対して通信する方法 | 完成 | 待處理 | — |
| 69 | 引数をemitに渡して子から親にデータを渡す方法 | 完成 | 待處理 | — |
| 70 | defineEmitsを使って明示的にemitするイベントを示す方法 | 完成 | 待處理 | — |
| 71 | emitの命名規則はこうなっている | 完成 | 待處理 | — |
| 73 | アプリのセットアップを行う方法 | 完成 | 待處理 | — |
| 79 | こうして仮想DOMを使ってレンダリングをしている | 完成 | 待處理 | — |
| 80 | 仮想DOMはコンポーネント単位ではこうなっている | 完成 | 待處理 | — |
| 159 | こうしてTypeScriptをセットアップする | 完成 | 待處理 | — |

- [補充日文原文與繁中譯文 JSON](Japanese-supplement-2426224.json)
- [第 7 堂中日雙語 SRT](bilingual-subtitles/Vue-007-42549830.ja.zh-TW.srt)
- [第 8 堂中日雙語 SRT](bilingual-subtitles/Vue-008-42549834.ja.zh-TW.srt)
- [第 9 堂中日雙語 SRT](bilingual-subtitles/Vue-009-42549838.ja.zh-TW.srt)
- [課程原始匯出備份](Japanese-course-2426224-original-159.json)
- [技術名稱校正與片尾裁切紀錄](corrections.json)

逐堂匯入資料位於課程的 `translations/tw-*.json`；總進度位於 [translation-progress.json](../translation-progress.json)。
