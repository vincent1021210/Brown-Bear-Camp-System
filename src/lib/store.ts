/**
 * 闖關進度資料庫：透過 Google Apps Script + Spreadsheet。
 * 實作細節見 ./gas.ts 與 /google-apps-script/Code.gs
 */
export {
  listBootstrap,
  getTeamProgress,
  parseTeamQr,
  checkInTeam,
  verifyTreasureCode,
  recordAttempt,
  lockStation,
  resetDb,
} from "./gas";
