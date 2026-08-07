const fs = require("fs");
const path = require("path");

const codePath = path.join(__dirname, "..", "google-apps-script", "Code.gs");
const b64 = fs.readFileSync(codePath).toString("base64");
const out = path.join(process.env.TEMP || "/tmp", "gas-inject.js");

const js = `(() => {
  const b64 = ${JSON.stringify(b64)};
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const code = new TextDecoder().decode(bytes);
  const model = window.monaco.editor.getModels()[0];
  model.setValue(code);
  return { ok: true, length: code.length, head: code.slice(0, 60) };
})()`;

fs.writeFileSync(out, js, "utf8");
console.log(out);
console.log("length", js.length);
