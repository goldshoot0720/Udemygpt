const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
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

async function workflow(course, index) {
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
      runtime: { async sendMessage(message) { return message.type === 'page-zoom' ? 1 : 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello world\n'; } }
    },
    async fetch(address) {
      address = String(address); requests.push(address);
      if (address.includes(`courses/${course.slug}/?fields[course]=id`)) return { ok: true, json: async () => ({ id: courseId }) };
      if (address.includes(`/courses/${courseId}/subscriber-curriculum-items/`)) return { ok: true, json: async () => ({ results: [{ _class: 'lecture', id: 123, title: 'Fixture lecture', asset: { asset_type: 'Video', captions: [{ locale_id: 'en_US', url: 'https://vtt-a.udemycdn.com/test.vtt' }] } }], next: null }) };
      assert.ok(address.includes(`/subscribed-courses/${courseId}/lectures/123/`), address);
      return { ok: true, json: async () => ({ asset: { captions: [{ locale_id: 'en_US', url: 'https://vtt-a.udemycdn.com/test.vtt' }] } }) };
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../udemy-bilingual/courses.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../udemy-bilingual/content.js'), 'utf8'), context);
  await settle();
  const root = nodes.find(node => node.id === 'udemy-bilingual-root'), shadow = root.shadow;
  assert.equal(root.dataset.status, 'english-only');
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
  const upload = value => ({ target: { files: [{ text: async () => JSON.stringify(value) }], value: 'fixture' } });
  const wrong = structuredClone(translated); wrong.courseId++;
  await shadow.querySelector('.import-file').events.change(upload(wrong));
  assert.match(shadow.querySelector('.status').textContent, /匯入失敗/);
  assert.equal(Object.keys(storage).length, 0);
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
  console.log(`PASS: All ${courses.length} courses load English, export current/full course, reject cross-course imports, import/render translations; legacy React storage remains readable.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
