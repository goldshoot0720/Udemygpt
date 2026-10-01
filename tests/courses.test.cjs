const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const courses = require('../udemy-bilingual/courses.js');
const manifest = require('../udemy-bilingual/manifest.json');

async function main() {
  assert.equal(courses.courses.length, 12);
  assert.deepEqual(manifest.content_scripts[0].matches,
    courses.courses.map(c => `https://www.udemy.com/course/${c.slug}/learn/*`));
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
      assert.equal(address, `https://www.udemy.com/api-2.0/courses/${course.slug}/?fields[course]=id`);
      assert.equal(options.credentials, 'include');
      return { ok: true, json: async () => ({ id: 9000000 + index }) };
    };
    const [first, second] = await Promise.all([courses.idFor(course, fetcher), courses.idFor(course, fetcher)]);
    assert.equal(first, course.id || 9000000 + index);
    assert.equal(second, first);
    assert.equal(requests, course.id ? 0 : 1);
    assert.notEqual(courses.translationKey(first, 123), courses.translationKey(first + 1, 123));
  }
  assert.equal(courses.forUrl('invalid'), null);
  assert.equal(courses.forUrl('https://www.udemy.com/course/unknown/learn/lecture/123'), null);
  await assert.rejects(courses.idFor({ slug: 'unknown' }), /不支援/);

  // A failed ID lookup must be retryable after signing back in.
  const context = { URL, Map, fetch: () => {}, module: { exports: {} } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../udemy-bilingual/courses.js'), 'utf8'), context);
  const fresh = context.module.exports, course = fresh.courses[1];
  await assert.rejects(fresh.idFor(course, async () => ({ ok: false, status: 403 })), /403/);
  await assert.rejects(fresh.idFor(course, async () => ({ ok: true, json: async () => ({ id: 'invalid' }) })), /ID/);
  assert.equal(await fresh.idFor(course, async () => ({ ok: true, json: async () => ({ id: 7029917 }) })), 7029917);

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
  await assert.rejects(listener({ type: 'page-zoom' }, { url: 'https://www.udemy.com/course/unknown/learn/', tab: { id: 1 } }), /不支援/);
  console.log(`PASS: ${courses.courses.length} course routes, ID resolution/cache/retry, per-course storage keys, background authorization and caption hosts.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
