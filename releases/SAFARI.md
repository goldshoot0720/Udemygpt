# Safari 原始碼包

這是 Web Extension 來源，不是可直接安裝的 Safari 擴充套件。本次發布環境沒有完整 Xcode，無法執行 Apple 的封裝工具、生成 Xcode 專案、編譯或簽署；Safari 相容性尚待實際驗證。

需要安裝完整 Xcode 的 Mac。若 `xcode-select -p` 指向 Command Line Tools，先選取完整 Xcode 的 Developer 目錄。解壓縮此包後執行：

```sh
sh convert-safari.sh
```

腳本優先使用 `safari-web-extension-packager`，也支援舊名稱 `safari-web-extension-converter`，並產生 macOS Xcode 專案。檢查 Apple 工具顯示的 API 相容性警告，於 Xcode 設定 Team 和 Signing & Capabilities，再編譯、簽署與測試。App Store 發布需使用自己的 Apple Developer 帳號完成審核。

需驗證的功能：Udemy 網站存取權限、背景字幕下載、tabs.getZoom、storage.local、課程字幕及譯文匯入、全螢幕與縮放、課程分鐘數。此版本使用原生 `browser` Promise API 和 Manifest V3 背景 service worker。

參考：[Apple 封裝文件](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)、[Safari Extensions](https://developer.apple.com/safari/extensions/)。
