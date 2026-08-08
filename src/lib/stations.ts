/** 雨備關卡定義（學員進度格與關主鎖定共用） */
export const EVENT_ID = "event-brown-bear-2026";
export const EVENT_NAME = "棕熊營闖關活動（雨備）";

export const STATION_DEFS = [
  {
    order: 1,
    name: "SDGs大富翁（秀佩）",
    shortName: "SDGs大富翁",
  },
  {
    order: 2,
    name: "扭蛋尋寶+小隊練習（玉華）",
    shortName: "扭蛋尋寶",
  },
  {
    order: 3,
    name: "擰一擰水乾了（八導）",
    shortName: "擰一擰水乾了",
  },
  {
    order: 4,
    name: "彩虹泡泡棒（雅文）",
    shortName: "彩虹泡泡棒",
  },
  {
    order: 5,
    name: "汽球不倒翁（雅文／世勳・星宿海）",
    shortName: "汽球不倒翁",
  },
  {
    order: 6,
    name: "泡泡接力賽_聯結之鑰（雯薰）",
    shortName: "泡泡接力賽",
  },
] as const;

export const TEAM_EMBLEMS = ["龍", "虎", "鳳", "鷹", "狼", "熊", "鯊", "隼"] as const;
