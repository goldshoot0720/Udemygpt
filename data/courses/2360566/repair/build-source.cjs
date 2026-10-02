'use strict';
// Rebuild the three supplemental lectures from retained MLX Whisper VTT output.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const core = require(path.join(root, 'udemy-bilingual/subtitle-core.js'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const write = (file, value) => fs.writeFileSync(path.join(__dirname, file), JSON.stringify(value, null, 2) + '\n');
const canonical = path.resolve(__dirname, '../English-course-2360566.json');
const backup = path.join(__dirname, 'English-course-2360566-original-168.json');
if (!fs.existsSync(backup)) fs.copyFileSync(canonical, backup);
const original = JSON.parse(fs.readFileSync(backup, 'utf8'));
const progress = JSON.parse(fs.readFileSync(path.join(__dirname, 'progress.json'), 'utf8'));
assert.equal(hash(fs.readFileSync(backup)), progress.originalSourceSHA256);
assert.equal(original.lectures.length, 168);
const videos = original.curriculum.filter(x => x.type === 'lecture' && /^video$/i.test(x.assetType));
// Technical spellings checked against the lesson context. Raw ASR output is retained.
const replacements = {
  '14689636': [
    ['batch svelte', 'Badge.svelte'], ['batch', 'badge'], ['is fav', 'isFav'],
    ['inline block', 'inline-block'], ['lotto', 'Lato'], ['which are latos', 'where Lato is'], ['sent serif', 'sans-serif']
  ],
  '14689664': [
    ['foreign values', 'form values'], ['need to value', 'need the value'], ['on click', 'on:click'],
    ['save data', 'saveData'], ['bind value', 'bind:value'], ['document, query, selector', 'document.querySelector'],
    ['query selector', 'querySelector'], ['username input', 'usernameInput'], ['console dir', 'console.dir'],
    ['console there there', 'console.dir'], ['sum div', 'someDiv'], ['some div', 'someDiv'], ['swells', "Svelte's"]
  ],
  '14689718': [['card component', 'cart component']]
};
const audit = [];
const lectures = progress.lectures.map(item => {
  const id = String(item.lectureId);
  const stem = `Svelte-${String(item.lectureOrder).padStart(3, '0')}-${id}`;
  const rawFile = path.join(__dirname, 'transcripts', `${stem}.vtt`);
  const parsed = core.parse(fs.readFileSync(rawFile, 'utf8'));
  const grouped = [];
  // Attach very short fragments to an adjacent cue; keep every word and the outer timestamps.
  for (const cue of parsed) {
    const previous = grouped.at(-1);
    const short = x => x.text.split(/\s+/).length <= 3 || x.end - x.start < 0.8;
    if (previous && (short(previous) || short(cue)) && cue.start - previous.end <= 1 && cue.end - previous.start <= 10) {
      previous.text += ` ${cue.text}`; previous.end = cue.end;
    } else grouped.push({start:cue.start,end:cue.end,text:cue.text});
  }
  const changes = [];
  const cues = grouped.map((cue, i) => {
    let en = cue.text;
    for (const [from, to] of replacements[id]) {
      const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      en = en.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), to);
    }
    en = en.replace(/\bi\b/g, 'I').replace(/\bi'll\b/gi, "I'll");
    if (en !== cue.text) changes.push({cueId:i+1,raw:cue.text,corrected:en});
    assert(cue.start >= 0 && cue.end > cue.start && cue.end <= item.audioSource.duration);
    return {id:i+1,start:cue.start,end:cue.end,en,zh:''};
  });
  const curriculum = videos.find(x => String(x.id) === id);
  const sourceHash = hash(JSON.stringify(cues.map(c => ({start:c.start,end:c.end,text:c.en}))));
  audit.push({lectureId:id,rawVttSHA256:hash(fs.readFileSync(rawFile)),rawCueCount:parsed.length,cueCount:cues.length,changes});
  return {id,title:item.title,lectureOrder:curriculum.lectureOrder,videoOrder:videos.indexOf(curriculum)+1,
    sourceOrigin:'audio-transcription',sourceHash,
    sourceInfo:{engine:'mlx-whisper',engineVersion:'0.4.3',model:'mlx-community/whisper-large-v3-turbo',language:'en',task:'transcribe',audioSHA256:item.audioSource.sha256,duration:item.audioSource.duration,review:'Technical spelling and timing checked; automatic transcription, not a fully human-audited transcript.'},cues};
});
const supplemental = {...original,lectures,errors:[]};
delete supplemental.curriculum;
write('English-supplement-2360566.json', supplemental);
write('corrections.json', audit);
const repaired = {...original,lectures:[...original.lectures,...lectures].sort((a,b)=>a.videoOrder-b.videoOrder),errors:[],
  sourceProvenance:{udemyCaptionLectures:168,audioTranscriptionLectures:3,originalSHA256:progress.originalSourceSHA256}};
for (const lecture of original.lectures) assert.deepEqual(repaired.lectures.find(x=>x.id===lecture.id), lecture);
require(path.join(root, 'prepare_course_sources.cjs')).validate(repaired);
write('English-course-2360566-repaired.json', repaired);
console.log(lectures.map(x=>({id:x.id,title:x.title,cues:x.cues.length,sourceHash:x.sourceHash})));
