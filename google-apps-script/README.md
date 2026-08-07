# Google Apps Script 部署說明

專案已寫入：https://script.google.com/home/projects/1cAMdi5hwkMLA5dKGdVR4wtya5mvelCQ1CuU5YKKSDBvMrY4PBHZgasNs/edit

原始碼備份：`google-apps-script/Code.gs`

## 部署成網頁應用程式

1. 開啟上方 Apps Script 專案
2. 按 **部署 → 新增部署作業**
3. 類型選 **網頁應用程式**
4. 執行身分：**我**
5. 誰可以存取：**所有人**
6. 按 **部署**，並完成授權（試算表權限）
7. 複製 **網頁應用程式網址**（形如 `https://script.google.com/macros/s/XXXX/exec`）

## 接到 Next.js

在專案根目錄建立 `.env.local`：

```env
GAS_WEB_APP_URL=https://script.google.com/macros/s/你的部署ID/exec
```

然後重啟：

```bash
npm run dev
```

## 資料存放

首次 API 呼叫會自動建立 Google 試算表「棕熊營闖關進度資料庫」，工作表：

- `Attempts`：闖關紀錄（eventId / teamId / stationId / status / createdAt）
- `Meta`：活動資訊

也可在編輯器手動執行 `setupDatabase` 先行建立試算表。
