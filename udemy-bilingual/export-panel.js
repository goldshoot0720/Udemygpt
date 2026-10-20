/* A dedicated export view in a normal authenticated Udemy player tab. */
(() => {
  if (new URL(location.href).searchParams.get('subtitleExport') !== 'batch') return;
  if (document.getElementById('udemy-english-export')) return;
  const root = document.createElement('div'); root.id = 'udemy-english-export';
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#f4f7fb;overflow:auto';
  const shadow = root.attachShadow({mode:'open'});
  shadow.innerHTML = `<style>:host{font:16px/1.6 system-ui,sans-serif;color:#172033}main{max-width:900px;margin:32px auto;padding:20px}button,a{font:inherit}button{padding:10px 18px;cursor:pointer}button:disabled{cursor:default}li{margin:12px 0}#status,#mine-status{padding:15px;background:white;border-radius:8px}a{margin-left:12px}small{display:block;color:#526078}#mine{list-style:none;padding:0;max-height:480px;overflow:auto;background:#fff;border-radius:8px}#mine:empty{display:none}#mine li{margin:0;padding:8px 12px;border-bottom:1px solid #e6ebf2}#mine label{display:flex;gap:8px;align-items:flex-start}</style><main><h1>課程英文字幕匯出</h1><p>以目前 Udemy 登入帳號取得英文字幕，保留每段原文及時間軸，供後續翻譯使用。下載期間請保留此分頁。</p><h2>我的課程</h2><p>讀取此帳號已加入的課程。已在翻譯清單的課程會略過。英文新課程預設勾選；原文不是英文的課程會列出，但不會預設勾選。登錄後下載 JSON，並把選取的課程加入下方匯出清單。</p><p><button id="load-mine" type="button">讀取我的課程</button> <button id="register-mine" type="button" disabled>登錄選取的課程</button></p><p id="mine-status" role="status">尚未讀取</p><ul id="mine"></ul><label><input id="skip-react" type="checkbox" checked>略過已有完整英文備份的 React 課程</label><p><button id="start">開始下載英文字幕</button></p><p id="status" role="status">尚未開始</p><ol id="courses"></ol></main>`;
  document.body.append(root);
})();
