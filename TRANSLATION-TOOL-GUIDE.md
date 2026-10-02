# 翻譯修正工具使用指南

本目錄提供了一套完整的工具來自動檢測和修正台灣華語翻譯中的錯誤。

## 📦 工具套件

### 1. fix_all_translation_issues.py - 綜合修正工具 ⭐ 推薦使用

**功能**: 一次性修正所有已知的翻譯問題
- 簡體中文字元 → 繁體中文
- 中國大陸術語 → 台灣標準術語
- Flash message 陷阱修正

**使用方式**:

```bash
# 預覽模式（不會實際修改檔案）
python3 scripts/fix_all_translation_issues.py --dry-run

# 實際執行修正
python3 scripts/fix_all_translation_issues.py

# 強制處理已審計的課程（預設會跳過）
python3 scripts/fix_all_translation_issues.py --force

# 只修正特定課程
python3 scripts/fix_all_translation_issues.py --course 756150
```

**輸出**:
- 修正式報告：`data/import-reports/fix-report.json`
- 備份檔案：原始檔案 + `.backup` 副檔名

---

### 2. term_scan.py - 術語掃描工具

**功能**: 掃描並統計仍存在的中國大陸術語

**使用方式**:

```bash
python3 scripts/term_scan.py
```

**輸出**:
- 即時顯示每個術語的使用次數和範例
- JSON 報告：`data/import-reports/term-scan.json`

**典型輸出**:
```
term hits (raw, includes substring false positives):
  終端 -> 終端機: 462  <- review (substring risk)
      1070124/13726184 cue 27: 然後你可以執行這個指令。在一般的終端機...
```

---

### 3. audit_translations.py - 結構驗證工具

**功能**: 檢查翻譯文件的結構完整性

**使用方式**:

```bash
python3 scripts/audit_translations.py
```

**輸出**:
- 每門課的課堂數、字幕數統計
- 結構是否正確（有無遺漏、重複等）
- JSON 報告：`data/import-reports/translation-structural-audit.json`

**典型輸出**:
```
756150: 701/701 lectures; 63653 cues; structural=True; emptyZh=0
Total: 4672 lectures; 429579 cues.
```

---

## 🔍 工作流程建議

### 標準工作流程

1. **執行完整修正**
   ```bash
   # 先用預覽模式看看會影響哪些檔案
   python3 scripts/fix_all_translation_issues.py --dry-run
   
   # 確認後執行實際修正
   python3 scripts/fix_all_translation_issues.py
   ```

2. **驗證結構完整性**
   ```bash
   python3 scripts/audit_translations.py
   ```
   確保所有課堂都有正確的結構。

3. **掃描剩餘術語問題**
   ```bash
   python3 scripts/term_scan.py
   ```
   查看還有哪些術語需要人工審查。

4. **人工複核邊緣案例**
   - 查看 term_scan.py 報告中高頻次的詞彙
   - 特別注意標記為 "review" 的項目
   - 比較 `.backup` 和現有檔案的差異

### 進階工作流程

#### 針對特定課程修正

```bash
# 只修正 Angular 課程
python3 scripts/fix_all_translation_issues.py --course 756150 --force

# 然後驗證該課程
python3 scripts/audit_translations.py | grep "756150"
```

#### 增量修正

```bash
# 先掃描術語問題
python3 scripts/term_scan.py > /tmp/term-issue.txt

# 分析報告，找出最需要處理的術語
cat /tmp/term-issue.txt | head -20
```

#### 回滾修正

如果需要回滾某個檔案的修正：

```bash
cd data/courses/756150/translations
cp tw-001-050.json.backup tw-001-050.json.new
# 或使用 git checkout
git checkout HEAD -- tw-001-050.json
```

---

## 🛠️ 修正規則詳解

### 簡繁轉換規則

修正以下常見的簡體字誤用：

| 簡體 | 繁體 | 示例 |
|------|------|------|
| 这 | 這 | 这个 → 這個 |
| 个 | 個 | 一个 → 一個 |
| 说 | 說 | 说明 → 說明 |
| 时 | 時 | 时间 → 時間 |
| 后 | 後 | 后来 → 後來 |
| 发 | 發 | 开发 → 開發 |
| 长 | 長 | 长期 → 長期 |
| 门 | 門 | 门控 → 門控 |
| 问 | 問 | 问题 → 問題 |
| 无 | 無 | 无法 → 無法 |
| 与 | 與 | 与其 → 與其 |
| 为 | 為 | 为什么 → 為什麼 |
| 实 | 實 | 实际 → 實際 |
| 现 | 現 | 现在 → 現在 |
| 点 | 點 | 地点 → 地點 |
| 见 | 見 | 看见 → 看見 |
| 认 | 認 | 认识 → 認識 |
| 请 | 請 | 请问 → 請問 |
| 对 | 對 | 对照 → 對照 |
| 页 | 頁 | 页面 → 頁面 |
| 终 | 終 | 终端 → 終端 |
| 制 | 製 | 控制 → 控制 |
| 简 | 簡 | 简单 → 簡單 |
| 单 | 單 | 单元 → 單元 |
| 书 | 書 | 书籍 → 書籍 |
| 画 | 畫 | 画面 → 畫面 |

### 術語修正規則

將中国大陆術語改為台灣標準術語：

| 大陆術語 | 台灣術語 | 類別 |
|---------|---------|------|
| 组件 | 元件 | 程式設計 |
| 服务器 | 伺服器 | 網路 |
| 字符串 | 字串 | 程式設計 |
| 源代码 | 原始碼 | 程式設計 |
| 默认 | 預設 | 系統設定 |
| 缓存 | 快取 | 電腦科學 |
| 数据库 | 資料庫 | 資料管理 |
| 变量 | 變數 | 程式設計 |
| 异步 | 非同步 | 程式設計 |
| 文件夹 | 資料夾 | 檔案系統 |
| 视频 | 影片 | 多媒體 |
| 信息 | 資訊 | 通用品 |
| 软件 | 軟體 | 通用品 |
| 硬件 | 硬體 | 通用品 |
| 网络 | 網路 | 網路 |
| 鼠标 | 滑鼠 | 硬體 |
| 屏幕 | 螢幕 | 顯示設備 |
| 显示 | 顯示 | 動作 |
| 点击 | 點擊 | 操作 |
| 刷新 | 重新整理 | 操作 |
| 数据 | 資料 | 通用品 |
| 质量 | 品質 | 通用品 |
| 性能 | 效能 | 通用品 |
| 用户 | 使用者 | 通用品 |
| 接口 | 介面 | 程式設計 |
| 对象 | 物件 | 程式設計 |
| 函数 | 函式 | 程式設計 |
| 循环 | 迴圈 | 程式設計 |
| 登录 | 登入 | 操作 |
| 注册 | 註冊 | 操作 |
| 保存 | 儲存 | 操作 |
| 加载 | 載入 | 操作 |
| 配置 | 設定 | 系統設定 |
| 线程 | 執行緒 | 作業系統 |
| 进程 | 行程 | 作業系統 |

---

## 📋 常見問題

### Q: 為什麼有些檔案沒有被修正？

A: 如果某個檔案已經通過了人工審計（即在 `translation-audit.json` 中存在且 verifiedVideoLectures > 0），工具會自動跳過以避免破壞手動修正的成果。如果您確定要重新處理，請使用 `--force` 參數。

### Q: 如何知道具體改了什麼？

A: 
1. 查看 JSON 報告：`cat data/import-reports/fix-report.json | less`
2. 比較檔案差異：`diff -u old.json new.json`
3. Git 查看：`git diff data/courses/*/translations/`

### Q: 修正會出錯嗎？

A: 風險很低，因為：
1. 所有檔案都自動備份到 `.backup`
2. 只進行簡單的文本替換
3. 保留了原始格式（JSON 結構不變）

但為了安全起見，建議先使用 `--dry-run` 預覽效果。

### Q: 什麼情況下不应该自动修正？

A: 
1. 技術專有名詞（如 HTTP, API, JSON 等）
2. 程式變數名稱
3. URL 路徑
4. CSS class 名稱
5. 某些上下文下保留原文更恰當的表達

這些情況通常不在修正範圍內。

### Q: 如何处理 edge cases（邊緣案例）？

A: 使用 `term_scan.py` 掃描出的結果中，有些需要人工判斷：
1. 「終端」可能出現在「終端機」中
2. 「程序」可能在某些上下文中是正確的中文
3. 需要根據具體句子判斷

建議：
- 查看報告中的範例
- 對比原始英文內容
- 根據語境決定是否需要修正

---

## 💡 最佳實踐

1. **定期檢查**: 每次新增或更新課程後，運行 `audit_translations.py`

2. **批量處理**: 使用 `fix_all_translation_issues.py --force` 一次性處理所有未修正的課程

3. **逐步驗證**: 先預覽 (`--dry-run`)，再實際執行，最後驗證結果

4. **保留證據**: 所有的修正都會生成報告和備份，妥善保存

5. **團隊協作**: 將修正經驗分享到團隊，持續完善術語規則

---

## 📞 支援

如果遇到任何問題或發現修正規則有不當之處，請：
1. 記錄具體案例
2. 對比原始英文內容
3. 提出修正建議

我們會持續改進這些工具，使其更符合台灣華語的使用習慣。

---

*最後更新：2026-10-03*  
*版本：v1.0*
