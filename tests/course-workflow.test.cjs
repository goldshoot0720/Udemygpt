const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');
const { courses } = require('../udemy-bilingual/courses.js');
const SubtitleCore = require('../udemy-bilingual/subtitle-core.js');

class Element {
  constructor() {
    this.children = new Map(); this.events = {}; this.isConnected = true;
    this.style = { setProperty() {} }; this.dataset = {}; this.clientWidth = 800; this.clientHeight = 450;
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  querySelector(selector) {
    if (!this.children.has(selector)) this.children.set(selector, new Element());
    return this.children.get(selector);
  }
  querySelectorAll() { return []; }
  attachShadow() { return this.shadow = new Element(); }
  addEventListener(name, handler) { this.events[name] = handler; }
  removeEventListener() {}
  append() {}
  remove() { this.isConnected = false; }
  replaceChildren() {}
  setAttribute() {}
  contains() { return true; }
  closest() { return this.player; }
  getBoundingClientRect() { return { width: 800 }; }
  getContext() { return { measureText: () => ({ width: 100 }) }; }
  click() { this.events.click?.(); }
}
const settle = async () => { for (let i = 0; i < 25; i++) await new Promise(setImmediate); };

async function workflow(course, index, withoutEnglish = false, chromium = false) {
  let captionAvailable = !withoutEnglish, playbackText = 'Hello world', denied = false;
  const courseId = course.id || 8000000 + index, lectureId = '123';
  const video = new Element(); video.player = new Element(); video.currentTime = 1.5;
  const nodes = [], downloads = [], storage = {}, requests = [];
  const document = {
    head: new Element(), body: new Element(), title: 'Fixture lecture', fullscreenElement: null,
    getElementById: () => null,
    querySelectorAll: () => [video], querySelector: () => null,
    createTextNode: text => text,
    createElement: () => { const element = new Element(); nodes.push(element); return element; }
  };
  class TestURL extends URL {}
  TestURL.createObjectURL = blob => { downloads.push(blob); return 'blob:test'; };
  TestURL.revokeObjectURL = () => {};
  const context = {
    URL: TestURL, TextEncoder, Blob, crypto: webcrypto, document, SubtitleCore,
    OpenCC: { Converter: () => text => text },
    location: { href: `https://www.udemy.com/course/${course.slug}/learn/lecture/${lectureId}`, pathname: `/course/${course.slug}/learn/lecture/${lectureId}`, origin: 'https://www.udemy.com' },
    getComputedStyle: () => ({ position: 'relative', fontFamily: 'sans-serif' }),
    ResizeObserver: class { disconnect() {} observe() {} },
    AbortController, setInterval() {}, setTimeout(fn) { fn(); }, clearTimeout() {},
    browser: {
      storage: { local: {
        async get(keys) { return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, storage[key]])); },
        async set(updates) { Object.assign(storage, updates); }
      } },
      runtime: { async sendMessage(message) { return message.type === 'page-zoom' ? 1 : `WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n${playbackText}\n`; } }
    },
    async fetch(address) {
      address = String(address); requests.push(address);
      if (address.includes(`courses/${course.slug}/?fields[course]=id`)) return { ok: true, json: async () => ({ id: courseId }) };
      if (address.includes(`/courses/${courseId}/subscriber-curriculum-items/`)) return { ok: true, json: async () => ({ results: [{ _class: 'lecture', id: 123, title: 'Fixture lecture', asset: { asset_type: 'Video', length: 120, captions: [{ locale_id: 'en_US', url: 'https://vtt-a.udemycdn.com/test.vtt' }] } }], next: null }) };
      assert.ok(address.includes(`/subscribed-courses/${courseId}/lectures/123/`), address);
      if (denied) return {ok:false,status:403};
      return { ok: true, json: async () => ({ asset: { captions: captionAvailable ? [{ locale_id: 'en_US', url: 'https://vtt-a.udemycdn.com/test.vtt' }] : [] } }) };
    }
  };
  if (chromium) {
    const fixtureBrowser = context.browser;
    delete context.browser;
    context.chrome = {
      storage: { local: {
        get: (keys, callback) => fixtureBrowser.storage.local.get(keys).then(callback),
        set: (updates, callback) => fixtureBrowser.storage.local.set(updates).then(callback)
      } },
      runtime: { sendMessage: (message, callback) => fixtureBrowser.runtime.sendMessage(message).then(
        value => callback({udemyBilingualResponse:1,value}),
        error => callback({udemyBilingualResponse:1,error:error.message})
      ) }
    };
  }
  vm.createContext(context);
  if (chromium) vm.runInContext(fs.readFileSync(require.resolve('../udemy-bilingual/chrome-compat.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../udemy-bilingual/courses.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../udemy-bilingual/course-time.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../udemy-bilingual/content.js'), 'utf8'), context);
  await settle();
  const root = nodes.find(node => node.id === 'udemy-bilingual-root'), shadow = root.shadow;
  const upload = value => ({ target: { files: [{ text: async () => JSON.stringify(value) }], value: 'fixture' } });
  if (withoutEnglish) {
    // Courses without an official English track report the gap and expose no supplement import.
    assert.equal(root.dataset.status, 'error');
    // The DOM stub answers every selector, so assert against the shipped source instead.
    assert.ok(!fs.readFileSync(require.resolve('../udemy-bilingual/content.js'), 'utf8').includes('import-english'));
    assert.match(shadow.querySelector('.status').textContent,/沒有可用的原始字幕/);
    assert.equal(Object.keys(storage).length, 0);
    // Without a supplemental import the lecture can only recover from the official caption track.
    denied = true;
    shadow.querySelector('.retry').events.click(); await settle();
    assert.equal(root.dataset.status,'error');
    assert.match(shadow.querySelector('.status').textContent,/403/);
    denied = false; captionAvailable = true; playbackText = 'Official English';
    shadow.querySelector('.retry').events.click(); await settle();
    assert.equal(root.dataset.source,'udemy-caption');
    assert.equal(root.dataset.status,'english-only');
    await shadow.querySelector('.export-current').events.click();
    const official = JSON.parse(await downloads.pop().text());
    assert.equal(official.lectures[0].cues[0].en,'Official English');
    return;
  }
  assert.equal(root.dataset.status, 'english-only');
  // 匯出按鈕跟著課程主要語言走：英文課講英文，日文課不能出現「匯出英文」。
  assert.equal(shadow.querySelector('.export-current').textContent, '匯出本堂英文');
  assert.equal(shadow.querySelector('.export-course').textContent, '匯出全課英文');
  assert.equal(shadow.querySelector('.import').textContent, '匯入中英雙語字幕');
  assert.equal(shadow.querySelector('.time-current').textContent, '目前：1. Fixture lecture');
  assert.equal(shadow.querySelector('.course-id').textContent, `課程 ID：${courseId} · 資料夾 data/courses/${courseId}`);
  assert.equal(shadow.querySelector('.time-total').textContent, '總影片 2.0 分鐘');
  assert.equal(shadow.querySelector('.time-watched').textContent, '已觀看 0.0 分鐘');
  video.currentTime = 60; video.events.timeupdate();
  assert.equal(shadow.querySelector('.time-watched').textContent, '已觀看 1.0 分鐘');
  assert.equal(shadow.querySelector('.time-remaining').textContent, '未觀看 1.0 分鐘');
  video.currentTime = 1.5;
  await shadow.querySelector('.export-current').events.click();
  const exported = JSON.parse(await downloads.pop().text());
  assert.equal(exported.courseId, courseId);
  assert.equal(exported.lectures[0].id, lectureId);
  assert.equal(exported.lectures[0].cues[0].en, 'Hello world');
  await shadow.querySelector('.export-course').events.click();
  const whole = JSON.parse(await downloads.pop().text());
  assert.equal(whole.courseId, courseId);
  assert.equal(whole.errors.length, 0);
  assert.equal(whole.lectures.length, 1);
  const translated = structuredClone(exported); translated.lectures[0].cues[0].zh = '哈囉，世界';
  const storedBeforeWrongImport = Object.keys(storage).length;
  const wrong = structuredClone(translated); wrong.courseId++;
  await shadow.querySelector('.import-file').events.change(upload(wrong));
  assert.match(shadow.querySelector('.status').textContent, /匯入失敗/);
  assert.equal(Object.keys(storage).length, storedBeforeWrongImport);
  await shadow.querySelector('.import-file').events.change(upload(translated));
  await settle();
  assert.ok(storage[`translation:${courseId}:${lectureId}`]);
  assert.equal(root.dataset.status, 'bilingual-ready');
  assert.equal(shadow.querySelector('.toggle').textContent, '中英 CC ✓');
  if (course.id === 1362070) {
    storage[`translation:${lectureId}`] = storage[`translation:${courseId}:${lectureId}`];
    delete storage[`translation:${courseId}:${lectureId}`];
    shadow.querySelector('.retry').events.click(); await settle();
    assert.equal(root.dataset.status, 'bilingual-ready');
  }
}
(async () => {
  for (const [index, course] of courses.entries()) await workflow(course, index);
  await workflow(courses.find(course=>course.slug==='sveltejs-the-complete-guide'), 100, true);
  for (const [index, course] of courses.entries()) await workflow(course, index, false, true);
  await workflow(courses.find(course=>course.slug==='sveltejs-the-complete-guide'), 100, true, true);
  console.log(`PASS: All ${courses.length} courses load, export and import subtitles with native and Chromium APIs; source fallback, authorization and legacy React storage remain verified.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
