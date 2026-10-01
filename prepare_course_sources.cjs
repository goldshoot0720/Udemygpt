#!/usr/bin/env node
/* Validate browser exports and prepare isolated English translation queues. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { courses } = require('./udemy-bilingual/courses.js');
const root = __dirname;
function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(temporary, file);
}
function validate(source) {
  const course = courses.find(item => item.slug === source.courseSlug);
  if (!course || !Number.isSafeInteger(source.courseId) || source.courseId <= 0 || (course.id && source.courseId !== course.id)) throw new Error('Unknown course identity');
  if (source.version !== 1 || source.sourceLanguage !== 'en' || source.targetLanguage !== 'zh-TW') throw new Error('Unexpected source metadata');
  if (!Array.isArray(source.curriculum) || !Array.isArray(source.lectures) || !Array.isArray(source.errors)) throw new Error('Missing curriculum, lectures or errors');
  const videos = source.curriculum.filter(item => item.type === 'lecture' && /^video$/i.test(item.assetType || ''));
  if (!videos.length) throw new Error('No video curriculum');
  const expected = new Set(videos.map(item => String(item.id))), seen = new Set();
  let cueCount = 0;
  for (const lecture of source.lectures) {
    const id = String(lecture.id);
    if (!expected.has(id) || seen.has(id)) throw new Error(`Unexpected or duplicate lecture ${id}`);
    seen.add(id);
    if (!Array.isArray(lecture.cues) || !lecture.cues.length) throw new Error(`Empty lecture ${id}`);
    lecture.cues.forEach((cue, index) => {
      if (cue.id !== index + 1 || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end < cue.start || typeof cue.en !== 'string' || !cue.en.trim() || cue.zh !== '') throw new Error(`Invalid English cue ${id}/${index + 1}`);
    });
    const hash = crypto.createHash('sha256').update(JSON.stringify(lecture.cues.map(cue => ({start:cue.start,end:cue.end,text:cue.en})))).digest('hex');
    if (lecture.sourceHash !== hash) throw new Error(`Source hash mismatch ${id}`);
    cueCount += lecture.cues.length;
  }
  const failed = new Set();
  for (const error of source.errors) {
    const id = String(error.id);
    if (!expected.has(id) || seen.has(id) || failed.has(id) || typeof error.error !== 'string') throw new Error(`Invalid missing lecture ${id}`);
    failed.add(id);
  }
  if (seen.size + failed.size !== expected.size) throw new Error('Unreported missing lectures');
  return {course, videoCount:videos.length, downloadedLectures:seen.size, cueCount, status:failed.size ? 'partial' : 'verified'};
}
function prepare(file) {
  const source = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = validate(source);
  const folder = path.join(root, 'data', 'courses', String(source.courseId));
  const sourceFile = path.join(folder, `English-course-${source.courseId}.json`);
  write(sourceFile, source);
  write(path.join(folder, 'curriculum.json'), source.curriculum);
  const metadata = {version:1,courseId:source.courseId,courseSlug:source.courseSlug,courseTitle:source.courseTitle,sourceLanguage:'en',targetLanguage:'zh-TW'};
  const batches = [], entries = [];
  let chunk = [], count = 0;
  function flush() {
    if (!chunk.length) return;
    const filename = `English-batch-${String(batches.length + 1).padStart(3,'0')}.json`;
    write(path.join(folder, 'chatgpt-batches', filename), {...metadata,lectures:chunk,errors:[]});
    batches.push({file:filename,lectures:chunk.length,cues:count});
    chunk = []; count = 0;
  }
  for (const lecture of source.lectures) {
    const filename = `English-${String(lecture.videoOrder).padStart(3,'0')}-${lecture.id}.json`;
    const lectureFile = path.join(folder, 'lecture-queue', filename);
    write(lectureFile, {...metadata,lectures:[lecture],errors:[]});
    entries.push({lectureId:String(lecture.id),title:lecture.title,lectureOrder:lecture.lectureOrder,videoOrder:lecture.videoOrder,cueCount:lecture.cues.length,sourceHash:lecture.sourceHash,sourceFile:lectureFile,status:'pending',translationFile:null,verified:false,imported:false});
    if (chunk.length && count + lecture.cues.length > 800) flush();
    chunk.push(lecture); count += lecture.cues.length;
  }
  flush();
  write(path.join(folder, 'chatgpt-batches', 'index.json'), {courseId:source.courseId,batches});
  // Never reset an existing translation ledger when reprocessing a source.
  const queue = path.join(folder, 'translation-progress.json');
  if (!fs.existsSync(queue)) write(queue, {...metadata,lectures:entries});
  const progressFile = path.join(root,'data','english-download-progress.json');
  const progress = JSON.parse(fs.readFileSync(progressFile,'utf8'));
  const entry = progress.courses.find(item => item.slug === source.courseSlug);
  if (!entry) throw new Error('Course removed from progress registry');
  Object.assign(entry,{id:source.courseId,status:result.status,sourceFile,videoCount:result.videoCount,downloadedLectures:result.downloadedLectures,cueCount:result.cueCount,errors:source.errors,batchCount:batches.length,preparedAt:new Date().toISOString()});
  progress.updatedAt = new Date().toISOString(); write(progressFile,progress);
  return {...result,sourceFile,batchCount:batches.length};
}
module.exports = {validate,prepare};
if (require.main === module) {
  if (process.argv.length < 3) throw new Error('Usage: node prepare_course_sources.cjs /path/to/Udemy-English-course-ID.json [...]');
  for (const file of process.argv.slice(2)) {
    const result = prepare(file);
    console.log(`${result.course.title}: ${result.status}, ${result.downloadedLectures}/${result.videoCount} videos, ${result.cueCount} cues, ${result.batchCount} batches`);
  }
}
