#!/usr/bin/env node
/* Write a subscribed-courses-register.json download into the course registries. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { courseFromApi } = require('../udemy-bilingual/subscribed-courses.js');
const root = path.join(__dirname, '..');

function assertRegistration(doc) {
  if (!doc || doc.version !== 1 || !Array.isArray(doc.courses) || !doc.courses.length) throw new Error('不是課程登錄檔');
  return doc.courses.map(course => {
    const check = courseFromApi({
      id: course.courseId, title: course.title, url: course.url, locale: course.locale,
      visible_instructors: course.instructor ? [{ display_name: course.instructor }] : []
    });
    if (!check || check.slug !== course.slug || check.id !== course.courseId) throw new Error(`登錄檔課程無效：${course.slug || course.title || ''}`);
    return { ...check, courseId: check.id, instructor: check.instructor || '未提供' };
  });
}
function hasCourse(source, course) {
  return source.includes(`slug: ${JSON.stringify(course.slug)}`) || new RegExp(`\\bid:\\s*${course.courseId}\\b`).test(source);
}
function insertCourseLines(source, courses) {
  const marker = '\n  ].map(course => Object.freeze';
  const at = source.indexOf(marker);
  if (at < 0) throw new Error('courses.js 找不到課程陣列');
  const fresh = courses.filter(course => !hasCourse(source, course));
  if (!fresh.length) return { source, added: [] };
  const lines = fresh.map(course => `    { slug: ${JSON.stringify(course.slug)}, title: ${JSON.stringify(course.title)}, id: ${course.courseId}, instructor: ${JSON.stringify(course.instructor)} }`).join(',\n');
  let head = source.slice(0, at).trimEnd();
  if (!head.endsWith(',')) head += ',';
  return { source: `${head}\n${lines}${source.slice(at)}`, added: fresh };
}
function sourceKind(course) {
  return course.locale.toLowerCase().startsWith('ja') ? 'Japanese' : 'English';
}
function indexEntry(course) {
  const kind = sourceKind(course);
  const japanese = kind === 'Japanese';
  return {
    courseId: course.courseId, title: course.title, slug: course.slug, instructor: course.instructor,
    folder: `data/courses/${course.courseId}`,
    englishSource: `data/courses/${course.courseId}/${kind}-course-${course.courseId}.json`,
    ...(japanese ? { sourceLanguage: 'ja' } : {}),
    translationProgress: `data/courses/${course.courseId}/translation-progress.json`,
    translations: `data/courses/${course.courseId}/translations`,
    status: japanese ? 'pending-source-export' : 'pending-english-export',
    url: course.url,
    ...(course.locale ? { locale: course.locale } : {})
  };
}
function insertIndex(text, courses) {
  const data = JSON.parse(text);
  const existing = new Set(data.courses.map(item => item.courseId));
  const fresh = courses.filter(course => !existing.has(course.courseId) && !data.courses.some(item => item.slug === course.slug));
  const entries = fresh.map(indexEntry);
  const vueAt = data.courses.findIndex(item => item.courseId === 2426224);
  if (vueAt >= 0) data.courses.splice(vueAt, 0, ...entries);
  else data.courses.push(...entries);
  return JSON.stringify(data, null, 2) + '\n';
}
function insertProgress(text, courses, registeredAt) {
  const data = JSON.parse(text);
  const existing = new Set(data.courses.map(item => item.slug));
  for (const course of courses) {
    if (existing.has(course.slug) || data.courses.some(item => item.id === course.courseId)) continue;
    data.courses.push({
      slug: course.slug, title: course.title, instructor: course.instructor, id: course.courseId,
      status: course.locale.toLowerCase().startsWith('ja') ? 'pending-source-export' : 'pending-english-export',
      url: course.url
    });
  }
  if (registeredAt) data.updatedAt = registeredAt;
  return JSON.stringify(data, null, 2) + '\n';
}
function courseReadme(course) {
  const code = course.locale.toLowerCase();
  const language = code.startsWith('ja') ? '日文' : code.startsWith('zh') ? '中文' : '英文';
  const note = !course.locale || code.startsWith('en')
    ? '英文字幕尚未匯出，因此還沒有譯文。'
    : `原文語言標記為 ${course.locale}。現有英文匯出驗證只接受英文課。`;
  return `# ${course.title}

課程 ID：\`${course.courseId}\`；[返回課程索引](../README.md)。

講師：${course.instructor}。原文語言：${language}${course.locale ? `（${course.locale}）` : ''}。

${note}

- 課程頁面：${course.url}

匯出全課原文後，英文課執行 \`node prepare_course_sources.cjs /完整路徑/Udemy-English-course-${course.courseId}.json\` 建立逐堂原文與翻譯佇列。
`;
}
function insertBefore(text, marker, lines) {
  const at = text.indexOf(marker);
  if (at < 0) throw new Error(`找不到插入位置：${marker.trim()}`);
  return `${text.slice(0, at).trimEnd()}\n${lines.join('\n')}\n${text.slice(at)}`;
}
function insertReadme(text, courses) {
  const fresh = courses.filter(course => !text.includes(`/course/${course.slug}/`));
  let next = fresh.length ? insertBefore(text, '\n已完成課程合計', fresh.map(course => `- [${course.title}](${course.url}) — 待匯出原文`)) : text;
  for (const pattern of [/以下 (\d+) 門已加入翻譯清單/, /上表 (\d+) 門已加入翻譯清單/, /記錄 (\d+) 門課/]) {
    if (fresh.length) next = next.replace(pattern, (match, count) => match.replace(count, String(Number(count) + fresh.length)));
  }
  return next;
}
function insertCourseIndex(text, courses) {
  const fresh = courses.filter(course => !new RegExp(`\\|\\s*${course.courseId}\\s*\\|`).test(text));
  if (!fresh.length) return text;
  return insertBefore(text, '\n13 門已完成課程影片講座合計', fresh.map(course => `| [${course.title}](${course.courseId}/README.md) | ${course.courseId} | 待匯出 | 0（尚未匯出原文） | — |`));
}
function applyRegistration(doc, files) {
  const courses = assertRegistration(doc);
  const courseFile = insertCourseLines(files.coursesJs, courses);
  return {
    added: courseFile.added,
    coursesJs: courseFile.source,
    index: insertIndex(files.index, courseFile.added),
    progress: insertProgress(files.progress, courseFile.added, doc.registeredAt),
    readme: insertReadme(files.readme, courseFile.added),
    courseIndex: insertCourseIndex(files.courseIndex, courseFile.added),
    stubs: courseFile.added.map(course => ({ courseId: course.courseId, markdown: courseReadme(course) }))
  };
}
function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, text);
  fs.renameSync(temporary, file);
}
function main(file) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = applyRegistration(doc, {
    coursesJs: fs.readFileSync(path.join(root, 'udemy-bilingual/courses.js'), 'utf8'),
    index: fs.readFileSync(path.join(root, 'data/courses/index.json'), 'utf8'),
    progress: fs.readFileSync(path.join(root, 'data/english-download-progress.json'), 'utf8'),
    readme: fs.readFileSync(path.join(root, 'README.md'), 'utf8'),
    courseIndex: fs.readFileSync(path.join(root, 'data/courses/README.md'), 'utf8')
  });
  if (!result.added.length) {
    console.log('沒有新課程。已在翻譯清單的項目已略過。');
    return result;
  }
  write(path.join(root, 'udemy-bilingual/courses.js'), result.coursesJs);
  write(path.join(root, 'data/courses/index.json'), result.index);
  write(path.join(root, 'data/english-download-progress.json'), result.progress);
  write(path.join(root, 'README.md'), result.readme);
  write(path.join(root, 'data/courses/README.md'), result.courseIndex);
  for (const stub of result.stubs) {
    const readme = path.join(root, 'data/courses', String(stub.courseId), 'README.md');
    if (!fs.existsSync(readme)) write(readme, stub.markdown);
  }
  console.log(result.added.map(course => `${course.courseId} ${course.title}`).join('\n'));
  return result;
}
module.exports = { applyRegistration, assertRegistration, courseReadme };
if (require.main === module) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/register_subscribed_courses.cjs /path/to/subscribed-courses-register.json');
  main(process.argv[2]);
}
