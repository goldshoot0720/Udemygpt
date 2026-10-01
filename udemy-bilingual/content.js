(() => {
  "use strict";
  if (document.getElementById("udemy-bilingual-root")) return;
  const core = SubtitleCore;
  let course = UdemyCourses.forUrl(location.href);
  if (!course) return;
  const convertCharacters = OpenCC.Converter({ from: "cn", to: "tw" });
  const toTraditional = text => SubtitleCore.localizeTaiwan(convertCharacters(text));
  const defaults = { enabled: true, effect: "glow", size: 25, bottom: 10, offset: 0 };
  let prefs = { ...defaults }, video, player, root, shadow, chineseLine, englishLine, panel, status, toggle;
  let en = [], zh = [], key = "", loaded = false, generation = 0, controller, last = "", savedTimer;
  let pageZoom = 1, zoomChecked = 0, zoomPending = false;
  let timeCourse = null, timeItems = null, timeError = "", timeRevision = 0, timeController;
  const terms = /\b(Claude(?: Code)?|Codex|Flutter|Dart|Node(?:\.js|JS)?|React Native|NativeScript|Angular|Svelte(?:\.js)?|Remix(?:\.js)?|GraphQL|Express|MongoDB|Deno|Flexbox|Sass|React(?:\.js)?|JavaScript|TypeScript|JSX|Redux|Next\.js|Hooks?|useState|useEffect|useReducer|useRef|useContext|props|state|components?|DOM|API|HTTP|CSS|HTML|Vite)\b/gi;
  const css = `
    :host { all: initial; position: absolute; inset: 0; z-index: 30; pointer-events: none; font-family: -apple-system,BlinkMacSystemFont,"PingFang TC","Noto Sans TC",sans-serif; color: white; }
    * { box-sizing: border-box; }
    .captions { position: absolute; left: 8%; right: 8%; bottom: var(--bottom,10%); text-align: center; pointer-events: none; }
    .lines { display: inline-flex; max-width: 100%; flex-direction: column; gap: calc(5px*var(--ui-scale,1)); padding: calc(9px*var(--ui-scale,1)) calc(16px*var(--ui-scale,1)); border-radius: calc(12px*var(--ui-scale,1)); background: linear-gradient(120deg,rgba(8,14,28,.89),rgba(14,21,39,.82)); border: 1px solid rgba(136,187,255,.25); box-shadow: 0 4px 20px #0006; }
    .lines[hidden], [hidden] { display: none !important; }
    .zh { font-size: var(--zh-size,var(--size,25px)); line-height: 1.35; font-weight: 650; text-wrap: pretty; line-break: strict; word-break: normal; text-shadow: 0 1px 4px #000; }
    .en { font-size: calc(var(--size,25px)*.76); line-height: 1.3; color: #e1eaff; text-wrap: pretty; text-shadow: 0 1px 4px #000; }
    mark { color: #79e6ff; background: transparent; font-weight: 750; text-shadow: 0 0 14px #49b7ff88; }
    .fade { animation: cue-in .16s ease-out both; }
    @keyframes cue-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    :host([data-effect="minimal"]) .lines { background: #0009; border: 0; border-radius: 6px; box-shadow: none; }
    :host([data-effect="minimal"]) mark { color: inherit; font-weight: inherit; text-shadow: inherit; }
    :host([data-effect="minimal"]) .fade { animation: none; }
    :host([data-effect="cinema"]) .lines { background: transparent; border: 0; box-shadow: none; }
    :host([data-effect="cinema"]) .zh,:host([data-effect="cinema"]) .en { text-shadow: 1px 1px 3px #000,-1px -1px 3px #000,0 2px 8px #000; }
    :host([data-effect="cinema"]) mark { color: #ffe29d; text-shadow: 0 2px 4px #000; }
    .controls { position: absolute; top: 10px; left: 10px; pointer-events: auto; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; transform:scale(var(--ui-scale,1)); transform-origin:top left; }
    button,select,input { font: inherit; }
    button { color: #eef6ff; background: #0a1527e8; border: 1px solid #ffffff30; border-radius: 9px; padding: 7px 10px; font-size: 12px; cursor: pointer; }
    button:hover,button:focus-visible { border-color: #79e6ff; outline: none; }
    .toolbar { display: flex; gap: 4px; opacity: .25; transition: opacity .15s; }
    .course-time { width: 310px; max-width:calc(var(--player-width,800px)/var(--ui-scale,1) - 20px); padding:8px 10px; border:1px solid #ffffff30; border-radius:9px; background:#0a1527e8; font-size:12px; line-height:1.5; pointer-events:auto; }
    .time-current { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#eef6ff; }
    .time-values { display:flex; flex-wrap:wrap; column-gap:12px; color:#79e6ff; font-variant-numeric:tabular-nums; }
    .time-total,.time-note { color:#b9cee8; font-size:11px; }
    .time-retry { margin-top:5px; padding:4px 8px; }
    :host(:hover) .toolbar,.toolbar:focus-within,.toolbar[data-open="true"] { opacity: 1; }
    .panel { width: 290px; max-height:calc(var(--player-height,400px)/var(--ui-scale,1) - 65px); overflow:auto; background: #0a1527f5; border: 1px solid #ffffff30; border-radius: 12px; padding: 14px; box-shadow: 0 6px 20px #0008; font-size: 13px; }
    label { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
    select { max-width: 145px; color: white; border: 1px solid #ffffff40; background: #14253d; border-radius: 6px; padding: 4px; }
    input[type="range"] { width: 125px; accent-color: #7fdcff; }
    input[type="number"] { width: 80px; color: white; border: 1px solid #ffffff40; background: #14253d; border-radius: 6px; padding: 4px; }
    .status { color: #b9cee8; font-size: 12px; line-height: 1.5; margin-bottom: 10px; }
    .source { font-size: 11px; color: #a0b2c9; line-height: 1.5; margin: 8px 0 0; }
    @media(max-width:600px) { .captions { left: 3%; right: 3%; } .lines { padding: 8px 12px; } .zh { font-size: min(var(--zh-size,var(--size,25px)),20px); } .en { font-size: min(calc(var(--size,25px)*.76),16px); } }
    @media(prefers-reduced-motion:reduce) { .fade { animation: none; } .toolbar { transition: none; } }
  `;
  function save() {
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => browser.storage.local.set({ subtitlePrefs: prefs }).catch(() => {}), 200);
  }
  function apply() {
    root.style.setProperty("--size", `${prefs.size / pageZoom}px`);
    root.style.setProperty("--ui-scale", String(1 / pageZoom));
    root.style.setProperty("--player-height", `${player.clientHeight}px`);
    root.style.setProperty("--player-width", `${player.clientWidth}px`);
    root.style.setProperty("--bottom", `${prefs.bottom}%`);
    root.dataset.effect = prefs.effect;
    toggle.textContent = prefs.enabled ? (zh.length ? "中英 CC ✓" : "中英 CC · 中文待翻譯") : "中英 CC 關";
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
  }
  function mount() {
    root = document.createElement("div"); root.id = "udemy-bilingual-root";
    shadow = root.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${css}</style>
      <div class="captions"><div class="lines" hidden><div class="zh" lang="zh-TW"></div><div class="en" lang="en"></div></div></div>
      <div class="controls"><div class="toolbar"><button class="toggle" type="button">中英 CC ✓</button><button class="settings" type="button" aria-label="雙語字幕設定" aria-expanded="false">設定</button></div>
      <div class="course-time" aria-label="課程影片分鐘數">
      <div class="time-current">正在讀取課程時長…</div><div class="time-total"></div>
      <div class="time-values"><span class="time-watched"></span><span class="time-remaining"></span></div>
      <div class="time-note">依序觀看估算：前面影片＋本堂播放位置</div>
      <button class="time-retry" type="button" hidden>重新讀取時長</button></div>
      <div class="panel" hidden><div class="status" role="status">正在讀取課程字幕…</div>
      <label>字幕效果<select name="effect"><option value="glow">光暈＋淡入</option><option value="cinema">電影描邊</option><option value="minimal">簡潔閱讀</option></select></label>
      <label>字體大小<input name="size" type="range" min="16" max="40" aria-label="字體大小"></label>
      <label>字幕高度<input name="bottom" type="range" min="5" max="65" aria-label="字幕高度"></label>
      <label>時間校正（秒）<input name="offset" type="number" min="-10" max="10" step="0.1" aria-label="字幕時間校正"></label>
      <button class="retry" type="button">重新讀取字幕</button>
      <button class="export-current" type="button">匯出本堂英文</button>
      <button class="export-course" type="button">匯出全課英文</button>
      <button class="import" type="button">匯入 ChatGPT 譯文</button>
      <input class="import-file" type="file" accept=".json,application/json" hidden>
      <p class="source">中文由英文預先翻譯，採台灣術語；不使用 Udemy 中文字幕。尚未匯入譯文時只顯示英文。</p></div></div>`;
    player.append(root);
    chineseLine = shadow.querySelector(".zh"); englishLine = shadow.querySelector(".en");
    toggle = shadow.querySelector(".toggle"); status = shadow.querySelector(".status"); panel = shadow.querySelector(".panel");
    toggle.addEventListener("click", () => { prefs.enabled = !prefs.enabled; apply(); save(); });
    const settings = shadow.querySelector(".settings");
    settings.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      settings.setAttribute("aria-expanded", String(!panel.hidden));
      shadow.querySelector(".toolbar").dataset.open = String(!panel.hidden);
    });
    shadow.querySelector(".retry").addEventListener("click", () => { key = ""; check(); });
    shadow.querySelector(".time-retry").addEventListener("click", () => loadCourseTime(true));
    shadow.querySelector(".export-current").addEventListener("click", exportCurrent);
    shadow.querySelector(".export-course").addEventListener("click", exportCourse);
    shadow.querySelector(".import").addEventListener("click", () => shadow.querySelector(".import-file").click());
    shadow.querySelector(".import-file").addEventListener("change", importTranslation);
    for (const input of shadow.querySelectorAll("select,input[name]")) {
      input.value = prefs[input.name];
      input.addEventListener("input", () => {
        prefs[input.name] = input.name === "effect" ? input.value : Number(input.value);
        apply(); save();
      });
    }
    root.addEventListener("keydown", event => {
      event.stopPropagation();
      if (event.key === "Escape" && !panel.hidden) { panel.hidden = true; settings.setAttribute("aria-expanded", "false"); shadow.querySelector(".toolbar").dataset.open = "false"; }
    });
    root.addEventListener("click", event => event.stopPropagation());
    apply();
    renderCourseTime();
  }
  function renderCourseTime() {
    if (!shadow) return;
    const current = shadow.querySelector(".time-current"), total = shadow.querySelector(".time-total");
    const watched = shadow.querySelector(".time-watched"), remaining = shadow.querySelector(".time-remaining");
    const note = shadow.querySelector(".time-note"), retry = shadow.querySelector(".time-retry");
    const lecture = location.pathname.match(/\/lecture\/(\d+)/)?.[1];
    if (!timeItems) {
      current.textContent = timeError || "正在讀取課程時長…";
      total.textContent = ""; watched.textContent = "已觀看 — 分鐘"; remaining.textContent = "未觀看 — 分鐘";
      note.textContent = "依序觀看估算：前面影片＋本堂播放位置";
      retry.hidden = !timeError; return;
    }
    const result = UdemyCourseTime.calculate(timeItems, lecture, video?.currentTime || 0);
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
    timeCourse = activeCourse; timeItems = null; timeError = ""; renderCourseTime();
    try {
      const courseId = await UdemyCourses.idFor(activeCourse);
      if (revision !== timeRevision) return;
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
    status.textContent = "正在讀取課程字幕…";
    try {
      const courseId = await UdemyCourses.idFor(activeCourse);
      if (revision !== generation) return;
      const url = new URL(`/api-2.0/users/me/subscribed-courses/${courseId}/lectures/${lecture}/`, location.origin);
      url.searchParams.set("fields[lecture]", "asset");
      url.searchParams.set("fields[asset]", "captions");
      const response = await fetch(url, { credentials: "include", signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`課程字幕讀取失敗（${response.status}）；請確認仍已登入`);
      const data = await response.json();
      const selected = core.select(data.asset?.captions || []);
      if (!selected.english?.url) throw new Error("這堂課沒有可用的英文字幕");
      const download = caption => caption?.url ? browser.runtime.sendMessage({ type: "caption-file", url: caption.url }) : Promise.resolve("");
      const englishVtt = await download(selected.english);
      if (revision !== generation) return;
      en = core.parse(englishVtt);
      if (!en.length) throw new Error("英文字幕格式無法解析");
      const hash = await sourceHash(en);
      const storageKey = UdemyCourses.translationKey(courseId, lecture);
      // Existing React translations used only the lecture ID.
      const legacyKey = `translation:${lecture}`;
      const stored = await browser.storage.local.get(courseId === 1362070 ? [storageKey, legacyKey] : storageKey);
      if (revision !== generation) return;
      const translation = stored[storageKey] || (courseId === 1362070 ? stored[legacyKey] : null);
      if (translation?.sourceHash === hash && translation.cues?.length === en.length) {
        zh = en.map((cue,i) => ({ ...cue, text: translation.cues[i].zh }));
      }
      loaded = true;
      status.textContent = zh.length ? `ChatGPT 英文預譯已就緒 · ${en.length} 段中英字幕` :
        `英文 ${en.length} 段已就緒；本堂尚未匯入 ChatGPT 譯文`;
      root.dataset.status = zh.length ? "bilingual-ready" : "english-only";
      apply();
    } catch (error) {
      if (signal.aborted || revision !== generation) return;
      status.textContent = error.message || "字幕讀取失敗，請重試";
      root.dataset.status = "error";
      toggle.textContent = "中英 CC · 請開設定";
      panel.hidden = false;
      shadow.querySelector(".toolbar").dataset.open = "true";
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
    if (!en.length) { status.textContent = "請先等待英文字幕讀取完成"; return; }
    const lecture = key, cues = en, activeCourse = course;
    const title = document.querySelector('[data-purpose="lecture-title"]')?.textContent || document.title;
    try {
      const courseId = await UdemyCourses.idFor(activeCourse);
      downloadJSON({version:1,courseId,sourceLanguage:"en",targetLanguage:"zh-TW",lectures:[{
        id:lecture,title,sourceHash:await sourceHash(cues),
        cues:cues.map(({start,end,text},i)=>({id:i+1,start,end,en:text,zh:""}))
      }]},`Udemy-English-${courseId}-${lecture}.json`);
      status.textContent = `已匯出 ${cues.length} 段英文；請交給 ChatGPT 翻譯`;
    } catch (error) { status.textContent = error.message; }
  }
  let collecting = false;
  async function exportCourse() {
    if (collecting) return;
    collecting = true;
    const button = shadow.querySelector(".export-course"); button.disabled = true;
    const lectures = [], errors = [], activeCourse = course;
    try {
      const courseId = await UdemyCourses.idFor(activeCourse);
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
      const videos = items.filter(x=>x._class==='lecture' && /^video$/i.test(x.asset?.asset_type || ''));
      if (!videos.length) throw new Error("課程清單沒有提供影片講座");
      for (const [index,item] of videos.entries()) {
        status.textContent = `匯出英文字幕 ${index+1}/${videos.length} · ${item.title}`;
        try {
          let captions = item.asset?.captions;
          if (!captions?.length) {
            const response = await fetch(`/api-2.0/users/me/subscribed-courses/${courseId}/lectures/${item.id}/?fields[lecture]=asset&fields[asset]=captions`,{credentials:"include"});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            captions = (await response.json()).asset?.captions;
          }
          const english = core.select(captions || []).english;
          if (!english?.url) throw new Error("沒有英文字幕");
          const cues = core.parse(await browser.runtime.sendMessage({type:"caption-file",url:english.url}));
          if (!cues.length) throw new Error("英文字幕無法解析");
          lectures.push({id:String(item.id),title:item.title,sourceHash:await sourceHash(cues),cues:cues.map(({start,end,text},i)=>({id:i+1,start,end,en:text,zh:""}))});
        } catch(error) { errors.push({id:item.id,title:item.title,error:error.message}); }
        await new Promise(resolve => setTimeout(resolve,300));
      }
      downloadJSON({version:1,courseId,sourceLanguage:"en",targetLanguage:"zh-TW",lectures,errors},`Udemy-English-course-${courseId}.json`);
      status.textContent = `英文匯出完成：${lectures.length} 堂；${errors.length} 堂缺少字幕或讀取失敗`;
    } catch(error) { status.textContent = error.message; }
    finally { collecting = false; button.disabled = false; }
  }
  async function importTranslation(event) {
    const activeCourse = course;
    try {
      const file = event.target.files[0]; if (!file) return;
      const value = JSON.parse(await file.text());
      const courseId = await UdemyCourses.idFor(activeCourse);
      if (value.courseId !== courseId || value.sourceLanguage !== "en" || value.targetLanguage !== "zh-TW") throw new Error("譯文必須來自本課英文字幕，目標語言為 zh-TW");
      const updates = {};
      if (!Array.isArray(value.lectures) || !value.lectures.length) throw new Error("譯文沒有講座資料");
      for (const lecture of value.lectures) {
        if (!/^\d+$/.test(String(lecture.id)) || !lecture.cues?.length || !/^[a-f0-9]{64}$/.test(lecture.sourceHash)) throw new Error("講座格式不正確");
        for (const [index,cue] of lecture.cues.entries()) {
          if (cue.id !== index+1 || typeof cue.en !== "string" || !cue.en.trim() || typeof cue.zh !== "string" || !cue.zh.trim() || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.end <= cue.start) throw new Error(`${lecture.title || lecture.id} 第 ${index+1} 段缺漏或格式錯誤`);
        }
        const hash = await sourceHash(lecture.cues.map(c=>({start:c.start,end:c.end,text:c.en})));
        if (hash !== lecture.sourceHash) throw new Error(`${lecture.title || lecture.id} 的英文或時間軸已變動`);
        updates[UdemyCourses.translationKey(courseId, lecture.id)] = {sourceHash:hash,translatedBy:"ChatGPT",cues:lecture.cues.map(c=>({zh:toTraditional(c.zh)})),importedAt:new Date().toISOString()};
      }
      await browser.storage.local.set(updates);
      if (course === activeCourse) { key = ""; check(); }
    } catch(error) { status.textContent = `匯入失敗：${error.message}`; }
    finally { event.target.value = ""; }
  }
  function check() {
    const activeCourse = UdemyCourses.forUrl(location.href);
    if (activeCourse !== course) {
      course = activeCourse; key = ""; ++generation; controller?.abort();
      ++timeRevision; timeController?.abort(); timeCourse = null; timeItems = null; timeError = "";
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
    prefs = { ...defaults, ...result.subtitlePrefs };
    check();
    setInterval(check, 500);
  }).catch(() => { check(); setInterval(check, 500); });
})();
