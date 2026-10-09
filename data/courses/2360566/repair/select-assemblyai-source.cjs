'use strict';
// Promote the better AssemblyAI candidates while preserving existing cue IDs
// and Chinese translations. MLX Whisper transcripts remain as the comparison
// baseline under transcripts/.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const dir = __dirname;
const root = path.resolve(dir, '../../../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const hashCues = cues => sha256(JSON.stringify(cues.map(c => ({start:c.start,end:c.end,text:c.en}))));
const ids = ['14689636', '14689664', '14689718'];

const supplementalFile = path.join(dir, 'English-supplement-2360566.json');
const originalFile = path.join(dir, 'English-course-2360566-original-168.json');
const repairedFile = path.join(dir, 'English-course-2360566-repaired.json');
const canonicalFile = path.join(root, 'data/courses/2360566/English-course-2360566.json');
const translationFile = path.join(root, 'data/courses/2360566/translations/ChatGPT-Svelte-supplement-2360566.zh-TW.json');
const progressFile = path.join(dir, 'progress.json');
const missingFile = path.join(root, 'data/missing-english-sources.json');
const verificationFile = path.join(dir, 'translation-verification.json');
const priorSelectionFile = path.join(dir, 'assemblyai-selection.json');

const supplemental = read(supplementalFile);
const translation = read(translationFile);
const canonical = read(canonicalFile);
const repaired = read(repairedFile);
const progress = read(progressFile);
const missing = read(missingFile);
const verification = read(verificationFile);
const original = read(originalFile);
const priorSelection = fs.existsSync(priorSelectionFile) ? read(priorSelectionFile) : null;

const oldSourceHashes = {};
const decisions = [];
const chineseDigest = lectures => sha256(JSON.stringify(lectures.map(lecture => ({
  id: lecture.id,
  cues: lecture.cues.map(cue => ({id:cue.id,zh:cue.zh}))
}))));
const oldChineseHash = chineseDigest(translation.lectures);

// Map each AssemblyAI word to the existing validated cue timeline. The cue
// boundaries preserve the established translation segmentation; using the
// word timestamps for each cue gives the selected source tighter timing.
function selectedCues(lecture, candidate) {
  assert(candidate.candidateOnly, `Expected a candidate-only transcript for ${lecture.id}`);
  assert.equal(candidate.lectureId, lecture.id);
  assert.equal(candidate.audioSHA256, lecture.sourceInfo.audioSHA256,
    `Audio hash changed for lecture ${lecture.id}`);
  assert(candidate.words?.length, `No word timestamps in candidate ${lecture.id}`);

  const grouped = lecture.cues.map(() => []);
  for (const word of candidate.words) {
    const midpoint = (word.start + word.end) / 2000;
    let cueIndex = lecture.cues.findIndex((cue, index) =>
      midpoint >= cue.start && (midpoint < cue.end || (index === lecture.cues.length - 1 && midpoint <= cue.end)));
    if (cueIndex < 0) {
      let distance = Infinity;
      lecture.cues.forEach((cue, index) => {
        const gap = midpoint < cue.start ? cue.start - midpoint : midpoint > cue.end ? midpoint - cue.end : 0;
        if (gap < distance) { distance = gap; cueIndex = index; }
      });
    }
    assert(cueIndex >= 0, `Could not place word ${word.text} in ${lecture.id}`);
    grouped[cueIndex].push(word);
  }

  assert(grouped.every(words => words.length > 0), `Candidate left an empty cue for ${lecture.id}`);
  const replacements = {
    '14689636': [
      [/\bbatch\b/gi, 'badge'],
      [/\binline block\b/gi, 'inline-block'],
      [/\bLato\b/gi, 'Lato'],
    ],
    '14689664': [
      [/\bonClick\b/g, 'on:click'],
      [/\bbind value\b/gi, 'bind:value'],
      [/\bsumDiv\b/g, 'someDiv'],
      [/\bSvelte-ish\b/gi, 'Svelte-ish'],
      [/\b2-way\b/g, 'two-way'],
    ],
    '14689718': [
      [/\bremove item\b/gi, 'removeItem'],
    ],
  }[lecture.id] || [];

  return lecture.cues.map((cue, index) => {
    const words = grouped[index];
    let en = words.map(word => word.text).join(' ')
      .replace(/\s+([,;:!?%])/g, '$1')
      .replace(/\s+(\.)(?=\s|$)/g, '$1')
      .replace(/([(\[{])\s+/g, '$1')
      .replace(/\s+([)\]}])/g, '$1')
      .replace(/\btop and bottom but(?=\s+\.\d)/gi, 'top and bottom, but');
    for (const [pattern, replacement] of replacements) en = en.replace(pattern, replacement);
    const start = Math.round(words[0].start) / 1000;
    const end = Math.round(words.at(-1).end) / 1000;
    assert(end > start, `Invalid selected timing in lecture ${lecture.id}, cue ${cue.id}`);
    return {...cue, start, end, en};
  });
}

for (const id of ids) {
  const source = supplemental.lectures.find(x => x.id === id);
  const translated = translation.lectures.find(x => x.id === id);
  assert(source && translated, `Missing source or translation for ${id}`);
  oldSourceHashes[id] = priorSelection?.lectures?.find(x => x.lectureId === id)?.previousSourceHash || source.sourceHash;
  const candidate = read(path.join(dir, 'transcripts/assemblyai', `${id}.json`));
  const cues = selectedCues(source, candidate);
  const sourceHash = hashCues(cues);
  const sourceInfo = {
    engine: 'assemblyai',
    model: candidate.modelUsed || candidate.modelRequested,
    language: candidate.language || 'en',
    task: 'transcribe',
    transcriptId: candidate.transcriptId,
    confidence: candidate.confidence,
    audioSHA256: candidate.audioSHA256,
    duration: source.sourceInfo.duration,
    comparedAgainst: 'mlx-community/whisper-large-v3-turbo',
    review: 'Selected after comparing transcript text and technical vocabulary; automatic recognition, not a full human listening audit.'
  };

  source.cues = cues;
  source.sourceHash = sourceHash;
  source.sourceInfo = sourceInfo;
  translated.cues = translated.cues.map((cue, index) => ({...cue, start:cues[index].start, end:cues[index].end, en:cues[index].en}));
  translated.sourceHash = sourceHash;
  translated.sourceInfo = sourceInfo;

  for (const file of [canonicalFile, repairedFile]) {
    const course = file === canonicalFile ? canonical : repaired;
    const lecture = course.lectures.find(x => x.id === id);
    assert(lecture, `Missing course source lecture ${id} in ${file}`);
    lecture.cues = cues.map(cue => ({...cue, zh:''}));
    lecture.sourceHash = sourceHash;
    lecture.sourceInfo = sourceInfo;
  }

  const progressLecture = progress.lectures.find(x => String(x.lectureId) === id);
  const missingLecture = missing.lectures.find(x => String(x.lectureId) === id);
  assert(progressLecture && missingLecture, `Missing progress entry for ${id}`);
  for (const entry of [progressLecture, missingLecture]) {
    entry.sourceHash = sourceHash;
    entry.cueCount = cues.length;
    entry.transcriptionEngine = 'assemblyai';
    entry.transcriptionModel = sourceInfo.model;
    entry.transcriptionConfidence = candidate.confidence;
    entry.transcriptFile = `data/courses/2360566/repair/transcripts/assemblyai/${id}.json`;
  }

  decisions.push({
    lectureId: id,
    lectureOrder: source.lectureOrder,
    title: source.title,
    selectedEngine: 'assemblyai',
    selectedModel: sourceInfo.model,
    confidence: candidate.confidence,
    transcriptId: candidate.transcriptId,
    wordCount: candidate.words.length,
    cueCount: cues.length,
    previousSourceHash: oldSourceHashes[id],
    selectedSourceHash: sourceHash,
    candidateTextSHA256: sha256(candidate.text || ''),
    reason: id === '14689636'
      ? 'More accurate Svelte/UI terminology and formatting terms than the Whisper candidate.'
      : id === '14689664'
        ? 'More accurate form, DOM, and Svelte terminology than the Whisper candidate.'
        : 'Comparable coverage with clearer punctuation and confirmation of cart component terminology.'
  });
}

for (const lecture of original.lectures) {
  assert.deepEqual(canonical.lectures.find(x => x.id === lecture.id), lecture,
    `Official Udemy source changed for lecture ${lecture.id}`);
}

const now = new Date().toISOString();
progress.updatedAt = now;
progress.selectedTranscriptionEngine = 'assemblyai';
progress.selectedTranscriptionModel = 'universal-3-5-pro';
progress.transcriptionComparedAt = now;
missing.updatedAt = now;
verification.checkedAt = now;
verification.sha256 = sha256(Buffer.from(JSON.stringify(translation, null, 2) + '\n'));
verification.lectures = translation.lectures.map(lecture => ({
  id: lecture.id,
  title: lecture.title,
  cueCount: lecture.cues.length,
  sourceHash: lecture.sourceHash
}));
verification.cueCount = translation.lectures.reduce((sum, lecture) => sum + lecture.cues.length, 0);
verification.allChineseNonempty = translation.lectures.every(lecture => lecture.cues.every(cue => cue.zh.trim()));
verification.chineseTextSHA256 = chineseDigest(translation.lectures);
verification.chineseTextPreservedFromPrevious = verification.chineseTextSHA256 === oldChineseHash;
verification.sourceTextUpdatedFromAssemblyAI = true;
delete verification.allOtherFieldsUnchanged;

write(supplementalFile, supplemental);
write(translationFile, translation);
write(canonicalFile, canonical);
write(repairedFile, repaired);
write(progressFile, progress);
write(missingFile, missing);
write(verificationFile, verification);
write(priorSelectionFile, {
  version: 1,
  comparedAt: now,
  selectedEngine: 'assemblyai',
  selectedModel: 'universal-3-5-pro',
  cueMapping: 'AssemblyAI word timestamps mapped to the established Whisper cue segmentation; cue IDs and existing Chinese translations were preserved.',
  humanReview: 'Compared transcript text and technical vocabulary only; the audio has not received a full human listening audit.',
  previousChineseTextSHA256: oldChineseHash,
  chineseTextSHA256: verification.chineseTextSHA256,
  chineseTextPreserved: verification.chineseTextPreservedFromPrevious,
  lectures: decisions
});

console.log(JSON.stringify(decisions.map(({lectureId,wordCount,cueCount,confidence,selectedSourceHash}) =>
  ({lectureId,wordCount,cueCount,confidence,selectedSourceHash})), null, 2));
