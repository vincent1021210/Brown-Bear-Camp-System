const fs = require("fs");
const path = require("path");
const http = require("http");

const code = fs.readFileSync(
  path.join(__dirname, "..", "google-apps-script", "Code.gs"),
  "utf8",
);

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.url === "/code" || req.url === "/") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(code);
    return;
  }
  res.statusCode = 404;
  res.end("not found");
});

server.listen(8765, "127.0.0.1", () => {
  console.log("ready http://127.0.0.1:8765/code");
});
