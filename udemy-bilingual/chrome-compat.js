/* Adapt Chromium callback APIs to the Promise interface used by this extension. */
(() => {
  "use strict";
  const api = globalThis.chrome;
  const call = (owner, method, ...args) => new Promise((resolve, reject) => {
    owner[method](...args, value => {
      const error = api.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(value);
    });
  });
  globalThis.browser = {
    storage: { local: {
      get: keys => call(api.storage.local, "get", keys),
      set: values => call(api.storage.local, "set", values)
    } },
    tabs: { getZoom: tabId => call(api.tabs, "getZoom", tabId) },
    runtime: {
      async sendMessage(message) {
        const response = await call(api.runtime, "sendMessage", message);
        if (response?.udemyBilingualResponse !== 1) throw new Error("擴充功能背景程式未回應，請重新載入");
        if (response.error) throw new Error(response.error);
        return response.value;
      },
      onMessage: { addListener(handler) {
        api.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (!["caption-file", "page-zoom"].includes(message?.type)) return false;
          Promise.resolve().then(() => handler(message, sender)).then(
            value => sendResponse({ udemyBilingualResponse: 1, value }),
            error => sendResponse({ udemyBilingualResponse: 1, error: error?.message || String(error) })
          );
          // Keep the channel open on Chromium versions without Promise listeners.
          return true;
        });
      } }
    }
  };
})();
