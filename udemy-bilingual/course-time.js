/* Video-minute totals and sequential course progress, independent of subtitles. */
(function (scope) {
  "use strict";
  const seconds = value => {
    if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  function duration(item) {
    const asset = item.asset || {};
    const length = seconds(asset.length) ?? seconds(asset.time_estimation);
    if (length !== null) return length;
    const summary = String(item.content_summary || "").trim();
    if (!/^\d+:\d{2}(?::\d{2})?$/.test(summary)) return null;
    const parts = summary.split(":").map(Number);
    if (parts.slice(1).some(part => part >= 60)) return null;
    return seconds(parts.reduce((result, part) => result * 60 + part, 0));
  }
  function lectures(items) {
    let order = 0;
    return items.filter(item => item._class === "lecture").map(item => ({
      id: String(item.id), title: item.title || "", order: ++order,
      video: /^video$/i.test(item.asset?.asset_type || ""),
      seconds: /^video$/i.test(item.asset?.asset_type || "") ? duration(item) : 0
    }));
  }
  function calculate(items, lectureId, position = 0) {
    const videos = items.filter(item => item.video);
    const missing = videos.filter(item => item.seconds === null).length;
    const total = missing ? null : videos.reduce((sum, item) => sum + item.seconds, 0);
    const index = items.findIndex(item => item.id === String(lectureId));
    const current = items[index];
    if (!current) return { total, watched: null, remaining: null, current: null, missing };
    const before = items.slice(0, index).filter(item => item.video);
    const elapsed = Math.max(0, Number.isFinite(position) ? position : 0);
    const watched = before.some(item => item.seconds === null) || (current.video && current.seconds === null) ? null :
      before.reduce((sum, item) => sum + item.seconds, 0) + (current.video ? Math.min(current.seconds, elapsed) : 0);
    return { total, watched, remaining: total === null || watched === null ? null : Math.max(0, total - watched), current, missing };
  }
  async function read(courseId, fetcher = fetch, signal) {
    const items = [], seen = new Set();
    let next = `https://www.udemy.com/api-2.0/courses/${courseId}/subscriber-curriculum-items/?page_size=100&fields[lecture]=id,title,asset,content_summary&fields[asset]=asset_type,length,time_estimation`;
    while (next) {
      const url = new URL(next, "https://www.udemy.com");
      if (url.origin !== "https://www.udemy.com" || url.pathname !== `/api-2.0/courses/${courseId}/subscriber-curriculum-items/`) throw new Error("課程時長清單來源不符");
      if (seen.has(url.href)) throw new Error("課程時長清單分頁重複");
      seen.add(url.href);
      const response = await fetcher(url.href, { credentials: "include", signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`課程時長讀取失敗（${response.status}）；請確認仍已登入`);
      const data = await response.json();
      if (!Array.isArray(data.results)) throw new Error("課程時長清單格式不符");
      items.push(...data.results); next = data.next;
    }
    const result = lectures(items);
    if (!result.some(item => item.video)) throw new Error("未取得影片時長清單");
    return result;
  }
  const minutes = value => value === null ? "—" : (value / 60).toLocaleString("zh-TW", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const api = Object.freeze({ duration, lectures, calculate, read, minutes });
  scope.UdemyCourseTime = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
