const assert = require('node:assert/strict');
const time = require('../udemy-bilingual/course-time.js');

async function main() {
  const curriculum = [
    { _class: 'chapter', id: 1, title: 'Introduction' },
    { _class: 'lecture', id: 10, title: 'First', asset: { asset_type: 'Video', length: 600 } },
    { _class: 'lecture', id: 11, title: 'Article', asset: { asset_type: 'Article', length: 60 } },
    { _class: 'quiz', id: 12 },
    { _class: 'lecture', id: 13, title: 'Destructuring', asset: { asset_type: 'Video', time_estimation: 315 } },
    { _class: 'lecture', id: 14, title: 'Next', asset: { asset_type: 'Video' }, content_summary: '01:05:00' }
  ];
  const items = time.lectures(curriculum);
  const result = time.calculate(items, '13', 120);
  assert.deepEqual(result, { total: 4815, watched: 720, remaining: 4095, current: items[2], missing: 0 });
  assert.equal(result.current.order, 3); // Articles count in Udemy's lecture numbering, quizzes do not.
  assert.equal(time.calculate(items, 13, 999).watched, 915);
  assert.equal(time.calculate(items, 13, -5).watched, 600);
  assert.equal(time.calculate(items, 11, 60).watched, 600);
  assert.equal(time.calculate(items, 999, 60).watched, null);
  assert.equal(time.calculate(items, 10, NaN).watched, 0);
  assert.equal(time.calculate(items, 14, 3900).remaining, 0);
  assert.equal(time.minutes(4260 * 60), '4,260.0');
  assert.equal(time.minutes(null), '—');
  assert.equal(time.duration({ asset: { length: '120', time_estimation: 180 } }), 120);
  assert.equal(time.duration({ asset: { length: -1 }, content_summary: '05:15' }), 315);
  for (const value of [null, '', 0, -1, Infinity, true, 'invalid']) {
    assert.equal(time.duration({ asset: { length: value } }), null);
  }
  assert.equal(time.duration({ content_summary: '5:99' }), null);
  assert.equal(time.duration({ content_summary: '5 min' }), null);
  const missingLater = items.map(item => item.id === '14' ? { ...item, seconds: null } : item);
  assert.equal(time.calculate(missingLater, 13, 120).watched, 720);
  assert.equal(time.calculate(missingLater, 13, 120).total, null);
  assert.equal(time.calculate(missingLater, 13, 120).remaining, null);
  const missingBefore = items.map(item => item.id === '10' ? { ...item, seconds: null } : item);
  assert.equal(time.calculate(missingBefore, 13, 120).watched, null);

  const requests = [];
  const loaded = await time.read(1362070, async (url, options) => {
    requests.push(url);
    assert.equal(options.credentials, 'include');
    return { ok: true, json: async () => requests.length === 1 ?
      { results: curriculum.slice(0, 3), next: '/api-2.0/courses/1362070/subscriber-curriculum-items/?page=2' } :
      { results: curriculum.slice(3), next: null } };
  });
  assert.deepEqual(loaded, items);
  assert.equal(requests.length, 2);
  assert.ok(requests[0].includes('length,time_estimation'));
  await assert.rejects(time.read(1362070, async () => ({ ok: false, status: 403 })), /403/);
  await assert.rejects(time.read(1362070, async () => ({ ok: true, json: async () => ({ results: [], next: null }) })), /未取得影片/);
  await assert.rejects(time.read(1362070, async () => ({ ok: true, json: async () => ({ results: curriculum, next: 'https://evil.test/page' }) })), /來源不符/);
  await assert.rejects(time.read(1362070, async url => ({ ok: true, json: async () => ({ results: curriculum, next: url }) })), /分頁重複/);
  console.log('PASS: Video durations, sequential elapsed minutes, articles/quizzes, seeking, missing lengths, pagination and authenticated source validation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
