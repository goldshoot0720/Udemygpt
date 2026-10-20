/* Normalize the signed-in user's subscribed-course API rows. */
(function (scope) {
  "use strict";
  function instructorName(person) {
    const name = person && (person.display_name || person.title || person.name) || "";
    return String(name).split("|")[0].replace(/,\s*Developer and Lead Instructor\s*$/, "").trim();
  }
  function courseFromApi(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = raw.id;
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const path = typeof raw.url === "string" ? raw.url : "";
    const slug = path.match(/\/course\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?/)?.[1] || "";
    if (!Number.isSafeInteger(id) || id <= 0 || !title || title.length > 300 || !slug) return null;
    const localeValue = typeof raw.locale === "string" ? raw.locale : (raw.locale && typeof raw.locale.locale === "string" ? raw.locale.locale : "");
    const locale = /^[A-Za-z]{2,3}(?:[_-][A-Za-z0-9]+)?$/.test(localeValue) ? localeValue : "";
    const instructors = Array.isArray(raw.visible_instructors) ? raw.visible_instructors : [];
    const instructor = instructors.map(instructorName).filter(Boolean).join("、");
    return { id, title, slug, locale, instructor, url: `https://www.udemy.com/course/${slug}/` };
  }
  function isListed(course, known) {
    return Array.isArray(known) && known.some(item => item && (item.id === course.id || item.slug === course.slug));
  }
  function registrationDocument(courses, registeredAt) {
    const rows = (courses || []).map(course => {
      const check = courseFromApi({ id: course.id, title: course.title, url: course.url, locale: course.locale, visible_instructors: [] });
      if (!check || check.slug !== course.slug || check.id !== course.id) throw new Error(`無法登錄 ${course.title || course.slug || ""}`);
      return { courseId: course.id, title: course.title, slug: course.slug, instructor: course.instructor || "未提供", locale: course.locale || "", url: check.url };
    });
    if (!rows.length) throw new Error("沒有可登錄的課程");
    return { version: 1, registeredAt, courses: rows };
  }
  const api = Object.freeze({ courseFromApi, isListed, registrationDocument });
  scope.UdemySubscribed = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
