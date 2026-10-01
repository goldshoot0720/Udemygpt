/* A dedicated export view in a normal authenticated Udemy player tab. */
(() => {
  if (new URL(location.href).searchParams.get('subtitleExport') !== 'batch') return;
  if (document.getElementById('udemy-english-export')) return;
  const root = document.createElement('div'); root.id = 'udemy-english-export';
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#f4f7fb;overflow:auto';
  const shadow = root.attachShadow({mode:'open'});
  shadow.innerHTML = `<style>:host{font:16px/1.6 system-ui,sans-serif;color:#172033}main{max-width:900px;margin:32px auto;padding:20px}button,a{font:inherit}button{padding:10px 18px;cursor:pointer}li{margin:12px 0}#status{padding:15px;background:white;border-radius:8px}a{margin-left:12px}small{display:block;color:#526078}</style><main><h1>課程英文字幕匯出</h1><p>以目前 Udemy 登入帳號取得英文字幕，保留每段原文及時間軸，供後續翻譯使用。下載期間請保留此分頁。</p><label><input id="skip-react" type="checkbox" checked>略過已有完整英文備份的 React 課程</label><p><button id="start">開始下載英文字幕</button></p><p id="status" role="status">尚未開始</p><ol id="courses"></ol></main>`;
  document.body.append(root);
})();
