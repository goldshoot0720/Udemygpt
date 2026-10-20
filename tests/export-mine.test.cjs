const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor() { this.children = []; this.events = {}; this.checked = true; this.disabled = false; this.textContent = ''; }
  append(...values) { this.children.push(...values); }
  prepend(value) { this.children.unshift(value); }
  replaceChildren() { this.children.length = 0; }
  addEventListener(name, fn) { this.events[name] = fn; }
  click() { this.events.click?.(); }
}
Element.prototype.__defineSetter__('download', function (value) { this.fileName = value; });
(async () => {
  const known = [{ slug: 'react-the-complete-guide-incl-redux', title: 'React', id: 1362070, known: true }];
  const nodes = Object.fromEntries(['#status', '#courses', '#start', '#skip-react', '#load-mine', '#register-mine', '#mine-status', '#mine'].map(key => [key, new Element()]));
  const files = [], requests = [];
  class TestURL extends URL {}
  TestURL.createObjectURL = blob => { files.push(blob); return 'blob:fixture'; };
  const page2 = { next: null, results: [
    { id: 1000, title: '日文課', url: '/course/nihongo/', locale: 'ja_JP', visible_instructors: [{ display_name: 'Yuki' }] },
    { id: 999, title: 'New English', url: '/course/new-english/', locale: 'en_US' },
    { title: 'broken' }
  ] };
  const context = {
    UdemyCourses: { courses: known },
    URL: TestURL, TextEncoder, Blob, AbortSignal, crypto: globalThis.crypto,
    setTimeout: fn => fn(),
    document: {
      querySelector: selector => nodes[selector],
      createElement: tag => { const node = new Element(); node.tag = tag; return node; },
      createTextNode: text => text
    },
    async fetch(address, options) {
      requests.push({ address, credentials: options.credentials });
      if (address.includes('page=2')) return { ok: true, json: async () => page2 };
      if (address.includes('/subscribed-courses/')) return { ok: true, json: async () => ({ count: 3, next: 'https://www.udemy.com/api-2.0/users/me/subscribed-courses/?page=2&page_size=100', results: [
        { id: 1362070, title: 'React - The Complete Guide', url: '/course/react-the-complete-guide-incl-redux/', locale: 'en_US', visible_instructors: [{ display_name: 'Maximilian Schwarzmüller' }] },
        { id: 999, title: 'New English', url: '/course/new-english/', locale: { locale: 'en_US' }, visible_instructors: [{ display_name: 'Ada Lovelace | 1M students' }] }
      ] }) };
      throw new Error(address);
    }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../udemy-bilingual/subscribed-courses.js'), 'utf8'), context);
  vm.runInNewContext(fs.readFileSync(require.resolve('../udemy-bilingual/export.js'), 'utf8'), context);
  assert.equal(nodes['#courses'].children.length, 1);
  await nodes['#load-mine'].events.click();
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.credentials === 'include' && request.address.startsWith('https://www.udemy.com/')));
  assert.equal(nodes['#mine'].children.length, 3);
  const rows = nodes['#mine'].children.map(row => ({ box: row.children[0].children[0], state: row.children[1].textContent }));
  assert.equal(rows[0].box.disabled, true);
  assert.equal(rows[0].box.checked, false);
  assert.match(rows[0].state, /1362070 · en_US · Maximilian Schwarzmüller · 已在翻譯清單，略過/);
  assert.equal(rows[1].box.checked, true);
  assert.match(rows[1].state, /999 · en_US · Ada Lovelace · 可登錄$/);
  assert.equal(rows[2].box.checked, false);
  assert.match(rows[2].state, /可登錄，原文不是英文/);
  assert.match(nodes['#mine-status'].textContent, /讀取 3 門：1 門已在翻譯清單，2 門可登錄。已勾選 1 門英文新課程。/);
  nodes['#register-mine'].events.click();
  const registered = JSON.parse(await files[0].text());
  assert.deepEqual(registered.courses.map(course => course.slug), ['new-english']);
  assert.equal(registered.courses[0].instructor, 'Ada Lovelace');
  assert.equal(nodes['#courses'].children.length, 2);
  assert.equal(nodes['#courses'].children[1].textContent, 'New English');
  assert.equal(rows[1].box.disabled, true);
  assert.equal(nodes['#register-mine'].disabled, false);
  nodes['#register-mine'].events.click();
  assert.match(nodes['#mine-status'].textContent, /請先勾選/);
  rows[2].box.checked = true;
  nodes['#register-mine'].events.click();
  const second = JSON.parse(await files[1].text());
  assert.deepEqual(second.courses.map(course => course.slug), ['nihongo']);
  assert.equal(nodes['#courses'].children.length, 3);
  console.log('PASS: Enrolled courses list skips the translation list, checks new English courses, and registers the selection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
