# ChatGPT 英文字幕翻譯指令

請將隨附 JSON 中所有 lectures[*].cues[*].en 逐段翻譯為台灣繁體中文，填入對應的 zh 欄位，輸出可下載的 JSON 檔案。

只能根據英文原文翻譯。不要讀取或引用 Udemy 簡體字幕，不可摘要、省略、合併或新增段落。

完整保留 version、courseId、sourceLanguage、targetLanguage、lecture id、title、sourceHash、每段 id／start／end／en。輸入與輸出講座數、每堂 cue 數必須相同；全部 zh 必須非空。時間軸與英文不可變更。

請使用相鄰段落理解完整句意，然後把中文放回原本的各段，避免孤立直譯。口吻自然、精準，適合教學字幕。React／JSX／Redux／Next.js／Hooks／props／useState／useEffect 等專有名詞、程式碼識別字及 API 保留英文。

台灣術語：component＝元件、array＝陣列、object＝物件、function＝函式、variable＝變數、string＝字串、boolean＝布林、code＝程式碼、data＝資料、database＝資料庫、project＝專案、library＝函式庫、default＝預設、call＝呼叫、load＝載入、callback＝回呼、async＝非同步、cache＝快取、server＝伺服器、interface＝介面、source code＝原始碼、folder＝資料夾、configuration＝設定、memory＝記憶體、return＝回傳。

完成後先驗證所有 zh 已填妥、cue 數量一致、英文與時間軸未變動，再提供檔案連結與實際完成段數。若因限制無法完成，明確列出尚未翻譯的講座及段落，不可宣稱完整完成。
