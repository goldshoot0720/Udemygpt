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
    { slug: "chatgpt-bard-bing-complete-guide-to-chatgpt-openai-apis", title: "ChatGPT & Generative AI - The Complete Guide", id: 5291332 },
    { slug: "javascript-data-structures-and-algorithms", title: "100 Days of Code: JavaScript Data Structures and Algorithms", id: 4905690, instructor: "Elshad Karimov" },
    { slug: "mastering-linux", title: "Mastering Linux: The Comprehensive Guide", id: 5181942, instructor: "Jannis Seemann、Denis Panjuta" },
    { slug: "flutter-bootcamp-with-dart", title: "The Complete Flutter Development Bootcamp with Dart", id: 2259120, instructor: "Dr. Angela Yu" },
    { slug: "complete-angular-indepth-easy", title: "Complete Angular 22 - Ultimate Guide - with Real World App", id: 1633166, instructor: "Harsha Vardhan" },
    { slug: "the-complete-ruby-on-rails-developer-course", title: "The Complete Ruby on Rails Developer Course", id: 519442, instructor: "Rob Percival、Mashrur Hossain" },
    { slug: "introduction-to-computer-networks", title: "Introduction to Computer Networks for Non-Techies", id: 580876, instructor: "Alton Hardin" },
    { slug: "php-for-complete-beginners-includes-msql-object-oriented", title: "PHP for Beginners - Become a PHP Master - CMS Project", id: 405282, instructor: "Edwin Diaz" },
    { slug: "ios-13-app-development-bootcamp", title: "iOS & Swift - The Complete iOS App Development Bootcamp", id: 1778502, instructor: "Dr. Angela Yu" },
    { slug: "complete-networking-fundamentals-course-ccna-start", title: "The Complete Networking Fundamentals Course. Your CCNA start", id: 751094, instructor: "David Bombal" },
    { slug: "spring-5-with-spring-boot-2", title: "Java Spring Framework, Spring Boot, Spring AI - Gen AI", id: 2167814, instructor: "Navin Reddy、Telusko Edutech" },
    { slug: "laravel-basics-to-advance", title: "Laravel 11 - From Basics to Advance", id: 6117817, instructor: "Web Solution Us、Md Morshedul Arefin" },
    { slug: "game-development-in-js-the-complete-guide-w-phaser-3", title: "Game Development in JS/TS - The Complete Guide (w/ Phaser 3)", id: 3568507, instructor: "Eincode by Filip Jerga、Filip Jerga" },
    { slug: "solid-js-firebase-the-complete-guide-twitter-clone-app", title: "Solid JS & Firebase - Complete Guide to X(Twitter) Clone", id: 5011402, instructor: "Eincode by Filip Jerga、Filip Jerga" }
  ].map(course => Object.freeze({ ...course, instructor: course.instructor || "Maximilian Schwarzmüller", known: true })));
  const bySlug = new Map(courses.map(course => [course.slug, course]));
  const unlisted = new Map();
  const metas = new Map();
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
  async function metaFor(course, fetcher = fetch) {
    if (!course || typeof course.slug !== "string" || !course.slug) throw new Error("不是課程頁面");
    if (!metas.has(course.slug)) {
      const pending = (async () => {
        // course.locale 是課程原文語言（en_US／ja_JP…），用來挑出正確的原始字幕軌；
        // 翻譯字幕軌不一定標示 auto，少了這個資訊就會把譯文當成原文。
        const response = await fetcher(`https://www.udemy.com/api-2.0/courses/${course.slug}/?fields[course]=id,locale`, {
          credentials: "include", headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error(`課程 ID 讀取失敗（${response.status}）；請確認仍已登入`);
        const data = await response.json();
        const id = course.id || data.id;
        if (!Number.isSafeInteger(id) || id <= 0) throw new Error("無法辨識本課程 ID");
        const locale = typeof data.locale === "string" ? data.locale : (data.locale?.locale || "");
        return { id, locale };
      })();
      metas.set(course.slug, pending);
      pending.catch(() => metas.delete(course.slug));
    }
    return metas.get(course.slug);
  }
  async function idFor(course, fetcher = fetch) {
    return (await metaFor(course, fetcher)).id;
  }
  const translationKey = (courseId, lectureId) => `translation:${courseId}:${lectureId}`;
  const api = Object.freeze({ courses, forUrl, idFor, metaFor, translationKey });
  scope.UdemyCourses = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
