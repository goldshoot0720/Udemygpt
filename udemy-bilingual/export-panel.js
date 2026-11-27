/* The options page and the authenticated player tab share this view. */
(() => {
  const inPlayer = location.origin === 'https://www.udemy.com';
  let surface = document.getElementById('export-page');
  let dialog;
  if (inPlayer) {
    if (new URL(location.href).searchParams.get('subtitleExport') !== 'batch') return;
    if (document.getElementById('udemy-english-export')) return;
    const host = document.createElement('div');
    host.id = 'udemy-english-export';
    const shadow = host.attachShadow({ mode: 'open' });
    const sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = browser.runtime.getURL('export.css');
    dialog = document.createElement('dialog');
    dialog.dataset.theme = 'subtitles';
    dialog.setAttribute('aria-labelledby', 'export-title');
    dialog.lang = 'zh-TW';
    shadow.append(sheet, dialog);
    document.body.append(host);
    surface = dialog;
  }
  if (!surface) return;

  surface.innerHTML = `
    <div class="workspace">
      <header class="masthead">
        <span class="cc-mark" aria-hidden="true">CC</span>
        <span>Udemy 雙語字幕</span>
      </header>
      <main>
        <div class="intro">
          <h1 id="export-title">課程字幕匯出</h1>
          <p>從目前登入的 Udemy 帳號匯出原文字幕，保留每段文字與時間軸。</p>
        </div>
        <div class="layout">
          <div class="controls">
            <section class="download" aria-labelledby="download-title">
              <h2 id="download-title">批次下載</h2>
              <label class="skip"><input id="skip-react" type="checkbox" checked>略過已有完整英文備份的 React 課程</label>
              <button id="start" type="button">開始下載字幕</button>
              <p class="hint">下載期間請保持此分頁開啟。</p>
              <p id="status" role="status">尚未開始</p>
            </section>
            <details class="account">
              <summary><h2>從我的課程加入</h2></summary>
              <p>讀取已加入的課程。英文新課程會自動勾選，其他語言可手動加入，已在翻譯清單的課程會略過。</p>
              <button id="load-mine" type="button">讀取我的課程</button>
              <ul id="mine"></ul>
              <button id="register-mine" type="button" disabled>加入匯出清單</button>
              <p id="mine-status" role="status">尚未讀取</p>
              <p class="hint">加入時會一併下載登錄用的 JSON 檔。</p>
            </details>
          </div>
          <section class="queue" aria-labelledby="queue-title">
            <header class="queue-head">
              <h2 id="queue-title">匯出清單</h2>
              <span id="course-count"></span>
            </header>
            <ol id="courses" role="list"></ol>
          </section>
        </div>
      </main>
    </div>`;

  surface.querySelector('.account').open = window.matchMedia('(min-width: 54em)').matches;
  if (dialog) {
    const player = new URL(location.href);
    player.searchParams.delete('subtitleExport');
    player.searchParams.delete('subtitleExportSkip');
    const back = document.createElement('a');
    back.href = player.href;
    back.textContent = '返回播放器';
    surface.querySelector('.masthead').append(back);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      if (!surface.querySelector('#start').disabled) back.click();
    });
    dialog.showModal();
  }
})();
