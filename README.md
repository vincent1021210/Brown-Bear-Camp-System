# 棕熊營系統

線上版：https://vincent1021210.github.io/Brown-Bear-Camp-System/

學員闖關進度＋關主掃碼判定。

## 本機開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

## GitHub Pages

推送到 `main` 後，GitHub Actions 會自動建置並部署到 Pages。

可選：在 repo Secrets 設定 `GAS_WEB_APP_URL`，進度會同步到 Google 試算表；未設定時使用瀏覽器本機儲存。

## Apps Script（可選）

見 [`google-apps-script/README.md`](./google-apps-script/README.md)

專案：https://script.google.com/home/projects/1cAMdi5hwkMLA5dKGdVR4wtya5mvelCQ1CuU5YKKSDBvMrY4PBHZgasNs/edit
