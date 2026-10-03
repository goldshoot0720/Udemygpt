# 課程翻譯驗證報告・第二輪（2026-10-03）

接續 [第一輪報告](translation-verification-2026-10-03.md)。本輪目標：確認 13 門課譯文「適當而非錯誤」，並修正所有查得到的錯誤。

## 結論

| 檢查項目 | 結果 |
| --- | --- |
| 覆蓋與結構（13 門課、4,672 堂、429,579 段；en／時間軸／段數／ID） | ✅ 通過（`scripts/audit_translations.py`） |
| 簡體字（OpenCC 逐字比對＋人工排除台、若干、漏斗、里程碑等正字） | ✅ 0 處 |
| 大陸用語（術語表＋上下文人工判讀） | ✅ 真實偏差已全數修正 |
| 段落錯位，高信心（`scripts/detect_shift.py`，W=6） | ✅ 0 堂（修正前 55 堂） |
| 段落錯位，寬鬆候選（W=4 `--loose`） | ✅ 剩餘 28 堂已逐堂判讀，皆為中文語序調整，非錯位 |
| 相鄰段落重複中文（`scripts/detect_adjacent_dup.py`） | ✅ 真實重複 56 堂已修正；剩餘候選皆為英文本身的平行句型 |
| 隨機抽樣語意審查（13 課 × 4 窗口 × 15 段，約 780 段） | ✅ 語意錯誤約 0.3%，已修正抽中的錯誤 |
| 全量逐段語意校對 | ⏳ 未逐段人工讀完 429,579 段；以上為自動偵測＋抽樣的結果 |

## 一、還原 ef88a62 的盲目替換損害

`ef88a62` 以無語境的字串替換（`scripts/fix_all_translation_issues.py` 等）改動 **3,704 段**，經逐段比對，全部都是機械式替換、沒有任何有效修正。它製造的錯字包括：控製、限製、機製、強製、鉤選、使用者端（client 應為用戶端）、行程式碼（加進程式碼）、參陣列合（參數組合）。

本輪已將 108 個 `tw-*.json` 的 `zh` 還原為 `49e1473` 版本（提交 `76a9985`）。

> ⚠️ 這些無差別替換子字串的腳本（`fix_all_translation_issues.py`、`fix_simplified_chars.py`、`fix_term_translations.py`），連同 ef88a62 的 108 個 `.backup` 檔與宣稱「已完成」的說明文件，已在後續提交中移除（仍可從 git 歷史取回）。請勿再以子字串替換修改中文。

## 二、合併外部修正 patch

外部 patch（Grok，3 個提交，基準 `d3a3eab`）以逐段三方合併納入（提交 `aaf5ab0`）：
- 只有 patch 改過的段落直接採用：約 70 堂重新對位、NodeJS 等課的半形標點改為全形、臺灣用語（運行→執行、構造函式→建構函式、正則→正規表達式、事件循環→事件迴圈…）。
- 和既有人工對位（`bd376af`、`49e1473`）衝突的 79 段，以及重疊講座中的 72 段重新對位改動，保留人工版本，因為 patch 在區段邊界會產生重複文字。

## 三、本輪人工修正

| 類別 | 堂數 | 段數 |
| --- | ---: | ---: |
| 簡體字（要么、这个、应該、会、说、拥有…）與 ASR 誤聽（create-react-app） | 18 | 19 |
| 大陸用語（緩存、編程、鏈接、異步、刷新） | 6 | 6 |
| 高信心錯位逐段重新對位 | 5 | 54 |
| 寬鬆候選中確認的局部錯位 | 26 | 148 |
| 3873464/41159626 cue 14–54 落後一句（採 patch 對位） | 1 | 41 |
| translate 被直譯成「翻譯」（改為轉換／相當於／理解為） | 19 | 28 |
| 語意不完整或斷句錯置的補寫 | 6 | 13 |
| 抽樣審查發現的誤譯（如 a set → asset） | 4 | 6 |
| 相鄰段落重複中文去重 | 56 | 147 |

逐段的修改前後對照見 `translation-repairs-2026-10-03.json`。所有修改只動 `zh`，`Angular-zh-TW-complete.json` 已同步。

## 四、已知殘留（不屬於錯譯）

- NativeScript（2126948）的譯文偏精簡，JavaScript（2508942）部分句子較直譯、生硬；語意正確，但可以再潤飾。
- 英文原字幕的 ASR 錯字（例如 “Natus Good” = NativeScript）大多已在中文中依原意譯正；少數只能依上下文推測。

## 五、重跑方式

```
python3 scripts/audit_translations.py
python3 scripts/scan_quality.py . /tmp/scan.json
python3 scripts/detect_shift.py . /tmp/shift.json
python3 scripts/detect_shift.py . /tmp/shift-loose.json 4 --loose
python3 scripts/detect_adjacent_dup.py . /tmp/dup.json
```

修正以 `scripts/apply_zh_patch.py PATCH.json data/import-reports/translation-repairs-2026-10-03.json --label …` 套用：會檢查舊值、拒絕空白中文，並記錄每一段的修改前後。修正後須重新匯出 `.ass`（`python3 export_ass.py <courseId>`），並在瀏覽器擴充功能中重新匯入。

## 六、後續：分支合併與用語回歸修正

- 分支 `cue/udemygpt-zh-translation-fixes`（8be16d8，基準為含錯字的 ef88a62）逐段比對後選擇性納入 21 段對位改善，包括 Angular DI 語境中誤譯為「權杖」的 token；其中仍帶「強製」錯字、整段錯開一句的 1708340/37143778 不採用，改為人工重新對位。
- 第一節的還原把 ef88a62 少數正確的替換一併還原了，已補修：嵌套→巢狀（156 處）、優化→最佳化（原文為 polished 的 3 處改譯為「改良」）。
- 儲存庫只保留 `main` 分支；其餘分支皆已合併（提交 4138e88、0d53c41、bc4d90d）並刪除。

## 七、第二次獨立抽樣複核

- 換一組亂數種子，從 13 門課各抽 6 個窗口、每窗 15 段，共約 1,170 段逐段閱讀：沒有發現中英意思相反或錯譯；有 3 處語句生硬或語意不清（多在 NativeScript 課，原因是英文 ASR 原文本身殘缺），已改寫。
- 「數字不符」候選逐例檢查：都是正常的格式轉換（例如 4 0 4 → 404、May 20th → 5 月 20 日），或依原意更正了 ASR 誤聽（例如 69 像素 → 96 像素），沒有錯誤。
- 兩次抽樣合計約 1,950 段，語意層面的錯誤率約 0.2–0.3%，抽到的都已修正。
