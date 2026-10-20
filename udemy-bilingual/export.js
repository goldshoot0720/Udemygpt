/* Runs in an extension page; uses the existing Udemy host permissions only. */
(async () => {
  'use strict';
  const surface = document.getElementById?.('udemy-english-export')?.shadowRoot || document;
  const start = surface.querySelector('#start');
  if (!start) return;
  const status = surface.querySelector('#status'), list = surface.querySelector('#courses');
  const skipReact = surface.querySelector('#skip-react');
  const inPlayer = typeof location !== 'undefined' && location.origin === 'https://www.udemy.com';
  const timedFetch = (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  const rows = new Map();
  // The course open in the player is always offered, even when it is not in the prepared list.
  const current = inPlayer ? UdemyCourses.forUrl(location.href) : null;
  const offered = [...UdemyCourses.courses];
  if (current && !offered.some(course => course.slug === current.slug)) offered.unshift(current);
  for (const course of offered) {
    const row = document.createElement('li');
    row.textContent = course.known ? course.title : `${course.slug}（目前課程，未加入翻譯清單）`;
    const state = document.createElement('small'); state.textContent = '待下載'; row.append(state); list.append(row);
    rows.set(course.slug, { row, state });
  }
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function json(url) {
    const address = new URL(url, 'https://www.udemy.com');
    if (address.origin !== 'https://www.udemy.com') throw new Error('課程清單來源不符');
    const response = await timedFetch(address.href, { credentials: 'include', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`課程讀取失敗（HTTP ${response.status}）；請確認登入及觀看權限`);
    return response.json();
  }
  async function caption(url) {
    const address = new URL(url);
    if (address.protocol !== 'https:' || !(address.hostname.endsWith('.udemycdn.com') || address.hostname === 'udemy-captions.s3.amazonaws.com' || address.hostname === 'www.udemy.com')) throw new Error('字幕來源不是 Udemy');
    if (inPlayer) return browser.runtime.sendMessage({type:'caption-file',url:address.href});
    const response = await timedFetch(address.href, { credentials: 'omit', redirect: 'error' });
    if (!response.ok) throw new Error(`原始字幕讀取失敗（HTTP ${response.status}）`);
    const text = await response.text();
    if (text.length > 5000000) throw new Error('字幕檔過大');
    return text;
  }
  async function hash(cues) {
    const data = new TextEncoder().encode(JSON.stringify(cues.map(({ start, end, text }) => ({ start, end, text }))));
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  function download(value, filename, row) {
    const link = document.createElement('a'); link.textContent = '下載 JSON'; link.download = filename;
    link.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    row.append(link); link.click();
  }
  start.addEventListener('click', async () => {
    start.disabled = true; skipReact.disabled = true;
    const report = { version: 1, startedAt: new Date().toISOString(), courses: [] };
    const skipped = new Set(inPlayer ? (new URL(location.href).searchParams.get('subtitleExportSkip') || '').split(',') : []);
    const targets = offered.filter(course => !(skipReact.checked && course.id === 1362070) && !skipped.has(course.slug));
    for (const slug of skipped) if (rows.has(slug)) rows.get(slug).state.textContent = '沿用已驗證英文備份';
    if (skipReact.checked) rows.get('react-the-complete-guide-incl-redux').state.textContent = '沿用已有完整英文備份';
    for (const [index, course] of targets.entries()) {
      const { row, state } = rows.get(course.slug);
      const record = { slug: course.slug, title: course.title, status: 'pending' }; report.courses.push(record);
      try {
        status.textContent = `課程 ${index + 1}/${targets.length} · ${course.title}`;
        state.textContent = '正在辨識課程 ID…';
        const meta = await UdemyCourses.metaFor(course, timedFetch);
        const courseId = meta.id, courseLocale = meta.locale;
        record.courseId = courseId;
        state.textContent = '正在讀取完整課程清單…';
        const items = [];
        // Caption lists can be large; retrieve them only through each authorized lecture.
        let next = `/api-2.0/courses/${courseId}/subscriber-curriculum-items/?page_size=100&fields[lecture]=id,title,asset&fields[asset]=asset_type`;
        let page = 0;
        while (next) {
          state.textContent = `正在讀取完整課程清單（第 ${++page} 頁）…`;
          const data = await json(next); items.push(...data.results); next = data.next;
        }
        let lectureOrder = 0;
        const curriculum = items.map(item => ({ type: item._class, id: item.id, title: item.title,
          ...(item._class === 'lecture' ? { lectureOrder: ++lectureOrder, assetType: item.asset?.asset_type || null } : {}) }));
        const videos = items.filter(item => item._class === 'lecture' && /^video$/i.test(item.asset?.asset_type || ''));
        if (!videos.length) throw new Error('未取得影片講座清單');
        const result = { version: 1, courseId, courseSlug: course.slug, courseTitle: course.title,
          sourceLanguage: 'en', targetLanguage: 'zh-TW', lectures: [], errors: [], curriculum };
        // 匯出檔名與 sourceLanguage 跟著課程原始字幕語言走。
        let courseCode = 'en', courseSlug = 'English', courseName = '英文';
        for (let batchStart = 0; batchStart < videos.length; batchStart += 3) {
          const group = videos.slice(batchStart, batchStart + 3);
          state.textContent = `下載 ${batchStart + 1}–${batchStart + group.length}/${videos.length} · ${group[0].title}`;
          await Promise.all(group.map(async (item, offset) => {
          const videoIndex = batchStart + offset;
          try {
            // Check access through the same subscribed-lecture endpoint used by the player.
            const lecture = await json(`/api-2.0/users/me/subscribed-courses/${courseId}/lectures/${item.id}/?fields[lecture]=asset&fields[asset]=captions`);
            const picked = SubtitleCore.select(lecture.asset?.captions || [], courseLocale);
            const english = picked.source?.caption || picked.english;
            if (!english?.url) throw new Error(`沒有${picked.sourceName || '原始'}字幕`);
            if (!courseCode || result.sourceLanguage === 'en') {
              courseCode = picked.sourceCode || 'en';
              courseSlug = SubtitleCore.languageSlug(courseCode);
              courseName = picked.sourceName || '原文';
              result.sourceLanguage = courseCode;
            }
            const cues = SubtitleCore.parse(await caption(english.url));
            if (!cues.length) throw new Error(`${picked.sourceName || '原始'}字幕無法解析`);
            result.lectures.push({ id: String(item.id), title: item.title,
              lectureOrder: curriculum.find(entry => entry.type === 'lecture' && entry.id === item.id)?.lectureOrder,
              videoOrder: videoIndex + 1, sourceHash: await hash(cues), sourceLanguage: courseCode,
              cues: cues.map(({ start, end, text }, i) => ({ id: i + 1, start, end, en: text, zh: '' })) });
          } catch (error) { result.errors.push({ id: item.id, title: item.title, error: error.message }); }
          }));
          await delay(300);
        }
        result.lectures.sort((a,b) => a.videoOrder - b.videoOrder);
        result.errors.sort((a,b) => videos.findIndex(item=>item.id===a.id) - videos.findIndex(item=>item.id===b.id));
        record.status = result.errors.length ? 'partial' : 'downloaded';
        record.videoCount = videos.length; record.downloadedLectures = result.lectures.length;
        record.cueCount = result.lectures.reduce((count, lecture) => count + lecture.cues.length, 0);
        record.errors = result.errors;
        record.filename = `Udemy-${courseSlug}-course-${courseId}.json`;
        download(result, record.filename, row);
        state.textContent = `${courseName}匯出：${record.downloadedLectures}/${record.videoCount} 堂影片、${record.cueCount} 段；${result.errors.length} 堂待補`;
      } catch (error) { record.status = 'failed'; record.error = error.message; state.textContent = error.message; }
    }
    report.finishedAt = new Date().toISOString();
    download(report, 'Udemy-export-report.json', status);
    status.prepend(document.createTextNode(`匯出結束：${report.courses.filter(x => x.status === 'downloaded').length}/${targets.length} 門成功；請檢查各課程結果。 `));
    start.disabled = false; skipReact.disabled = false;
  });
  const loadMine = surface.querySelector('#load-mine');
  const registerMine = surface.querySelector('#register-mine');
  const mineStatus = surface.querySelector('#mine-status');
  const mineList = surface.querySelector('#mine');
  if (loadMine && registerMine && mineStatus && mineList && typeof UdemySubscribed !== 'undefined') {
    const mineRows = [];
    function addExportRow(course) {
      if (rows.has(course.slug)) return;
      offered.push(course);
      const row = document.createElement('li');
      row.textContent = course.title;
      const state = document.createElement('small');
      state.textContent = '待下載';
      row.append(state);
      list.append(row);
      rows.set(course.slug, { row, state });
    }
    loadMine.addEventListener('click', async () => {
      loadMine.disabled = true;
      registerMine.disabled = true;
      mineRows.length = 0;
      mineList.replaceChildren();
      mineStatus.textContent = '正在讀取已加入的課程…';
      try {
        const found = [];
        const seen = new Set();
        let next = '/api-2.0/users/me/subscribed-courses/?page_size=100&fields[course]=title,url,locale,visible_instructors';
        for (let page = 0; next && page < 20; page++) {
          const requested = new URL(next, 'https://www.udemy.com').href;
          mineStatus.textContent = `正在讀取已加入的課程（第 ${page + 1} 頁）…`;
          const data = await json(next);
          for (const raw of Array.isArray(data.results) ? data.results : []) {
            const course = UdemySubscribed.courseFromApi(raw);
            if (!course || seen.has(course.id)) continue;
            seen.add(course.id);
            found.push(course);
          }
          const upcoming = typeof data.next === 'string' ? new URL(data.next, 'https://www.udemy.com').href : '';
          next = upcoming && upcoming !== requested ? data.next : null;
        }
        let listed = 0, englishChecked = 0;
        for (const course of found) {
          const known = UdemySubscribed.isListed(course, UdemyCourses.courses);
          const english = course.locale.startsWith('en');
          const row = document.createElement('li');
          const label = document.createElement('label');
          const box = document.createElement('input');
          box.type = 'checkbox';
          box.checked = !known && english;
          box.disabled = known;
          label.append(box, document.createTextNode(` ${course.title}`));
          const state = document.createElement('small');
          const language = course.locale || '語言未知';
          const who = course.instructor ? ` · ${course.instructor}` : '';
          state.textContent = known
            ? `課程 ID ${course.id} · ${language}${who} · 已在翻譯清單，略過`
            : `課程 ID ${course.id} · ${language}${who} · ${english ? '可登錄' : '可登錄，原文不是英文'}`;
          row.append(label, state);
          mineList.append(row);
          mineRows.push({ course, box, state });
          if (known) listed++;
          else if (english) englishChecked++;
        }
        const fresh = found.length - listed;
        mineStatus.textContent = found.length
          ? `讀取 ${found.length} 門：${listed} 門已在翻譯清單，${fresh} 門可登錄。已勾選 ${englishChecked} 門英文新課程。`
          : '此帳號沒有已加入的課程。';
        registerMine.disabled = fresh === 0;
      } catch (error) {
        mineStatus.textContent = error.message;
        registerMine.disabled = true;
      } finally {
        loadMine.disabled = false;
      }
    });
    registerMine.addEventListener('click', () => {
      const selected = mineRows.filter(row => row.box.checked && !row.box.disabled).map(row => row.course);
      if (!selected.length) {
        mineStatus.textContent = '請先勾選要登錄的課程。';
        return;
      }
      let documentJson;
      try {
        documentJson = UdemySubscribed.registrationDocument(selected, new Date().toISOString());
      } catch (error) {
        mineStatus.textContent = error.message;
        return;
      }
      for (const row of mineRows) {
        if (!row.box.checked || row.box.disabled) continue;
        const course = Object.freeze({ slug: row.course.slug, title: row.course.title, id: row.course.id, instructor: row.course.instructor || '未提供', known: true });
        addExportRow(course);
        row.box.disabled = true;
        row.state.textContent = `課程 ID ${row.course.id} · ${row.course.locale || '語言未知'} · 已加入本次匯出清單`;
      }
      download(documentJson, 'subscribed-courses-register.json', mineStatus);
      mineStatus.prepend(document.createTextNode(`已登錄 ${selected.length} 門，並加入下方匯出清單。請再執行 node scripts/register_subscribed_courses.cjs，把下載的 subscribed-courses-register.json 寫進專案。 `));
      registerMine.disabled = !mineRows.some(row => !row.box.disabled);
    });
  }
})();
