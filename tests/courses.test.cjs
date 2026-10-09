const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const courses = require('../udemy-bilingual/courses.js');
const manifest = require('../udemy-bilingual/manifest.json');

async function main() {
  assert.equal(courses.courses.length, 14);
  // Any Udemy course player loads; courses outside the list are flagged, not rejected.
  const unlistedUrl = 'https://www.udemy.com/course/claude-code-the-practical-guide/learn/lecture/123';
  const unlisted = courses.forUrl(unlistedUrl);
  assert.equal(unlisted.slug, 'claude-code-the-practical-guide');
  assert.equal(unlisted.known, false);
  assert.equal(unlisted.title, '');
  assert.equal(courses.forUrl(unlistedUrl), unlisted, 'unlisted course objects must keep their identity');
  assert.equal(courses.forUrl('https://www.udemy.com/course/codex-the-practical-guide/learn/lecture/123').known, false);
  assert.notEqual(courses.forUrl('https://www.udemy.com/course/codex-the-practical-guide/learn/lecture/123'), unlisted);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://www.udemy.com/course/*/learn/*']);
  // The single wildcard pattern must really cover every course URL it is supposed to.
  const matchPattern = (pattern, url) => {
    const target = new URL(url);
    const parsed = pattern.match(/^https?:\/\/([^/]+)(\/.*)$/);
    if (!parsed || parsed[1] !== target.host) return false;
    const escaped = parsed[2].split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    return new RegExp(`^${escaped}$`).test(target.pathname);
  };
  for (const course of courses.courses) {
    assert.equal(course.known, true);
    assert.ok(matchPattern(manifest.content_scripts[0].matches[0], `https://www.udemy.com/course/${course.slug}/learn/lecture/1`));
  }
  assert.ok(matchPattern(manifest.content_scripts[0].matches[0], unlistedUrl));
  assert.equal(matchPattern(manifest.content_scripts[0].matches[0], 'https://www.udemy.com/course/unknown/'), false);
  assert.equal(matchPattern(manifest.content_scripts[0].matches[0], 'https://www.udemy.com/course/unknown/learn-other/lecture/1'), false);
  assert.ok(manifest.background.scripts.indexOf('courses.js') < manifest.background.scripts.indexOf('background.js'));
  assert.ok(manifest.content_scripts[0].js.indexOf('courses.js') < manifest.content_scripts[0].js.indexOf('content.js'));
  for (const [index, course] of courses.courses.entries()) {
    const url = `https://www.udemy.com/course/${course.slug}/learn/lecture/123?start=0#overview`;
    assert.equal(courses.forUrl(url), course);
    assert.equal(courses.forUrl(url.replace('www.udemy.com', 'www.udemy.com.evil.test')), null);
    assert.equal(courses.forUrl(url.replace('https:', 'http:')), null);
    assert.equal(courses.forUrl(url.replace('/learn/', '/learn-other/')), null);
    assert.equal(courses.forUrl(`https://www.udemy.com/course/${course.slug}/`), null);
    let requests = 0;
    const fetcher = async (address, options) => {
      requests++;
      assert.equal(address, `https://www.udemy.com/api-2.0/courses/${course.slug}/?fields[course]=id,locale`);
      assert.equal(options.credentials, 'include');
      return { ok: true, json: async () => ({ id: 9000000 + index, locale: { locale: 'en_US' } }) };
    };
    const [first, second] = await Promise.all([courses.idFor(course, fetcher), courses.idFor(course, fetcher)]);
    assert.equal(first, course.id || 9000000 + index);
    assert.equal(second, first);
    assert.equal(requests, 1);
    // 課程 ID 與課程語言（course.locale）一起快取；課程語言用來挑出正確的原始字幕軌。
    const meta = await courses.metaFor(course, fetcher);
    assert.equal(meta.id, first);
    assert.equal(meta.locale, 'en_US');
    assert.equal(requests, 1);
    assert.notEqual(courses.translationKey(first, 123), courses.translationKey(first + 1, 123));
  }
  assert.equal(courses.forUrl('invalid'), null);
  assert.equal(courses.forUrl('https://www.udemy.com/course/unknown/learn/lecture/123').known, false);
  assert.equal(courses.forUrl('https://www.udemy.com/course/unknown/'), null);
  // An unlisted course still resolves its ID and course language through the signed-in Udemy session.
  assert.deepEqual(await courses.metaFor(unlisted, async address => {
    assert.equal(address, 'https://www.udemy.com/api-2.0/courses/claude-code-the-practical-guide/?fields[course]=id,locale');
    return { ok: true, json: async () => ({ id: 5291333, locale: { locale: 'en_US' } }) };
  }), { id: 5291333, locale: 'en_US' });
  // A course that exposes no locale still resolves its ID; language detection falls back to the caption tracks.
  assert.deepEqual(await courses.metaFor(courses.forUrl('https://www.udemy.com/course/codex-the-practical-guide/learn/lecture/1'), async address => {
    assert.equal(address, 'https://www.udemy.com/api-2.0/courses/codex-the-practical-guide/?fields[course]=id,locale');
    return { ok: true, json: async () => ({ id: 5291334 }) };
  }), { id: 5291334, locale: '' });
  await assert.rejects(courses.idFor(null, async () => ({ ok: true, json: async () => ({ id: 1 }) })), /不是課程頁面/);
  await assert.rejects(courses.idFor({}), /不是課程頁面/);

  // A failed ID lookup must be retryable after signing back in.
  const context = { URL, Map, fetch: () => {}, module: { exports: {} } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../udemy-bilingual/courses.js'), 'utf8'), context);
  const fresh = context.module.exports, course = fresh.courses.find(item => item.slug === 'learn-flutter-dart-to-build-ios-android-apps');
  await assert.rejects(fresh.idFor(course, async () => ({ ok: false, status: 403 })), /403/);
  await assert.rejects(fresh.idFor(course, async () => ({ ok: true, json: async () => ({ id: 'invalid' }) })), /ID/);
  assert.equal(await fresh.idFor(course, async () => ({ ok: true, json: async () => ({ id: 1708340 }) })), 1708340);

  let listener;
  const background = {
    UdemyCourses: courses, URL,
    browser: { runtime: { onMessage: { addListener(fn) { listener = fn; } } }, tabs: { getZoom: async () => 1.5 } },
    fetch: async () => ({ ok: true, text: async () => 'WEBVTT' })
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../udemy-bilingual/background.js'), 'utf8'), background);
  for (const course of courses.courses) {
    const sender = { url: `https://www.udemy.com/course/${course.slug}/learn/lecture/123`, tab: { id: 1 } };
    assert.equal(await listener({ type: 'page-zoom' }, sender), 1.5);
    assert.equal(await listener({ type: 'caption-file', url: 'https://vtt-a.udemycdn.com/test.vtt' }, sender), 'WEBVTT');
    await assert.rejects(listener({ type: 'caption-file', url: 'https://evil.test/test.vtt' }, sender), /字幕來源/);
  }
  // Unlisted courses are served like listed ones; only non-player pages are refused.
  for (const url of ['https://www.udemy.com/course/unknown/learn/', 'https://www.udemy.com/course/claude-code-the-practical-guide/learn/lecture/123']) {
    const sender = { url, tab: { id: 1 } };
    assert.equal(await listener({ type: 'page-zoom' }, sender), 1.5);
    assert.equal(await listener({ type: 'caption-file', url: 'https://vtt-a.udemycdn.com/test.vtt' }, sender), 'WEBVTT');
  }
  for (const url of ['https://www.udemy.com/course/unknown/', 'https://www.udemy.com/', 'https://www.udemy.com/course/unknown/learn-other/lecture/1']) {
    await assert.rejects(listener({ type: 'page-zoom' }, { url, tab: { id: 1 } }), /不是課程頁面/);
  }
  await assert.rejects(listener({ type: 'page-zoom' }, { url: 'https://www.udemy.com.evil.test/course/unknown/learn/lecture/1', tab: { id: 1 } }), /不是課程頁面/);
  console.log(`PASS: ${courses.courses.length} prepared courses plus any unlisted course player, wildcard coverage, ID resolution/cache/retry, per-course storage keys, background authorization and caption hosts.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
