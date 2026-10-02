'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const file = process.argv[2];
if (!file) throw Error('Usage: node verify-translation.cjs /path/to/ChatGPT-result.json');
const source = JSON.parse(fs.readFileSync(path.join(__dirname, 'English-supplement-2360566.json')));
const translated = JSON.parse(fs.readFileSync(file));
const stripped = JSON.parse(JSON.stringify(translated));
let count = 0;
for (const lecture of stripped.lectures) {
  for (const cue of lecture.cues) {
    assert(typeof cue.zh === 'string' && cue.zh.trim(), `Empty Chinese ${lecture.id}/${cue.id}`);
    cue.zh = ''; count++;
  }
}
assert.deepEqual(stripped, source, 'Fields other than zh must match the English source exactly');
assert.equal(count, 184);
const result = {courseId:2360566,checkedAt:new Date().toISOString(),file:path.resolve(file),
  sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  lectures:translated.lectures.map(x=>({id:x.id,title:x.title,cueCount:x.cues.length,sourceHash:x.sourceHash})),
  cueCount:count,allChineseNonempty:true,allOtherFieldsUnchanged:true};
console.log(JSON.stringify(result, null, 2));
