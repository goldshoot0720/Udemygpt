const assert = require('node:assert/strict');
const { courseFromApi, isListed, registrationDocument } = require('../udemy-bilingual/subscribed-courses.js');
const { applyRegistration } = require('../scripts/register_subscribed_courses.cjs');

const angela = courseFromApi({
  id: 1778502,
  title: 'iOS & Swift - The Complete iOS App Development Bootcamp',
  url: '/course/ios-13-app-development-bootcamp/',
  locale: { locale: 'en_US' },
  visible_instructors: [{ display_name: 'Dr. Angela Yu, Developer and Lead Instructor' }, { display_name: 'Coding Faculty | extra' }]
});
assert.equal(angela.instructor, 'Dr. Angela Yu、Coding Faculty');
assert.equal(angela.locale, 'en_US');
assert.equal(angela.url, 'https://www.udemy.com/course/ios-13-app-development-bootcamp/');
assert.equal(courseFromApi({ id: 1, title: 'Bad', url: '/course/../secret/' }), null);
assert.equal(courseFromApi({ title: 'No id', url: '/course/ok/' }), null);
assert.equal(isListed(angela, [{ slug: 'ios-13-app-development-bootcamp' }]), true);
assert.equal(isListed(angela, [{ id: 1, slug: 'other' }]), false);

const files = {
  coursesJs: `const courses = Object.freeze([
    { slug: "react-the-complete-guide-incl-redux", title: "React", id: 1362070 }
  ].map(course => Object.freeze({ ...course, instructor: course.instructor || "Maximilian Schwarzmüller", known: true })));
`,
  index: JSON.stringify({ version: 1, courses: [
    { courseId: 1362070, title: 'React', slug: 'react-the-complete-guide-incl-redux' },
    { courseId: 2426224, title: 'Vue', slug: 'vue-js-complete-guide' }
  ] }, null, 2) + '\n',
  progress: JSON.stringify({ version: 1, courses: [{ slug: 'react-the-complete-guide-incl-redux', id: 1362070 }] }, null, 2) + '\n',
  readme: '以下 1 門已加入翻譯清單。\n\n- [React](https://www.udemy.com/course/react-the-complete-guide-incl-redux/) — 678 堂\n\n已完成課程合計 **1** 堂。\n\n上表 1 門已加入翻譯清單。記錄 1 門課的下載。\n',
  courseIndex: '| [React](1362070/README.md) | 1362070 | 678 | 678 | — |\n\n13 門已完成課程影片講座合計 1 堂。\n'
};
const doc = registrationDocument([{
  id: 42, title: 'Say "hi"', slug: 'say-hi', locale: 'en_US', instructor: 'Ada Lovelace',
  url: 'https://www.udemy.com/course/say-hi/'
}, angela], '2026-10-21T00:00:00.000Z');
const once = applyRegistration(doc, files);
assert.deepEqual(once.added.map(course => course.courseId), [42, 1778502]);
const listed = new Function(`${once.coursesJs}; return courses;`)();
assert.equal(listed.find(course => course.slug === 'say-hi').title, 'Say "hi"');
assert.equal(listed.find(course => course.id === 42).instructor, 'Ada Lovelace');
assert.equal(listed.at(-1).instructor, 'Dr. Angela Yu、Coding Faculty');
assert.ok(once.coursesJs.includes('].map(course => Object.freeze'));
const index = JSON.parse(once.index);
assert.deepEqual(index.courses.map(course => course.courseId), [1362070, 42, 1778502, 2426224]);
assert.equal(index.courses[1].status, 'pending-english-export');
const progress = JSON.parse(once.progress);
assert.equal(progress.courses.at(-1).slug, 'ios-13-app-development-bootcamp');
assert.equal(progress.updatedAt, '2026-10-21T00:00:00.000Z');
assert.match(once.readme, /以下 3 門已加入翻譯清單/);
assert.match(once.readme, /上表 3 門已加入翻譯清單/);
assert.match(once.readme, /記錄 3 門課/);
assert.match(once.readme, /\[Say "hi"\]\(https:\/\/www\.udemy\.com\/course\/say-hi\/\) — 待匯出原文\n- \[iOS/);
assert.match(once.courseIndex, /\| 42 \| 待匯出 \| 0（尚未匯出原文） \| — \|\n\| \[iOS/);
assert.equal(once.stubs[0].markdown.includes('講師：Ada Lovelace'), true);
const twice = applyRegistration(doc, { ...files, coursesJs: once.coursesJs, index: once.index, progress: once.progress, readme: once.readme, courseIndex: once.courseIndex });
assert.deepEqual(twice.added, []);
assert.equal(twice.coursesJs, once.coursesJs);
assert.throws(() => registrationDocument([{ id: 1, title: 'Bad', slug: 'bad', url: 'https://www.udemy.com/course/nope/' }]), /無法登錄/);
console.log('PASS: Subscribed-course rows, skipped known courses, and idempotent registry insert.');
