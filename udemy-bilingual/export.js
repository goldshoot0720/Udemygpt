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
  for (const course of UdemyCourses.courses) {
    const row = document.createElement('li'); row.textContent = course.title;
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
    if (!response.ok) throw new Error(`英文字幕讀取失敗（HTTP ${response.status}）`);
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
    const targets = UdemyCourses.courses.filter(course => !(skipReact.checked && course.id === 1362070) && !skipped.has(course.slug));
    for (const slug of skipped) if (rows.has(slug)) rows.get(slug).state.textContent = '沿用已驗證英文備份';
    if (skipReact.checked) rows.get('react-the-complete-guide-incl-redux').state.textContent = '沿用已有完整英文備份';
    for (const [index, course] of targets.entries()) {
      const { row, state } = rows.get(course.slug);
      const record = { slug: course.slug, title: course.title, status: 'pending' }; report.courses.push(record);
      try {
        status.textContent = `課程 ${index + 1}/${targets.length} · ${course.title}`;
        state.textContent = '正在辨識課程 ID…';
        const courseId = await UdemyCourses.idFor(course, timedFetch);
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
        for (let batchStart = 0; batchStart < videos.length; batchStart += 3) {
          const group = videos.slice(batchStart, batchStart + 3);
          state.textContent = `下載 ${batchStart + 1}–${batchStart + group.length}/${videos.length} · ${group[0].title}`;
          await Promise.all(group.map(async (item, offset) => {
          const videoIndex = batchStart + offset;
          try {
            // Check access through the same subscribed-lecture endpoint used by the player.
            const lecture = await json(`/api-2.0/users/me/subscribed-courses/${courseId}/lectures/${item.id}/?fields[lecture]=asset&fields[asset]=captions`);
            const english = SubtitleCore.select(lecture.asset?.captions || []).english;
            if (!english?.url) throw new Error('沒有英文字幕');
            const cues = SubtitleCore.parse(await caption(english.url));
            if (!cues.length) throw new Error('英文字幕無法解析');
            result.lectures.push({ id: String(item.id), title: item.title,
              lectureOrder: curriculum.find(entry => entry.type === 'lecture' && entry.id === item.id)?.lectureOrder,
              videoOrder: videoIndex + 1, sourceHash: await hash(cues),
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
        record.filename = `Udemy-English-course-${courseId}.json`;
        download(result, record.filename, row);
        state.textContent = `英文匯出：${record.downloadedLectures}/${record.videoCount} 堂影片、${record.cueCount} 段；${result.errors.length} 堂待補`;
      } catch (error) { record.status = 'failed'; record.error = error.message; state.textContent = error.message; }
    }
    report.finishedAt = new Date().toISOString();
    download(report, 'Udemy-English-export-report.json', status);
    status.prepend(document.createTextNode(`匯出結束：${report.courses.filter(x => x.status === 'downloaded').length}/${targets.length} 門成功；請檢查各課程結果。 `));
    start.disabled = false; skipReact.disabled = false;
  });
})();
