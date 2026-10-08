const assert = require('node:assert/strict');
const { parse, at, select, time } = require('../udemy-bilingual/subtitle-core.js');
const cues = parse('\uFEFFWEBVTT\r\n\r\nNOTE ignore\r\n00:00:00.000 --> 00:00:99.000\r\nignored\r\n\r\n1\r\n00:00:01.000 --> 00:00:03.000 align:start\r\n<v Max>React &amp; JSX</v>\r\n\r\n00:00:02.000 --> 00:00:04.000\r\nSecond line\r\n\r\nbad\r\n00:00:06.000 --> 00:00:05.000\r\ninvalid');
assert.equal(cues.length, 2);
assert.equal(at(cues, 0), '');
assert.equal(at(cues, 1), 'React & JSX');
assert.equal(at(cues, 2.5), 'React & JSX Second line');
assert.equal(at(cues, 3), 'Second line');
assert.equal(at(cues, 4), '');
assert.equal(at(cues, 1.5), 'React & JSX'); // backwards seek
assert.equal(time('01:02:03,500'), 3723.5);
assert.equal(parse('1\n00:00:01,000 --> 00:00:02,000\nSRT').length, 1);
const languages = [{locale_id:'zh_CN',url:'cn'}, {locale_id:'en_US',url:'en'}, {locale_id:'zh_TW',url:'tw'}];
assert.equal(select(languages).chinese.url, 'tw');
assert.equal(select(languages.slice(0,2)).simplified, true);
assert.equal(select(languages).english.url, 'en');
const OpenCC = require('../udemy-bilingual/vendor/opencc.js');
assert.equal(OpenCC.Converter({from:'cn',to:'tw'})('组件的状态改变了'), '組件的狀態改變了');
console.log('PASS: VTT/SRT parsing, overlapping cues, cue boundaries, backwards seek, language selection, Simplified → Traditional.');
const { localizeTaiwan } = require('../udemy-bilingual/subtitle-core.js');
const taiwan = value => localizeTaiwan(OpenCC.Converter({from:'cn',to:'tw'})(value));
assert.equal(taiwan('组件的状态与数组中的对象属性'), '元件的狀態與陣列中的物件屬性');
assert.equal(taiwan('调用函数并返回值，加载数据和默认配置文件'), '呼叫函式並回傳值，載入資料和預設設定檔');
assert.equal(taiwan('JavaScript 库、React 项目、数据库'), 'JavaScript 函式庫、React 專案、資料庫');
assert.equal(taiwan('useState、props、Hooks、JSX'), 'useState、props、Hooks、JSX');
assert.equal(taiwan('目标对象、三个项目'), '目標對象、三個項目');
console.log('PASS: Taiwan technical terminology, intact API identifiers, context-sensitive object/project wording.');
// 雙語組合依課程主要語言決定：英文課中英雙語、日文課中日雙語。
const primaryCases = [
  [[{ language: 'ja', title: '日本語' }, { language: 'ja', title: '日文[自動]' }], '日文', '中日雙語'],
  [[{ language: 'en', title: 'English' }, { language: 'ja', title: '日文[自動]' }], '英文', '中英雙語'],
  [[{ language: 'zh-Hans', title: '中文[自动]' }], '中文', '中文雙語'],
  [[{ language: 'zh-TW', title: '繁體中文' }], '繁體中文', '中文雙語'],
  // 韓文、德文、法文等小語種先把原文翻成英文，再走中英雙語。
  [[{ language: 'ko', title: '한국어' }, { language: 'en', title: 'English[Auto]' }], '韓文', '中英雙語'],
  [[{ language: 'de', title: 'Deutsch' }, { language: 'fr', title: 'Français' }], '德文', '中英雙語'],
  [[{ language: 'es', title: 'Español' }], '西班牙文', '中英雙語'],
];
for (const [captions, name, pair] of primaryCases) {
  const picked = SubtitleCore.select(captions);
  assert.equal(picked.sourceName, name, `${name} 課程的主要語言判斷錯誤`);
  assert.equal(SubtitleCore.pairName(picked.source), pair);
}
// 全部都是自動字幕時退回第一條字幕軌。
assert.equal(SubtitleCore.select([{ language: 'de', title: 'Deutsch[Auto]' }, { language: 'fr', title: 'Français[auto]' }]).sourceName, '德文');
assert.equal(SubtitleCore.select([]).source, null);
assert.deepEqual(SubtitleCore.pipeline(SubtitleCore.select([{ language: 'ja' }]).source), ['zh-TW']);
assert.deepEqual(SubtitleCore.pipeline(SubtitleCore.select([{ language: 'zh-Hans' }]).source), ['zh-TW']);
assert.deepEqual(SubtitleCore.pipeline(SubtitleCore.select([{ language: 'de' }]).source), ['en', 'zh-TW']);
console.log('PASS: Primary-language detection drives the bilingual pair (中英 / 中日 / 中文) and the small-language en→zh pipeline.');
// 匯出檔名與 sourceLanguage 必須跟著課程語言，日文課不會再輸出 English。
assert.equal(SubtitleCore.languageSlug(SubtitleCore.select([{ language: 'ja', title: '日本語' }]).source), 'Japanese');
assert.equal(SubtitleCore.languageSlug(SubtitleCore.select([{ language: 'en' }]).source), 'English');
assert.equal(SubtitleCore.languageSlug('ko'), 'Korean');
assert.equal(SubtitleCore.languageSlug(''), 'Source');
console.log('PASS: Export filenames and sourceLanguage follow the course language (English / Japanese / …).');
