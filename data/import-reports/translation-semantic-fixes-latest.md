# 本次翻譯修正（2026-10-03）

已修正 13 門課中的 66 堂、118 段字幕，只變更中文 zh。

本次處理：

- 補譯原本保留整句英文的提示、錯誤訊息與範例文字，保留程式碼識別字、API、檔名與指令。
- 依相鄰英文修正被挪到前後段的說明、條件及修飾語。
- 修正 Flutter 與 Svelte 的 true／false 條件說明，使每段中文對應該段英文。
- 將 SingleChildScrollView 還原為正確的 widget 名稱，修正 NativeScript 元件名稱與說明的斷句。
- JavaScript 的 hostElementID 判斷依後續 else／document.body 說明整理中文，避免將有效值與 null 的處理條件混為一談。英文自動轉錄本身有矛盾，原英文未更改。

逐段前後對照：[本次修正紀錄](translation-semantic-repairs-latest.json)。

Angular 整課匯入檔 Angular-zh-TW-complete.json 已同步目前的 tw 批次譯文，共更新 15 段（包含先前批次修正）；這些是衍生匯入檔同步，不另算新修正段數。見 [整課匯入檔同步紀錄](angular-complete-sync-latest.json)。

## 驗證

修正後再次全量核對 13 門課、4,672 堂、429,579 段：全部講座覆蓋、段數、非空中文字串、課程及語言資訊、講座 ID／標題／sourceHash、cue ID、英文與時間軸全部通過。詳見 [原文對照檢查](translation-source-audit.json)。

另對 Git 修改中的 44 個字幕 JSON 還原 zh 後，確認與修改前完整一致：133 處變更只涉及中文（118 處正式批次、15 處 Angular 整課匯入檔），其他欄位均未修改。git diff --check 通過。

## 尚未驗收的範圍

以上是實際修正與格式／原文驗證結果。尚未逐段讀完全部 429,579 段，全量語意驗收仍未完成。自動轉錄英文含矛盾或誤聽的段落，需要影片／音訊作為進一步確認依據；不能由格式驗證推論沒有誤譯。

本次修正已寫入字幕檔，尚未重新匯入瀏覽器擴充功能。
