(function (root) {
  "use strict";
  function time(value) {
    const parts = value.replace(",", ".").split(":").map(Number);
    if (parts.length < 2 || parts.length > 3 || parts.some(x => !Number.isFinite(x))) return NaN;
    return parts.reduce((result, part) => result * 60 + part, 0);
  }
  function parse(text) {
    const cues = [];
    for (const block of text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
      const lines = block.split("\n");
      if (/^(NOTE|STYLE|REGION)(\s|$)/.test(lines[0])) continue;
      const index = lines.findIndex(line => line.includes("-->"));
      if (index < 0) continue;
      const match = lines[index].match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
      if (!match) continue;
      const start = time(match[1]), end = time(match[2]);
      const body = lines.slice(index + 1).join(" ").replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
      if (Number.isFinite(start) && Number.isFinite(end) && end > start && body) cues.push({ start, end, text: body });
    }
    cues.sort((a, b) => a.start - b.start);
    let maxEnd = 0;
    for (const cue of cues) { maxEnd = Math.max(maxEnd, cue.end); cue.maxEnd = maxEnd; }
    return cues;
  }
  function at(cues, second) {
    let low = 0, high = cues.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (cues[mid].start <= second) low = mid + 1;
      else high = mid;
    }
    const active = [];
    for (let i = low - 1; i >= 0; i--) {
      if (cues[i].maxEnd <= second) break;
      if (cues[i].end > second) active.unshift(cues[i].text);
    }
    return active.join(" ");
  }
  function language(caption) {
    return [caption.locale_id, caption.language, caption.locale, caption.title, caption.label]
      .map(value => typeof value === "string" ? value : value?.locale || value?.name || "").join(" ");
  }
  // 語言代碼／名稱對照，用於決定雙語字幕的名稱，例如英文課為中英、日文課為中日。
  // [比對樣式, 完整名稱, 中文簡稱, 語言代碼]
  const languageLabels = [
    [/ja(?:[_-]|\s|$)|japanese|日本|日文/i, "日文", "日", "ja"],
    [/ko(?:[_-]|\s|$)|korean|韓國|韓文/i, "韓文", "韓", "ko"],
    [/zh[_-](?:tw|hk|hant)|繁體|繁体|traditional/i, "繁體中文", "繁", "zh-TW"],
    [/(^|\s)zh(?:[_-]|\s|$)|chinese|中文|漢語|汉语/i, "中文", "中", "zh"],
    [/(^|\s)en(?:[_-]|\s|$)|english|英語|英语/i, "英文", "英", "en"],
    [/(^|\s)de(?:[_-]|\s|$)|german|德語|德语/i, "德文", "德", "de"],
    [/(^|\s)fr(?:[_-]|\s|$)|french|法語|法语/i, "法文", "法", "fr"],
    [/(^|\s)es(?:[_-]|\s|$)|spanish|西班牙/i, "西班牙文", "西", "es"],
    [/(^|\s)it(?:[_-]|\s|$)|italian|義大利|意大利/i, "義大利文", "義", "it"],
    [/(^|\s)pt(?:[_-]|\s|$)|portuguese|葡萄牙/i, "葡萄牙文", "葡", "pt"],
  ];
  function languageInfo(caption) {
    const text = caption ? language(caption) : "";
    for (const [pattern, name, short, code] of languageLabels) if (pattern.test(text)) return { name, short, code };
    return { name: "", short: "", code: "" };
  }
  // 課程主要語言＝原始字幕軌。Udemy 的自動翻譯字幕標示為 auto／自動，人工字幕則沒有。
  function primaryLanguage(captions) {
    const list = Array.isArray(captions) ? captions : [];
    const manual = list.filter(caption => !/auto|自動|自动|generated/i.test(language(caption)));
    const chosen = manual[0] || list[0];
    if (!chosen) return null;
    const info = languageInfo(chosen);
    return { ...info, caption: chosen };
  }
  // 雙語組合取決於課程主要語言：英文課為中英雙語，日文課為中日雙語，
  // 原文是中文時只顯示中文，其他小語種則先把原文翻譯成英文再走中英雙語。
  function pairName(info) {
    const short = typeof info === "string" ? (languageLabels.find(item => item[1] === info)?.[2] || "") : (info?.short || "");
    if (short === "中" || short === "繁") return "中文雙語";
    if (short === "日") return "中日雙語";
    return "中英雙語";
  }
  // 翻譯工作語言：中文課程不需翻譯，小語種先翻成英文再翻中文。
  function pipeline(info) {
    const short = typeof info === "string" ? (languageLabels.find(item => item[1] === info)?.[2] || "") : (info?.short || "");
    if (short === "中" || short === "繁") return ["zh-TW"];
    if (short === "英") return ["zh-TW"];
    if (short === "日") return ["zh-TW"];
    return ["en", "zh-TW"];
  }
  function select(captions) {
    const english = captions.find(c => /(^|\s)en(?:[_-]|\s|$)|english|英語|英语/i.test(language(c)));
    const traditional = captions.find(c => /zh[_-](?:tw|hk|hant)|繁體|繁体|traditional/i.test(language(c)));
    const chinese = traditional || captions.find(c => /(^|\s)zh(?:[_-]|\s|$)|chinese|中文/i.test(language(c)));
    const source = primaryLanguage(captions);
    return { english, chinese, simplified: !!chinese && !traditional, source, sourceName: source?.name || "", sourceCode: source?.code || "" };
  }
  // Longest phrases first. Preserve APIs, identifiers and English technical names.
  // Avoid blanket replacements for ambiguous words such as 項目, 內存, 庫 and 對象.
  const taiwanTerms = [
    ["數據庫", "資料庫"], ["數據結構", "資料結構"], ["數據類型", "資料型別"],
    ["數組元素", "陣列元素"], ["對象字面量", "物件字面值"], ["對象屬性", "物件屬性"],
    ["對象實例", "物件實例"], ["對象引用", "物件參考"], ["JavaScript對象", "JavaScript物件"],
    ["JavaScript 對象", "JavaScript 物件"], ["創建對象", "建立物件"], ["這個對象", "這個物件"],
    ["一個對象", "一個物件"], ["對象和", "物件和"], ["和對象", "和物件"],
    ["對象的", "物件的"], ["對象中", "物件中"], ["對象上", "物件上"], ["對象是", "物件是"],
    ["組件", "元件"], ["數組", "陣列"], ["函數", "函式"], ["變量", "變數"],
    ["字符串", "字串"], ["布爾", "布林"], ["代碼", "程式碼"], ["數據", "資料"],
    ["默認", "預設"], ["調用", "呼叫"], ["加載", "載入"], ["異步", "非同步"],
    ["回調", "回呼"], ["渲染", "渲染"], ["源碼", "原始碼"], ["源文件", "原始檔"],
    ["文件夾", "資料夾"], ["配置文件", "設定檔"], ["文件", "檔案"], ["服務器", "伺服器"],
    ["用戶界面", "使用者介面"], ["用戶", "使用者"], ["接口", "介面"], ["界面", "介面"],
    ["軟件", "軟體"], ["視頻", "影片"], ["屏幕", "螢幕"], ["信息", "資訊"],
    ["鏈接", "連結"], ["緩存", "快取"], ["內存地址", "記憶體位址"], ["內存中", "記憶體中"],
    ["保存", "儲存"], ["配置", "設定"], ["打印", "輸出"], ["返回值", "回傳值"],
    ["返回一個", "回傳一個"], ["返回的", "回傳的"], ["返回了", "回傳了"],
    ["運行", "執行"], ["編程", "程式設計"], ["程序", "程式"], ["算法", "演算法"],
    ["迭代", "迭代"], ["實現", "實作"], ["創建", "建立"], ["常量", "常數"],
    ["類型", "型別"], ["參數", "參數"], ["函式庫", "函式庫"], ["程式庫", "函式庫"],
    ["React項目", "React專案"], ["React 項目", "React 專案"], ["新項目", "新專案"],
    ["這個項目", "這個專案"], ["我們的項目", "我們的專案"], ["建立項目", "建立專案"],
    ["初始化項目", "初始化專案"], ["項目設定", "專案設定"], ["項目結構", "專案結構"]
  ];
  const dictionary = new Map(taiwanTerms.filter(([from, to]) => from !== to));
  const pattern = new RegExp([...dictionary.keys()].sort((a,b) => b.length-a.length).join("|"), "g");
  function localizeTaiwan(text) {
    return text.replace(pattern, value => dictionary.get(value))
      .replace(/\b(React|JavaScript|TypeScript)\s*庫/g, "$1 函式庫");
  }
  const api = { time, parse, at, select, primaryLanguage, languageInfo, pairName, pipeline, localizeTaiwan };
  root.SubtitleCore = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
