const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

async function main() {
  const storage = {}, sender = { url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/learn/lecture/123', tab: { id: 1 } };
  let listener, holdOpen, fetchCalls = 0, captionStatus = 200, body = 'WEBVTT';
  const chrome = {
    runtime: {
      lastError: undefined,
      onMessage: { addListener(fn) { listener = fn; } },
      sendMessage(message, callback) {
        holdOpen = listener(message, sender, callback);
        assert.equal(holdOpen, true);
      }
    },
    storage: { local: {
      get(keys, callback) { callback(Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, storage[key]]))); },
      set(values, callback) { Object.assign(storage, values); callback(); }
    } },
    tabs: { getZoom(id, callback) { assert.equal(id, 1); callback(1.5); } }
  };
  const context = vm.createContext({ chrome, URL,
    fetch: async () => { fetchCalls++; return { ok: captionStatus === 200, status: captionStatus, text: async () => body }; }
  });
  const load = name => vm.runInContext(fs.readFileSync(path.join(__dirname, '../udemy-bilingual', name), 'utf8'), context);
  context.importScripts = (...names) => names.forEach(load);
  load('chrome-service-worker.js');
  const browser = context.browser;
  await browser.storage.local.set({ sample: 'translation' });
  assert.equal((await browser.storage.local.get('sample')).sample, 'translation');
  assert.equal(await browser.runtime.sendMessage({ type: 'page-zoom' }), 1.5);
  assert.equal(await browser.runtime.sendMessage({ type: 'caption-file', url: 'https://vtt-a.udemycdn.com/test.vtt' }), 'WEBVTT');
  assert.equal(fetchCalls, 1);
  await assert.rejects(browser.runtime.sendMessage({ type: 'caption-file', url: 'https://evil.test/caption' }), /字幕來源/);
  // Courses outside the prepared list are still served; pages that are not course players are not.
  sender.url = 'https://www.udemy.com/course/unknown/learn/lecture/123';
  assert.equal(await browser.runtime.sendMessage({ type: 'page-zoom' }), 1.5);
  sender.url = 'https://www.udemy.com/course/unknown/';
  await assert.rejects(browser.runtime.sendMessage({ type: 'page-zoom' }), /不是課程頁面/);
  sender.url = 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/learn/lecture/123';
  captionStatus = 403;
  await assert.rejects(browser.runtime.sendMessage({ type: 'caption-file', url: 'https://vtt-a.udemycdn.com/test.vtt' }), /403/);
  captionStatus = 200; body = 'a'.repeat(5000001);
  await assert.rejects(browser.runtime.sendMessage({ type: 'caption-file', url: 'https://vtt-a.udemycdn.com/test.vtt' }), /字幕檔過大/);
  assert.equal(listener({ type: 'unrelated' }, sender, () => { throw new Error('Unexpected response'); }), false);
  chrome.storage.local.get = (_keys, callback) => {
    chrome.runtime.lastError = { message: 'Storage denied' };
    callback(); chrome.runtime.lastError = undefined;
  };
  await assert.rejects(browser.storage.local.get('sample'), /Storage denied/);
  chrome.runtime.sendMessage = (_message, callback) => callback(undefined);
  await assert.rejects(browser.runtime.sendMessage({ type: 'page-zoom' }), /未回應/);
  console.log('PASS: Chromium service worker imports, async channel lifetime, storage, zoom, captions, sender/host validation and error propagation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
