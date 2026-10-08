/* Course routes for content scripts and background messages.
   Any Udemy course page works; the list below is only the courses with translations
   prepared, and an unlisted course is flagged instead of blocked. */
(function (scope) {
  "use strict";
  const courses = Object.freeze([
    { slug: "react-the-complete-guide-incl-redux", title: "React - The Complete Guide", id: 1362070 },
    { slug: "learn-flutter-dart-to-build-ios-android-apps", title: "Flutter & Dart - The Complete Guide" },
    { slug: "nodejs-the-complete-guide", title: "NodeJS - The Complete Guide" },
    { slug: "react-native-the-practical-guide", title: "React Native - The Practical Guide" },
    { slug: "css-the-complete-guide-incl-flexbox-grid-sass", title: "CSS - The Complete Guide" },
    { slug: "sveltejs-the-complete-guide", title: "Svelte.js - The Complete Guide" },
    { slug: "nativescript-angular-build-native-ios-android-web-apps", title: "NativeScript + Angular: Build Native iOS, Android & Web Apps" },
    { slug: "remix-course", title: "Remix.js - The Practical Guide" },
    { slug: "the-complete-guide-to-angular-2", title: "Angular - The Complete Guide" },
    { slug: "nextjs-react-the-complete-guide", title: "Next.js & React - The Complete Guide" },
    { slug: "vuejs-2-the-complete-guide", title: "Vue - The Complete Guide (incl. Router & Composition API)" },
    { slug: "ionic-2-the-practical-guide-to-building-ios-android-apps", title: "Ionic - Build iOS, Android & Web Apps with Ionic & Angular" },
    { slug: "javascript-the-complete-guide-2020-beginner-advanced", title: "JavaScript - The Complete Guide (Beginner + Advanced)" },
    { slug: "chatgpt-bard-bing-complete-guide-to-chatgpt-openai-apis", title: "ChatGPT & Generative AI - The Complete Guide", id: 5291332 }
  ].map(course => Object.freeze({ ...course, instructor: "Maximilian Schwarzmüller", known: true })));
  const bySlug = new Map(courses.map(course => [course.slug, course]));
  const unlisted = new Map();
  const ids = new Map();
  function forUrl(value) {
    try {
      const url = new URL(value);
      if (url.origin !== "https://www.udemy.com") return null;
      const slug = url.pathname.match(/^\/course\/([^/]+)\/learn\//)?.[1];
      if (!slug) return null;
      if (bySlug.has(slug)) return bySlug.get(slug);
      // Callers compare course objects by identity, so reuse one object per slug.
      if (!unlisted.has(slug)) {
        unlisted.set(slug, Object.freeze({ slug, title: "", instructor: "", known: false }));
      }
      return unlisted.get(slug);
    } catch { return null; }
  }
  async function idFor(course, fetcher = fetch) {
    if (!course || typeof course.slug !== "string" || !course.slug) throw new Error("不是課程頁面");
    if (course.id) return course.id;
    if (!ids.has(course.slug)) {
      const pending = (async () => {
        const response = await fetcher(`https://www.udemy.com/api-2.0/courses/${course.slug}/?fields[course]=id`, {
          credentials: "include", headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error(`課程 ID 讀取失敗（${response.status}）；請確認仍已登入`);
        const data = await response.json();
        if (!Number.isSafeInteger(data.id) || data.id <= 0) throw new Error("無法辨識本課程 ID");
        return data.id;
      })();
      ids.set(course.slug, pending);
      pending.catch(() => ids.delete(course.slug));
    }
    return ids.get(course.slug);
  }
  const translationKey = (courseId, lectureId) => `translation:${courseId}:${lectureId}`;
  const api = Object.freeze({ courses, forUrl, idFor, translationKey });
  scope.UdemyCourses = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
