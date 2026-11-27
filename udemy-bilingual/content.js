(() => {
  "use strict";
  if (document.getElementById("udemy-bilingual-root")) return;
  const core = SubtitleCore;
  let course = UdemyCourses.forUrl(location.href);
  if (!course) return;
  const convertCharacters = OpenCC.Converter({ from: "cn", to: "tw" });
  const toTraditional = text => SubtitleCore.localizeTaiwan(convertCharacters(text));
  const backgroundColors = {
    orange: { label: "淡橘色", hex: "#f6c48a", ink: "#3c2614", muted: "#6a4e38", accent: "#7a3208", warning: "#7a3208", line: "#3c261447", control: "#3c2614ad", key: "#ffffff80", caption: "#2f1c0e", english: "#4a3424", mark: "#8a3408" },
    blue: { label: "淡藍色", hex: "#b7def6", ink: "#123044", muted: "#3d5c74", accent: "#0c4e86", warning: "#7a3208", line: "#12304447", control: "#123044ad", key: "#ffffff80", caption: "#102838", english: "#2c4a60", mark: "#0a4a86" }
  };
  const defaults = { enabled: true, effect: "glow", color: "orange", size: 25, x: 50, y: 80, offset: 0 };
  let prefs = { ...defaults }, video, player, root, shadow, chineseLine, englishLine, panel, status, toggle;
  let setPanel = () => {};
  let en = [], zh = [], key = "", loaded = false, generation = 0, controller, last = "", savedTimer;
  let englishOrigin = "udemy-caption", pair = "中英雙語", pairShort = "中英", sourceLabel = "原文";
  // 匯出檔名與 sourceLanguage 都跟著課程原始語言走，日文課不會再輸出 English。
  let sourceCode = "en", sourceSlug = "English";
  let pageZoom = 1, zoomChecked = 0, zoomPending = false;
  let timeCourse = null, timeCourseId = null, timeItems = null, timeError = "", timeRevision = 0, timeController;
  const terms = /\b(Claude(?: Code)?|Codex|Flutter|Dart|Node(?:\.js|JS)?|React Native|NativeScript|Angular|Svelte(?:\.js)?|Remix(?:\.js)?|GraphQL|Express|MongoDB|Deno|Flexbox|Sass|React(?:\.js)?|JavaScript|TypeScript|JSX|Redux|Next\.js|Hooks?|useState|useEffect|useReducer|useRef|useContext|props|state|components?|DOM|API|HTTP|CSS|HTML|Vite)\b/gi;
  const css = `
    :host { all: initial; position: absolute; inset: 0; z-index: 30; pointer-events: none; font-family: -apple-system,BlinkMacSystemFont,"PingFang TC","Noto Sans TC",sans-serif; color: var(--caption-ink, #2f1c0e); }
    * { box-sizing: border-box; }
    .captions { position: absolute; left: var(--caption-x,50%); top: var(--caption-y,80%); width: 84%; transform: translate(-50%,-100%); text-align: center; pointer-events: none; }
    .lines { display: inline-flex; max-width: 100%; flex-direction: column; gap: calc(5px*var(--ui-scale,1)); padding: calc(9px*var(--ui-scale,1)) calc(16px*var(--ui-scale,1)); border-radius: calc(12px*var(--ui-scale,1)); background: var(--subtitle-background); border: 1px solid var(--line, #3c261447); box-shadow: 0 4px 20px #0003; pointer-events: auto; touch-action: none; cursor: grab; user-select: none; }
    .lines:active { cursor: grabbing; }
    .lines:focus-visible { outline: 2px solid var(--ink, #3c2614); outline-offset: 3px; }
    .lines[hidden], [hidden] { display: none !important; }
    .zh { font-size: var(--zh-size,var(--size,25px)); line-height: 1.35; font-weight: 650; text-wrap: pretty; line-break: strict; word-break: normal; }
    .en { font-size: calc(var(--size,25px)*.76); line-height: 1.3; color: var(--english-ink, #4a3424); text-wrap: pretty; }
    mark { color: var(--mark-ink, #8a3408); background: transparent; font-weight: 750; }
    .fade { animation: cue-in .16s ease-out both; }
    @keyframes cue-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    :host([data-effect="minimal"]) .lines { border: 0; border-radius: 6px; box-shadow: none; }
    :host([data-effect="minimal"]) mark { color: inherit; font-weight: inherit; text-shadow: inherit; }
    :host([data-effect="minimal"]) .fade { animation: none; }
    :host([data-effect="cinema"]) .lines { border: 0; box-shadow: none; }
    .controls {
      --panel: var(--subtitle-background);
      color-scheme: light;
      --panel-width: min(448px, calc(var(--player-width, 800px) / var(--ui-scale, 1) - 20px));
      color: var(--ink);
      position: absolute;
      top: 10px;
      left: 10px;
      pointer-events: none;
      display: grid;
      justify-items: start;
      gap: 6px;
      transform: scale(var(--ui-scale, 1));
      transform-origin: top left;
      font-size: 13px;
      line-height: 1.5;
    }
    .toolbar, .panel { pointer-events: auto; }
    button, select, input { font: inherit; }
    button, select, input[type="number"] {
      min-height: 32px;
      border: 1px solid var(--control-line);
      border-radius: 6px;
      background: var(--key);
      color: var(--ink);
      padding: 4px 8px;
    }
    select option { background: var(--panel); color: var(--ink); }
    button { cursor: pointer; font-weight: 600; }
    button:hover:enabled, select:hover { border-color: var(--accent); }
    button:active:enabled { background: var(--panel); }
    button:disabled { color: var(--muted); cursor: default; }
    .controls :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .toolbar { display: flex; align-items: flex-start; gap: 6px; }
    .toolbar button { background: var(--panel); }
    .toolbar .toggle[aria-pressed="true"] { color: var(--accent); }
    .toolbar[data-open="true"] { width: var(--panel-width); }
    .toolbar[data-open="true"] .settings { margin-left: auto; }
    .settings[aria-expanded="true"] { border-color: var(--accent); }
    .panel {
      width: var(--panel-width);
      max-height: calc(var(--player-height, 400px) / var(--ui-scale, 1) - var(--toolbar-space, 60px));
      padding: 16px;
      overflow: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      overflow-wrap: anywhere;
    }
    .panel h2, .panel h3, .panel p { margin: 0; }
    .panel h2 { font-size: 18px; line-height: 1.3; }
    .panel h3 { margin-bottom: 8px; font-size: 14px; }
    .course-time { margin-top: 12px; }
    .time-order { display: flex; align-items: baseline; gap: 6px; }
    .time-ratio[hidden] + span { display: none; }
    .time-ratio { color: var(--accent); font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .time-current { margin-block: 2px 6px; font-weight: 600; }
    .time-values { display: flex; flex-wrap: wrap; gap: 2px 12px; font-variant-numeric: tabular-nums; }
    .course-id, .time-note, .source, .position-tip { color: var(--muted); font-size: 12px; }
    .course-id { user-select: text; }
    .panel-section, .status-area { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
    .panel-section > label {
      display: grid;
      grid-template-columns: minmax(6.5em, .85fr) minmax(0, 1.15fr);
      align-items: center;
      gap: 8px;
      min-height: 36px;
    }
    .color-picker { margin: 4px 0; padding: 0; min-width: 0; border: 0; }
    .color-picker legend { padding: 0; }
    .color-options { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .color-options label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      min-height: 32px;
      border: 1px solid var(--control-line);
      border-radius: 6px;
      background: var(--choice-color);
      color: var(--choice-ink);
      cursor: pointer;
    }
    .color-options label:has(:checked) { border-color: currentColor; font-weight: 700; }
    .color-options input { margin: 0; accent-color: var(--choice-ink); }
    select, input[type="number"], input[type="range"] { width: 100%; min-width: 0; }
    input[type="range"] { margin: 0; min-height: 28px; accent-color: var(--accent); }
    .panel .position-tip, .panel .source { margin-top: 8px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .reset-position, .time-retry { margin-top: 6px; }
    .import { background: var(--accent); color: var(--panel); border-color: var(--accent); }
    .import:active:enabled { color: var(--ink); }
    .notice, :host([data-status="error"]) .status { color: var(--warning); }
    .notice { margin-block: 6px; }
    .status, .progress-label { font-size: 12px; }
    .progress { margin-top: 8px; }
    .progress-track { height: 5px; margin-top: 4px; border-radius: 3px; background: var(--line); overflow: hidden; }
    .progress-bar { height: 100%; width: 0; background: var(--accent); }
    @media (pointer: coarse) {
      .controls { --toolbar-space: 72px; }
      .controls button, .controls input:not([type="radio"]), .controls select { min-height: 44px; }
      .panel-section label { min-height: 48px; }
    }
    @media(max-width:600px) { .captions { width: 94%; } .lines { padding: 8px 12px; } .zh { font-size: min(var(--zh-size,var(--size,25px)),20px); } .en { font-size: min(calc(var(--size,25px)*.76),16px); } }
    @media(prefers-reduced-motion:reduce) { .fade { animation: none; } .toolbar { transition: none; } }
  `;
  function applyTheme() {
    const theme = backgroundColors[prefs.color];
    for (const [name, value] of Object.entries({
      "--subtitle-background": theme.hex,
      "--ink": theme.ink,
      "--muted": theme.muted,
      "--accent": theme.accent,
      "--warning": theme.warning,
      "--line": theme.line,
      "--control-line": theme.control,
      "--key": theme.key,
      "--caption-ink": theme.caption,
      "--english-ink": theme.english,
      "--mark-ink": theme.mark
    })) root.style.setProperty(name, value);
  }
  function writePrefs() {
    return browser.storage.local.set({ subtitlePrefs: prefs }).catch(() => {});
  }
  function save() {
    clearTimeout(savedTimer);
    savedTimer = setTimeout(writePrefs, 200);
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function positionBounds() {
    const caption = shadow?.querySelector(".lines");
    const playerRect = player?.getBoundingClientRect();
    const captionRect = caption?.getBoundingClientRect();
    if (!caption || caption.hidden || !playerRect?.width || !playerRect.height || !captionRect?.width || !captionRect.height) {
      return { minX: 8, maxX: 92, minY: 4, maxY: 96 };
    }
    const horizontalInset = captionRect.width / playerRect.width * 50 + 2;
    const verticalInset = captionRect.height / playerRect.height * 100 + 2;
    return {
      minX: Math.min(50, horizontalInset), maxX: Math.max(50, 100 - horizontalInset),
      minY: Math.min(90, verticalInset), maxY: 96
    };
  }
  function setPosition() {
    if (!root) return;
    root.style.setProperty("--caption-x", `${prefs.x}%`);
    root.style.setProperty("--caption-y", `${prefs.y}%`);
    shadow.querySelector('[name="x"]').value = prefs.x;
    shadow.querySelector('[name="y"]').value = prefs.y;
  }
  function clampPosition() {
    const bounds = positionBounds();
    prefs.x = clamp(prefs.x, bounds.minX, bounds.maxX);
    prefs.y = clamp(prefs.y, bounds.minY, bounds.maxY);
    setPosition();
  }
  function apply() {
    root.style.setProperty("--size", `${prefs.size / pageZoom}px`);
    root.style.setProperty("--ui-scale", String(1 / pageZoom));
    root.style.setProperty("--player-height", `${player.clientHeight}px`);
    root.style.setProperty("--player-width", `${player.clientWidth}px`);
    root.style.setProperty("--caption-x", `${prefs.x}%`);
    root.style.setProperty("--caption-y", `${prefs.y}%`);
    root.dataset.effect = prefs.effect;
    toggle.textContent = prefs.enabled ? (zh.length ? `${pairShort} CC ✓` : `${pairShort} CC · 中文待翻譯`) : `${pairShort} CC 關`;
    toggle.setAttribute("aria-pressed", String(prefs.enabled));
    player.classList.toggle("udemy-bilingual-active", prefs.enabled && loaded);
    render(true);
  }
  function paint(element, text, chinese) {
    element.replaceChildren();
    const value = chinese ? toTraditional(text) : text;
    let offset = 0;
    for (const match of value.matchAll(terms)) {
      element.append(document.createTextNode(value.slice(offset, match.index)));
      const mark = document.createElement("mark"); mark.textContent = match[0]; element.append(mark);
      offset = match.index + match[0].length;
    }
    element.append(document.createTextNode(value.slice(offset)));
    if (chinese && value) {
      const context = document.createElement("canvas").getContext("2d");
      const size = prefs.size / pageZoom;
      context.font = `650 ${size}px ${getComputedStyle(element).fontFamily}`;
      const width = Math.max(120, player.clientWidth * .84 - 34 / pageZoom);
      const fit = Math.min(1, width * 1.85 / Math.max(1, context.measureText(value).width));
      root.style.setProperty("--zh-size", `${Math.max(Math.min(size, 16 / pageZoom), size * fit)}px`);
    }
    element.hidden = !value;
    element.classList.remove("fade");
    void element.offsetWidth;
    element.classList.add("fade");
  }
  function render(force = false) {
    if (!video || !root) return;
    const second = video.currentTime + prefs.offset;
    const english = core.at(en, second), chinese = core.at(zh, second);
    const signature = `${english}\u0000${chinese}`;
    const lines = shadow.querySelector(".lines");
    lines.hidden = !prefs.enabled || !loaded || !(english || chinese) || video.ended;
    if (force || signature !== last) {
      if (force || english !== last.split("\u0000")[0]) paint(englishLine, english, false);
      if (force || chinese !== last.split("\u0000")[1]) paint(chineseLine, chinese, true);
      last = signature;
    }
    clampPosition();
  }
  function mount() {
    root = document.createElement("div"); root.id = "udemy-bilingual-root";
    root.lang = "zh-TW";
    applyTheme();
    shadow = root.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${css}</style>
      <div class="captions"><div class="lines" hidden><div class="zh" lang="zh-TW"></div><div class="en" lang="en"></div></div></div>
      <div class="controls">
        <div class="toolbar">
          <button class="toggle" type="button">中英 CC ✓</button>
          <button class="settings" type="button" aria-label="雙語字幕設定" aria-controls="subtitle-settings" aria-expanded="false">設定</button>
        </div>
        <section class="panel" id="subtitle-settings" aria-labelledby="settings-title" hidden>
          <h2 id="settings-title">雙語字幕設定</h2>
          <div class="course-time" aria-label="課程影片分鐘數" hidden>
            <div class="time-order"><strong class="time-ratio" hidden></strong><span>堂</span></div>
            <div class="time-current">正在讀取課程時長…</div>
            <div class="time-values"><span class="time-total"></span><span class="time-watched"></span><span class="time-remaining"></span></div>
            <div class="time-note">依序觀看估算：前面影片＋本堂播放位置</div>
            <div class="course-id">課程 ID：讀取中…</div>
            <div class="notice" role="status" hidden></div>
            <button class="time-retry" type="button" hidden>重新讀取時長</button>
          </div>
          <div class="status-area">
            <div class="status" role="status">正在讀取課程字幕…</div>
            <div class="progress" hidden>
              <div class="progress-label"></div>
              <div class="progress-track" role="progressbar" aria-label="全課字幕匯出進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-bar"></div></div>
            </div>
          </div>
          <section class="panel-section">
            <h3>字幕調整</h3>
            <label>字幕效果<select name="effect"><option value="glow">光暈＋淡入</option><option value="cinema">電影描邊</option><option value="minimal">簡潔閱讀</option></select></label>
            <fieldset class="color-picker">
              <legend>字幕底色</legend>
              <div class="color-options">
                ${Object.entries(backgroundColors).map(([value, { label, hex, ink }]) =>
                  `<label style="--choice-color: ${hex}; --choice-ink: ${ink}"><input type="radio" name="color" value="${value}"${prefs.color === value ? " checked" : ""}>${label}</label>`
                ).join("")}
              </div>
            </fieldset>
            <label>字體大小<input name="size" type="range" min="16" max="40" aria-label="字體大小"></label>
            <label>水平位置<input name="x" type="range" min="8" max="92" aria-label="字幕水平位置"></label>
            <label>垂直位置<input name="y" type="range" min="4" max="96" aria-label="字幕垂直位置"></label>
            <label>時間校正（秒）<input name="offset" type="number" min="-10" max="10" step="0.1" aria-label="字幕時間校正"></label>
            <p class="position-tip">拖曳字幕即可移動；聚焦字幕後可用方向鍵微調。</p>
            <button class="reset-position" type="button">重設字幕位置</button>
          </section>
          <section class="panel-section">
            <h3>字幕檔案</h3>
            <div class="actions">
              <button class="import" type="button">匯入中英雙語字幕</button>
              <button class="export-current" type="button">匯出本堂原文</button>
              <button class="export-course" type="button">匯出全課原文</button>
              <button class="retry" type="button">重新讀取字幕</button>
            </div>
            <input class="import-file" type="file" accept=".json,application/json" hidden>
            <p class="source">中文由原文預先翻譯，採台灣術語；不使用 Udemy 自己的中文字幕。尚未匯入譯文時只顯示原文。</p>
          </section>
        </section>
      </div>`;
    player.append(root);
    chineseLine = shadow.querySelector(".zh"); englishLine = shadow.querySelector(".en");
    toggle = shadow.querySelector(".toggle"); status = shadow.querySelector(".status"); panel = shadow.querySelector(".panel");
    if (!course.known) {
      // Courses outside the prepared list still load; only warn that no translation exists.
      const notice = shadow.querySelector(".notice");
      notice.textContent = `此課程尚未加入翻譯清單（${course.slug}），目前只顯示官方原始字幕。可按「匯出全課原文」取出字幕後翻譯。`;
      notice.hidden = false;
    }
    toggle.addEventListener("click", () => { prefs.enabled = !prefs.enabled; apply(); save(); });
    const settings = shadow.querySelector(".settings");
    setPanel = open => {
      panel.hidden = !open;
      shadow.querySelector(".course-time").hidden = !open;
      settings.setAttribute("aria-expanded", String(open));
      shadow.querySelector(".toolbar").dataset.open = String(open);
    };
    settings.addEventListener("click", () => setPanel(panel.hidden));
    shadow.querySelector(".retry").addEventListener("click", () => { key = ""; check(); });
    shadow.querySelector(".reset-position").addEventListener("click", () => {
      prefs.x = defaults.x; prefs.y = defaults.y; apply(); save();
      shadow.querySelector('[name="x"]').value = prefs.x;
      shadow.querySelector('[name="y"]').value = prefs.y;
    });
    shadow.querySelector(".time-retry").addEventListener("click", () => loadCourseTime(true));
    shadow.querySelector(".export-current").addEventListener("click", exportCurrent);
    shadow.querySelector(".export-course").addEventListener("click", exportCourse);
    shadow.querySelector(".import").addEventListener("click", () => shadow.querySelector(".import-file").click());
    shadow.querySelector(".import-file").addEventListener("change", importTranslation);
    shadow.querySelector(".color-picker").addEventListener("change", event => {
      const color = event.target.value;
      if (!Object.hasOwn(backgroundColors, color)) return;
      prefs.color = color;
      applyTheme();
      writePrefs();
    });
    for (const input of shadow.querySelectorAll('select, input[type="range"], input[type="number"]')) {
      input.value = prefs[input.name];
      input.addEventListener("input", () => {
        prefs[input.name] = input.name === "effect" ? input.value : Number(input.value);
        if (input.name === "x" || input.name === "y") clampPosition();
        apply(); save();
      });
    }
    const caption = shadow.querySelector(".lines");
    let drag = null;
    caption.setAttribute("tabindex", "0");
    caption.setAttribute("aria-label", "拖曳字幕移動位置，也可用方向鍵微調");
    caption.title = "拖曳字幕移動位置；方向鍵可微調";
    caption.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: prefs.x, y: prefs.y };
      caption.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    caption.addEventListener("pointermove", event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const rect = player.getBoundingClientRect();
      const bounds = positionBounds();
      prefs.x = clamp(drag.x + (event.clientX - drag.startX) / rect.width * 100, bounds.minX, bounds.maxX);
      prefs.y = clamp(drag.y + (event.clientY - drag.startY) / rect.height * 100, bounds.minY, bounds.maxY);
      setPosition();
    });
    const finishDrag = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      save();
    };
    caption.addEventListener("pointerup", finishDrag);
    caption.addEventListener("pointercancel", finishDrag);
    caption.addEventListener("keydown", event => {
      const step = event.shiftKey ? 5 : 1;
      const deltas = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const delta = deltas[event.key];
      if (!delta) return;
      const bounds = positionBounds();
      prefs.x = clamp(prefs.x + delta[0], bounds.minX, bounds.maxX);
      prefs.y = clamp(prefs.y + delta[1], bounds.minY, bounds.maxY);
      setPosition(); save(); event.preventDefault();
    });
    root.addEventListener("keydown", event => {
      event.stopPropagation();
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        setPanel(false);
        settings.focus();
      }
    });
    root.addEventListener("click", event => event.stopPropagation());
    apply();
    renderCourseTime();
  }
  function renderCourseTime() {
    if (!shadow) return;
    const current = shadow.querySelector(".time-current"), total = shadow.querySelector(".time-total");
    const ratio = shadow.querySelector(".time-ratio");
    const watched = shadow.querySelector(".time-watched"), remaining = shadow.querySelector(".time-remaining");
    const note = shadow.querySelector(".time-note"), retry = shadow.querySelector(".time-retry");
    const lecture = location.pathname.match(/\/lecture\/(\d+)/)?.[1];
    const courseId = shadow.querySelector(".course-id");
    courseId.textContent = timeCourseId ? `課程 ID：${timeCourseId} · 資料夾 data/courses/${timeCourseId}` : "課程 ID：讀取中…";
    courseId.title = course ? `${course.title || course.slug}（${timeCourseId || "讀取中"}）` : "";
    if (!timeItems) {
      ratio.hidden = true; ratio.textContent = "";
      current.textContent = timeError || "正在讀取課程時長…";
      current.title = current.textContent;
      total.textContent = ""; watched.textContent = "已觀看 — 分鐘"; remaining.textContent = "未觀看 — 分鐘";
      note.textContent = "依序觀看估算：前面影片＋本堂播放位置";
      retry.hidden = !timeError; return;
    }
    const result = UdemyCourseTime.calculate(timeItems, lecture, video?.currentTime || 0);
    const count = timeItems.length;
    ratio.hidden = !result.current;
    ratio.textContent = result.current ? `${result.current.order}/${count}` : "";
    current.textContent = result.current ? `目前：${result.current.order}. ${result.current.title}` : "目前講座不在課程清單中";
    current.title = current.textContent;
    total.textContent = `總影片 ${UdemyCourseTime.minutes(result.total)} 分鐘`;
    watched.textContent = `已觀看 ${UdemyCourseTime.minutes(result.watched)} 分鐘`;
    remaining.textContent = `未觀看 ${UdemyCourseTime.minutes(result.remaining)} 分鐘`;
    note.textContent = result.missing ? `${result.missing} 堂影片缺少時長，完整分鐘數待補` :
      "依序觀看估算；以原速片長計算，跳課不代表已觀看";
    retry.hidden = !result.missing;
  }
  async function loadCourseTime(force = false) {
    if (!course || (!force && timeCourse === course)) return;
    const activeCourse = course, revision = ++timeRevision;
    timeController?.abort(); timeController = new AbortController();
    timeCourse = activeCourse; timeCourseId = null; timeItems = null; timeError = ""; renderCourseTime();
    try {
      const courseId = await UdemyCourses.idFor(activeCourse);
      if (revision !== timeRevision) return;
      timeCourseId = courseId; renderCourseTime();
      const signal = typeof AbortSignal !== "undefined" && AbortSignal.timeout && AbortSignal.any ?
        AbortSignal.any([timeController.signal, AbortSignal.timeout(30000)]) : timeController.signal;
      const items = await UdemyCourseTime.read(courseId, fetch, signal);
      if (revision !== timeRevision) return;
      timeItems = items;
    } catch (error) {
      if (revision !== timeRevision) return;
      timeError = error.name === "TimeoutError" ? "課程時長讀取逾時，請重試" : (error.message || "課程時長讀取失敗，請重試");
    }
    renderCourseTime();
  }
  async function load(lecture) {
    const activeCourse = course;
    const revision = ++generation;
    controller?.abort(); controller = new AbortController();
    const signal = controller.signal;
    en = []; zh = []; loaded = false; last = ""; apply();
    englishOrigin = "udemy-caption";
    status.textContent = "正在讀取課程字幕…";
    try {
      const meta = await UdemyCourses.metaFor(activeCourse);
      if (revision !== generation) return;
      const courseId = meta.id;
      const url = new URL(`/api-2.0/users/me/subscribed-courses/${courseId}/lectures/${lecture}/`, location.origin);
      url.searchParams.set("fields[lecture]", "asset");
      url.searchParams.set("fields[asset]", "captions");
      const response = await fetch(url, { credentials: "include", signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`課程字幕讀取失敗（${response.status}）；請確認仍已登入`);
      const data = await response.json();
      const selected = core.select(data.asset?.captions || [], meta.locale);
      const storageKey = UdemyCourses.translationKey(courseId, lecture);
      const englishKey = `english-source:${courseId}:${lecture}`;
      // Existing React translations used only the lecture ID.
      const legacyKey = `translation:${lecture}`;
      const stored = await browser.storage.local.get([storageKey, englishKey, ...(courseId === 1362070 ? [legacyKey] : [])]);
      if (revision !== generation) return;
      // 課程主要語言決定雙語組合：英文課是中英雙語，日文課是中日雙語。
      const sourceCaption = selected.source?.caption || selected.english;
      applyPair(core.pairName(selected.sourceName), selected.source);
      if (sourceCaption?.url) {
        const englishVtt = await browser.runtime.sendMessage({ type: "caption-file", url: sourceCaption.url });
        if (revision !== generation) return;
        en = core.parse(englishVtt);
        if (!en.length) throw new Error("字幕格式無法解析");
      } else {
        const supplemental = stored[englishKey];
        if (supplemental?.sourceOrigin !== "audio-transcription") throw new Error("這堂課沒有可用的原始字幕");
        await validateEnglish(supplemental);
        if (revision !== generation) return;
        let maxEnd = 0;
        en = supplemental.cues.map(cue => {
          maxEnd = Math.max(maxEnd, cue.end);
          return { start: cue.start, end: cue.end, text: cue.en, maxEnd };
        });
        englishOrigin = "audio-transcription";
      }
      const hash = await sourceHash(en);
      if (revision !== generation) return;
      const translation = stored[storageKey] || (courseId === 1362070 ? stored[legacyKey] : null);
      if (translation?.cues?.length === en.length) {
        // 雜湊對得上原文字幕就用原文字幕；對不上但譯文自帶英文工作譯文且雜湊一致，就用它當第二行。
        const carried = translation.cues.every(cue => typeof cue.en === "string" && cue.en.trim());
        const texts = carried ? translation.cues.map(cue => cue.en) : en.map(cue => cue.text);
        const textHash = await sourceHash(en.map((cue,i) => ({ start: cue.start, end: cue.end, text: texts[i] })));
        if (textHash === translation.sourceHash) {
          // 第二行在英文課程是原文字幕，在小語種課程是譯文帶入的英文工作譯文。
          en = en.map((cue,i) => ({ ...cue, text: texts[i] }));
          zh = en.map((cue,i) => ({ ...cue, text: translation.cues[i].zh }));
        }
      }
      loaded = true;
      renderStatus();
      if (englishOrigin === "audio-transcription") status.textContent += " · 原始字幕來源：音訊轉錄";
      root.dataset.source = englishOrigin;
      root.dataset.status = zh.length ? "bilingual-ready" : "english-only";
      apply();
    } catch (error) {
      if (signal.aborted || revision !== generation) return;
      status.textContent = error.message || "字幕讀取失敗，請重試";
      root.dataset.status = "error";
      toggle.textContent = `${pairShort} CC · 請開設定`;
      setPanel(true);
    }
  }
  async function sourceHash(cues) {
    const bytes = new TextEncoder().encode(JSON.stringify(cues.map(({start,end,text}) => ({start,end,text}))));
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(x=>x.toString(16).padStart(2,"0")).join("");
  }
  function downloadJSON(value, filename) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));
    const link = document.createElement("a"); link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url),60000);
  }
  async function exportCurrent() {
    if (!en.length) { status.textContent = "請先等待原始字幕讀取完成"; return; }
    const lecture = key, cues = en, activeCourse = course, sourceOrigin = englishOrigin;
    const title = document.querySelector('[data-purpose="lecture-title"]')?.textContent || document.title;
    try {
      const courseId = await UdemyCourses.idFor(activeCourse);
      downloadJSON({version:1,courseId,sourceLanguage:sourceCode,targetLanguage:"zh-TW",lectures:[{
        id:lecture,title,sourceHash:await sourceHash(cues),sourceOrigin,sourceLanguage:sourceCode,
        cues:cues.map(({start,end,text},i)=>({id:i+1,start,end,en:text,zh:""}))
      }]},`Udemy-${sourceSlug}-${courseId}-${lecture}.json`);
      status.textContent = `已匯出 ${cues.length} 段${sourceLabel}；請交給翻譯工具處理後再匯入`;
    } catch (error) { status.textContent = error.message; }
  }
  let collecting = false;
  const minutes = seconds => seconds < 60 ? `${Math.ceil(seconds)} 秒` : `約 ${Math.ceil(seconds / 60)} 分鐘`;
  // 依課程主要語言更新按鈕與面板文字：英文課中英雙語、日文課中日雙語。
  // 匯出取的是原始字幕，所以按鈕名稱必須跟著語言變動，否則日文課會出現「匯出英文」。
  function applyPair(name, info) {
    pair = name;
    pairShort = name.replace("雙語", "");
    const lang = (info && (info.name || info)) || "原文";
    sourceLabel = lang;
    sourceCode = info?.code || "en";
    sourceSlug = core.languageSlug(sourceCode);
    const label = shadow?.querySelector(".import");
    if (label) label.textContent = `匯入${name}字幕`;
    const current = shadow?.querySelector(".export-current");
    if (current) current.textContent = `匯出本堂${lang}`;
    const exportCourse = shadow?.querySelector(".export-course");
    if (exportCourse) exportCourse.textContent = `匯出全課${lang}`;
    const note = shadow?.querySelector(".source");
    if (note) note.textContent = `中文由${lang}預先翻譯，採台灣術語；不使用 Udemy 自己的中文字幕。尚未匯入譯文時只顯示${lang}。`;
    const notice = shadow?.querySelector(".notice");
    if (notice && !notice.hidden && notice.textContent?.includes("匯出全課")) {
      notice.textContent = `此課程尚未加入翻譯清單（${course?.slug || ""}），目前只顯示官方原始字幕。可按「匯出全課${lang}」取出字幕後翻譯。`;
    }
    if (status) renderStatus();
  }
  function renderStatus() {
    if (!status) return;
    status.textContent = zh.length ? `${pair}字幕已就緒 · ${en.length} 段` :
      `${pairShort} ${en.length} 段已就緒；本堂尚未匯入${pair}字幕`;
  }
  function renderProgress(done, total, label) {
    const box = shadow?.querySelector(".progress");
    if (!box) return 0;
    box.hidden = false;
    const percent = total ? Math.min(100, Math.floor(done / total * 100)) : 0;
    box.querySelector(".progress-bar").style.width = `${percent}%`;
    box.querySelector(".progress-track").setAttribute("aria-valuenow", String(percent));
    box.querySelector(".progress-label").textContent = label;
    return percent;
  }
  async function exportCourse() {
    if (collecting) return;
    collecting = true;
    const button = shadow.querySelector(".export-course");
    const label = button.textContent;
    button.disabled = true;
    const lectures = [], errors = [], activeCourse = course;
    const started = Date.now();
    // A full course runs for minutes; open the panel so the progress stays visible.
    setPanel(true);
    renderProgress(0, 0, "正在讀取課程清單…");
    try {
      const meta = await UdemyCourses.metaFor(activeCourse);
      const courseId = meta.id, courseLocale = meta.locale;
      let next = new URL(`/api-2.0/courses/${courseId}/subscriber-curriculum-items/`,location.origin);
      next.searchParams.set('page_size','200');
      next.searchParams.set('fields[lecture]','id,title,asset');
      next.searchParams.set('fields[asset]','asset_type,captions');
      const items = [];
      while (next) {
        if (next.origin !== location.origin) throw new Error("課程清單來源不符");
        const response = await fetch(next,{credentials:"include"});
        if (!response.ok) throw new Error(`課程清單讀取失敗（${response.status}）`);
        const data = await response.json(); items.push(...data.results);
        next = data.next ? new URL(data.next,location.origin) : null;
      }
      // Keep the full curriculum and lecture order; verify_course_sources requires them.
      let order = 0;
      const curriculum = items.map(item => ({type:item._class,id:String(item.id),title:item.title,
        ...(item._class==='lecture'?{lectureOrder:++order,assetType:item.asset?.asset_type||null}:{})}));
      const videos = items.filter(x=>x._class==='lecture' && /^video$/i.test(x.asset?.asset_type || ''));
      if (!videos.length) throw new Error("課程清單沒有提供影片講座");
      let cues = 0;
      for (const [index, item] of videos.entries()) {
        status.textContent = `匯出${pairShort}字幕 ${index+1}/${videos.length} · ${item.title}`;
        try {
          let captions = item.asset?.captions;
          if (!captions?.length) {
            const response = await fetch(`/api-2.0/users/me/subscribed-courses/${courseId}/lectures/${item.id}/?fields[lecture]=asset&fields[asset]=captions`,{credentials:"include"});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            captions = (await response.json()).asset?.captions;
          }
          const picked = core.select(captions || [], courseLocale);
          const english = picked.source?.caption || picked.english;
          applyPair(core.pairName(picked.sourceName), picked.source);
          if (!english?.url) throw new Error("沒有可用的原始字幕");
          const parsed = core.parse(await browser.runtime.sendMessage({type:"caption-file",url:english.url}));
          if (!parsed.length) throw new Error("原始字幕無法解析");
          cues += parsed.length;
          lectures.push({id:String(item.id),title:item.title,
            lectureOrder:curriculum.find(entry => entry.type==='lecture' && entry.id===String(item.id))?.lectureOrder,
            videoOrder:index+1,sourceHash:await sourceHash(parsed),sourceLanguage:sourceCode,
            cues:parsed.map(({start,end,text},i)=>({id:i+1,start,end,en:text,zh:""}))});
        } catch(error) { errors.push({id:item.id,title:item.title,error:error.message}); }
        const done = index + 1, elapsed = (Date.now() - started) / 1000;
        const percent = renderProgress(done, videos.length,
          `已匯出 ${done}/${videos.length} 堂 · ${cues} 段${sourceLabel} · ${errors.length} 堂失敗 · 預計剩 ${minutes(elapsed / done * (videos.length - done))}`);
        button.textContent = `匯出中 ${percent}%`;
        await new Promise(resolve => setTimeout(resolve,300));
      }
      lectures.sort((a,b) => a.videoOrder - b.videoOrder);
      errors.sort((a,b) => videos.findIndex(x=>String(x.id)===String(a.id)) - videos.findIndex(x=>String(x.id)===String(b.id)));
      downloadJSON({version:1,courseId,courseSlug:activeCourse.slug,courseTitle:activeCourse.title || activeCourse.slug,
        sourceLanguage:sourceCode,targetLanguage:"zh-TW",lectures,errors,curriculum},`Udemy-${sourceSlug}-course-${courseId}.json`);
      status.textContent = `${sourceLabel}匯出完成：${lectures.length} 堂；${errors.length} 堂缺少字幕或讀取失敗`;
      renderProgress(videos.length, videos.length,
        `完成：${lectures.length} 堂 / ${cues} 段，${errors.length} 堂失敗，耗時 ${minutes((Date.now() - started) / 1000)}`);
    } catch(error) { status.textContent = error.message; }
    finally { collecting = false; button.disabled = false; button.textContent = label; }
  }
  async function validateEnglish(lecture) {
    if (!/^\d+$/.test(String(lecture.id)) || !Array.isArray(lecture.cues) || !lecture.cues.length || !/^[a-f0-9]{64}$/.test(lecture.sourceHash)) throw new Error("講座格式不正確");
    let previousStart = -1;
    for (const [index, cue] of lecture.cues.entries()) {
      if (cue.id !== index + 1 || typeof cue.en !== "string" || !cue.en.trim() || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.start < previousStart || cue.end <= cue.start) throw new Error(`${lecture.title || lecture.id} 第 ${index + 1} 段${sourceLabel}或時間軸格式錯誤`);
      previousStart = cue.start;
    }
    const hash = await sourceHash(lecture.cues.map(cue => ({start:cue.start,end:cue.end,text:cue.en})));
    if (hash !== lecture.sourceHash) throw new Error(`${lecture.title || lecture.id} 的英文或時間軸已變動`);
    return hash;
  }
  function supplementalEntry(lecture, hash) {
    return {id:String(lecture.id),title:lecture.title,sourceHash:hash,sourceOrigin:"audio-transcription",cues:lecture.cues.map(({id,start,end,en})=>({id,start,end,en})),importedAt:new Date().toISOString()};
  }
  async function importTranslation(event) {
    const activeCourse = course;
    const input = event.target;
    try {
      const file = input.files[0]; if (!file) return;
      const value = JSON.parse(await file.text());
      const courseId = await UdemyCourses.idFor(activeCourse);
      if (value.courseId !== courseId || value.targetLanguage !== "zh-TW") throw new Error("譯文必須來自本課原始字幕，目標語言為 zh-TW");
      const updates = {};
      if (!Array.isArray(value.lectures) || !value.lectures.length) throw new Error("譯文沒有講座資料");
      for (const lecture of value.lectures) {
        const hash = await validateEnglish(lecture);
        for (const [index,cue] of lecture.cues.entries()) {
          if (cue.id !== index+1 || typeof cue.en !== "string" || !cue.en.trim() || typeof cue.zh !== "string" || !cue.zh.trim() || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.end <= cue.start) throw new Error(`${lecture.title || lecture.id} 第 ${index+1} 段缺漏或格式錯誤`);
        }
        // 英文課程的 en 就是原文字幕；小語種課程的 en 是先翻出的英文工作譯文，一併保存作為第二行。
        updates[UdemyCourses.translationKey(courseId, lecture.id)] = {
          sourceHash:hash, translatedBy:"bilingual-zh-tw",
          cues:lecture.cues.map(c=>({zh:toTraditional(c.zh),en:c.en})),
          importedAt:new Date().toISOString()
        };
        if (lecture.sourceOrigin === "audio-transcription") updates[`english-source:${courseId}:${lecture.id}`] = supplementalEntry(lecture, hash);
      }
      await browser.storage.local.set(updates);
      if (course === activeCourse) { key = ""; check(); }
    } catch(error) { status.textContent = `匯入失敗：${error.message}`; }
    finally { input.value = ""; }
  }
  function check() {
    const activeCourse = UdemyCourses.forUrl(location.href);
    if (activeCourse !== course) {
      course = activeCourse; key = ""; ++generation; controller?.abort();
      ++timeRevision; timeController?.abort(); timeCourse = null; timeCourseId = null; timeItems = null; timeError = "";
      en = []; zh = []; loaded = false; last = "";
      if (root) apply();
    }
    if (!course) {
      if (root) root.hidden = true;
      player?.classList.remove("udemy-bilingual-active");
      return;
    }
    if (root) root.hidden = false;
    loadCourseTime();
    if (!zoomPending && Date.now() - zoomChecked > 2000) {
      zoomPending = true; zoomChecked = Date.now();
      browser.runtime.sendMessage({type:"page-zoom"}).then(value => {
        if (Number.isFinite(value) && value > 0 && value <= 5 && value !== pageZoom) {
          pageZoom = value; if (root) apply();
        }
      }).catch(() => {}).finally(() => { zoomPending = false; });
    }
    const next = [...document.querySelectorAll("video")].find(v => v.getBoundingClientRect().width > 100);
    if (next && (next !== video || !root?.isConnected)) {
      if (video) for (const event of ["timeupdate", "seeked", "loadedmetadata", "pause", "ended"]) video.removeEventListener(event, renderEvent);
      root?.remove(); player?.classList.remove("udemy-bilingual-active");
      video = next;
      player = video.closest(".video-js") || video.closest('[data-purpose="video-player"]') || video.parentElement;
      if (getComputedStyle(player).position === "static") player.style.position = "relative";
      mount(); key = "";
      resizeObserver.disconnect(); resizeObserver.observe(player);
      for (const event of ["timeupdate", "seeked", "loadedmetadata", "pause", "ended"]) video.addEventListener(event, renderEvent);
    }
    const lecture = location.pathname.match(/\/lecture\/(\d+)/)?.[1];
    if (video && root?.isConnected && lecture && lecture !== key) { key = lecture; load(lecture); }
    // Udemy's full-screen target includes its video player. Move the overlay for wrappers that differ.
    const full = document.fullscreenElement;
    if (root && full && full !== video && !full.contains(root) && full.contains(video)) full.append(root);
    else if (root && !full && root.parentElement !== player) player.append(root);
    render();
    renderCourseTime();
  }
  function renderEvent() { render(); renderCourseTime(); }
  const resizeObserver = new ResizeObserver(() => { if(root) { root.style.setProperty("--player-height",`${player.clientHeight}px`); root.style.setProperty("--player-width",`${player.clientWidth}px`); render(true); } });
  const nativeStyle = document.createElement("style");
  nativeStyle.textContent = `.udemy-bilingual-active .vjs-text-track-display,
    .udemy-bilingual-active [data-purpose="captions-display"],
    .udemy-bilingual-active [data-purpose="captions-cue-text"],
    .udemy-bilingual-active [class*="captions-display-module--captions-container"],
    .udemy-bilingual-active [class*="captions-display--captions-container"],
    .udemy-bilingual-active [class*="captions-display--captions-cue-text"] { visibility:hidden!important; }`;
  document.head.append(nativeStyle);
  browser.storage.local.get("subtitlePrefs").then(result => {
    const stored = result.subtitlePrefs || {};
    const legacyY = stored.bottom === undefined || Number(stored.bottom) === 10 ? defaults.y : 100 - Number(stored.bottom);
    prefs = { ...defaults, ...stored, y: stored.y ?? legacyY };
    if (!Object.hasOwn(backgroundColors, prefs.color)) prefs.color = defaults.color;
    prefs.x = Number.isFinite(Number(prefs.x)) ? Math.min(92, Math.max(8, Number(prefs.x))) : defaults.x;
    prefs.y = Number.isFinite(Number(prefs.y)) ? Math.min(96, Math.max(4, Number(prefs.y))) : defaults.y;
    delete prefs.bottom;
    check();
    setInterval(check, 500);
  }).catch(() => { check(); setInterval(check, 500); });
})();
