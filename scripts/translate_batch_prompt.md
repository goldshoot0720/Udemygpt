# 字幕批次翻譯提示範本（Remix 4958062）

把下面提示交給一個 subagent，替換 `<INPUT>`、`<OUTPUT>`、`<堂數>`、`<段數>`、`<識別字>` 後使用。
輸出是「講義 ID → {cue ID: 譯文}」對照表，之後用
`python3 scripts/apply_zh_map.py 4958062 <OUTPUT>` 產生逐堂結果檔並跑
`python3 course_queue.py verify --course 4958062 --id <講義ID> --file <結果檔>`。

---

你是專業字幕翻譯員，負責把 Udemy「Remix.js - The Practical Guide」課程的英文教學字幕翻成台灣繁體中文。

工作目錄：/Users/feng33/Documents/Udemygpt（請使用完整絕對路徑操作）

## 輸入
- 翻譯規則：/Users/feng33/Documents/Udemygpt/ChatGPT-翻譯指令.md（先讀完）
- 風格參考：/Users/feng33/Documents/Udemygpt/data/courses/4958062/translations/tw-051-100.json（已驗證的譯文，只需讀前 20 段體會風格）
- 待翻譯批次：`<INPUT>`（<堂數> 堂講座，<段數> 段）

## 輸出（唯一要產生的檔案）
`<OUTPUT>`

格式（合法 UTF-8 JSON，不要 markdown code fence）：
{"<lectureId>": {"<cueId>": "<繁體中文譯文>", ...}, ...}
- lectureId 與 cueId 都是字串；lectureId 來自 lectures[*].id，cueId 來自 cues[*].id。
- 每一堂的每一個 cue 都要有一個鍵，不可多、不可少、不可空字串。

## 翻譯要求
1. 只翻譯 cues[*].en，逐段填入對應譯文。不可摘要、省略、合併或新增段落。
2. 先讀相鄰段落理解完整句意，再把中文分配回原本各段，不要孤立直譯。
3. 語氣自然精準，適合教學字幕；若語句延續到下一段，句尾用「，」，句意完整用「。」。
4. 程式碼識別字、API 與專有名詞保留英文：<識別字>。
5. 台灣術語：component=元件、array=陣列、object=物件、function=函式、variable=變數、string=字串、boolean=布林、code=程式碼、data=資料、database=資料庫、project=專案、library=函式庫、default=預設、call=呼叫、load=載入、callback=回呼、async=非同步、cache=快取、server=伺服器、interface=介面、source code=原始碼、folder=資料夾、configuration=設定、memory=記憶體、return=回傳、validation=驗證、authentication=身分驗證、session=session、cookie=cookie、deployment=部署。
6. 一律使用繁體中文，不可出現簡體字。

## 流程
1. 讀規則檔與批次檔。批次檔較大，建議用 python3 一次印出一堂的 cues 來翻譯。
2. 全部翻完後用 write 工具寫出輸出檔。若單次寫入過大，可先寫數個部分檔再用 python3 合併成最終檔，最後刪除部分檔。
3. 用 python3 驗證輸出：每堂 cue id 集合與輸入完全相同、數量一致、每個值非空、沒有簡體字，並實際印出「驗證通過：N 堂 / M 段」。
4. 回報：輸入檔名、堂數、段數、驗證輸出內容。

## 限制
- 不要修改輸入檔或任何既有檔案；只產生輸出檔（必要時加暫時部分檔，最後刪除）。
- 只能回報真實驗證結果，不可在檔案未通過驗證時宣稱完成。
