/* Only retrieve subtitle files from Udemy's caption hosts. No video downloads. */
browser.runtime.onMessage.addListener(async (message, sender) => {
  if (!["caption-file", "page-zoom"].includes(message?.type)) return;
  if (!UdemyCourses.forUrl(sender.url)) {
    throw new Error("不支援的課程頁面");
  }
  if (message.type === "page-zoom") return browser.tabs.getZoom(sender.tab.id);
  const url = new URL(message.url);
  const allowed = url.hostname.endsWith(".udemycdn.com") ||
    url.hostname === "udemy-captions.s3.amazonaws.com" || url.hostname === "www.udemy.com";
  if (url.protocol !== "https:" || !allowed) throw new Error("字幕來源不是 Udemy");
  const response = await fetch(url.href, { credentials: "omit", redirect: "error" });
  if (!response.ok) throw new Error(`字幕讀取失敗（${response.status}）`);
  const body = await response.text();
  if (body.length > 5_000_000) throw new Error("字幕檔過大");
  return body;
});
