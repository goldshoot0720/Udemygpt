# Firefox 雙版本 XPI

一般版 Firefox 只安裝含 `META-INF/mozilla.rsa` 的簽章檔。同一版必須同時有簽章檔與未簽章檔。未簽章檔只給 `about:debugging` 暫時載入。

使用者貼出「因為此附加元件尚未經過驗證，無法安裝」，或在 Finder 選了 `udemy-bilingual-firefox-<版本>-UNSIGNED-DO-NOT-INSTALL.xpi`（或同版 Firefox zip）時，交出同一版的兩份 XPI。把簽章檔交給使用者安裝。

1. 從 `udemy-bilingual/manifest.json` 讀版本。
2. 這兩個檔都在 `dist/v<版本>/`，簽章檔含 `META-INF/mozilla.rsa`，且未簽章檔與 `udemy-bilingual-firefox-<版本>.zip` 位元組相同時，把簽章檔的絕對路徑交給使用者。完成。
   - `udemy-bilingual-firefox-<版本>-signed.xpi`
   - `udemy-bilingual-firefox-<版本>-UNSIGNED-DO-NOT-INSTALL.xpi`
3. 缺任一份就執行 `python3 scripts/build_release.py --key-file ~/.config/udemy-bilingual/amo-key.txt`。憑證只留在該檔。
4. 腳本回報同一版本已在 AMO（HTTP 409）或簽署仍在排隊時，改執行 `python3 scripts/fetch_signed.py <版本> --key-file ~/.config/udemy-bilingual/amo-key.txt`，下載既有提交。下載後仍須兩份都在。
5. 腳本回報兩份 XPI 內容不同、要換新版本號時，把 `manifest.json` 的修訂號加一，再從步驟 3 簽這個新版本。

完成條件：同一版的簽章檔與未簽章檔都在，簽章檔含 `META-INF/mozilla.rsa`，未簽章檔與 Firefox zip 位元組相同。回覆簽章檔的絕對路徑，並說明在「附加元件與主題」右上角齒輪選「從檔案安裝附加元件」。未簽章檔只在 `about:debugging#/runtime/this-firefox` 選「載入暫用附加元件」。這次修復不包含 GitHub Release。

## Git 提交

使用者說「自動提交」或「提交」時，提交這次要求的變更到目前分支。同一句寫了 `https://github.com/goldshoot0720/Udemygpt`，或說「提交至」或「自動提交至」這個網址時，提交後推上 `origin`（`main`）。稍後說「推上」或「推上去」時，把已提交的變更推上同一個遠端。

提交範圍是這次要求的課程翻譯、對齊，或使用者點名的檔案。留在工作區的未追蹤路徑：`.workbuddy-ai/`、`bun-deck/`、`bun-tutorial/`、`lottery-trust-plan.html`、`public/`、`scripts/scan_glued.py`，以及故事與合約草案。
