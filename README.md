# 棕熊營系統

學員闖關進度＋關主掃碼判定。資料庫使用 **Google Apps Script + Spreadsheet**。

## 啟動

1. 部署 Apps Script（見 [`google-apps-script/README.md`](./google-apps-script/README.md)）
2. 建立 `.env.local`：

```env
GAS_WEB_APP_URL=https://script.google.com/macros/s/XXXX/exec
```

3. 執行：

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

## 流程

### 選擇身分

- **學員**：選小隊 → 進度頁（全暗顯示「不通過」）＋專屬 QR
- **關主**：鎖定關卡 → 掃描 QR → 通過／不通過

### 關卡

1. 龍門營地跳塔  
2. 血跡尋寶  
3. 創意鑰匙圈手作（通過前可驗證寶物 Code：`BEAR2026`）  
4. 神力布袋球積分賽  
5. 植物書籤  
6. 蒙眼漫步  
7. 捲捲棒棒糖  
8. 快問快答  

唯一鍵：`eventId + teamId + stationId`（已通過不重複計算）

## Apps Script 專案

https://script.google.com/home/projects/1cAMdi5hwkMLA5dKGdVR4wtya5mvelCQ1CuU5YKKSDBvMrY4PBHZgasNs/edit
