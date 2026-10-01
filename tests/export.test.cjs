const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');
const SubtitleCore = require('../udemy-bilingual/subtitle-core.js');
class Element {
  constructor() { this.children = []; this.events = {}; this.checked = true; }
  append(value) { this.children.push(value); }
  prepend(value) { this.children.unshift(value); }
  addEventListener(name, fn) { this.events[name] = fn; }
  click() {}
}
(async () => {
  const courses = [{slug:'react-the-complete-guide-incl-redux',title:'React',id:1362070},
    {slug:'complete',title:'Complete'}, {slug:'partial',title:'Partial'}, {slug:'denied',title:'Denied'}];
  const nodes = Object.fromEntries(['#status','#courses','#start','#skip-react'].map(key=>[key,new Element()]));
  const files = [], requests = [];
  let active = 0, peak = 0;
  class TestURL extends URL {}
  TestURL.createObjectURL = blob => { files.push(blob); return 'blob:fixture'; };
  const context = {
    UdemyCourses: {courses, idFor: async course => courses.indexOf(course)+1}, SubtitleCore,
    URL: TestURL, TextEncoder, Blob, AbortSignal, crypto:webcrypto, setTimeout: fn => fn(),
    document: {querySelector: selector=>nodes[selector], createElement:()=>new Element(),createTextNode:text=>text},
    async fetch(address,options) {
      requests.push({address,credentials:options.credentials});
      if (address.includes('/courses/4/')) return {ok:false,status:403};
      if (address.includes('subscriber-curriculum-items')) return {ok:true,json:async()=>({results:[
        {_class:'lecture',id:100,title:'Video',asset:{asset_type:'Video'}},
        {_class:'lecture',id:101,title:'Article',asset:{asset_type:'Article'}},
        {_class:'lecture',id:102,title:'Video 2',asset:{asset_type:'Video'}},
        {_class:'lecture',id:103,title:'Video 3',asset:{asset_type:'Video'}}],next:null})};
      if (address.includes('subscribed-courses')) {
        active++; peak=Math.max(peak,active);
        await new Promise(resolve=>setTimeout(resolve,address.includes('/100/')?10:1)); active--;
        return {ok:true,json:async()=>({asset:{captions:address.includes('/3/')?[]:[{locale_id:'en_US',url:'https://vtt-a.udemycdn.com/fixture.vtt'}]}})};
      }
      return {ok:true,text:async()=>'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello\n'};
    }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../udemy-bilingual/export.js'),'utf8'),context);
  await nodes['#start'].events.click();
  const values = await Promise.all(files.map(async file=>JSON.parse(await file.text())));
  const complete = values.find(value=>value.courseSlug==='complete');
  assert.equal(complete.lectures.length,3);
  assert.equal(peak,3);
  assert.deepEqual(complete.lectures.map(x=>x.id),['100','102','103']);
  assert.equal(complete.curriculum.length,4);
  assert.equal(complete.lectures[0].lectureOrder,1);
  assert.equal(complete.lectures[0].cues[0].zh,'');
  const hash = createHash('sha256').update(JSON.stringify([{start:1,end:3,text:'Hello'}])).digest('hex');
  assert.equal(complete.lectures[0].sourceHash,hash);
  const partial = values.find(value=>value.courseSlug==='partial');
  assert.equal(partial.lectures.length,0);
  assert.equal(partial.errors.length,3);
  const report = values.find(value=>value.startedAt);
  assert.deepEqual(report.courses.map(course=>course.status),['downloaded','partial','failed']);
  assert.match(report.courses[2].error,/403/);
  assert.ok(requests.filter(x=>!x.address.endsWith('.vtt')).every(x=>x.credentials==='include'));
  assert.ok(requests.filter(x=>x.address.endsWith('.vtt')).every(x=>x.credentials==='omit'));
  assert.equal(nodes['#start'].disabled,false);
  console.log('PASS: Batch export, original English/time hash, article listing, missing-caption and inaccessible-course reporting, authenticated course requests.');
})().catch(error=>{console.error(error);process.exitCode=1;});
