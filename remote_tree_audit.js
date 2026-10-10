const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const repo = "Ben88881931/caishenye-app";
const branch = process.env.AUDIT_BRANCH || "main";
const criticalFiles = [
  "SUPERVISOR_WORKFLOW.md",
  "app.js",
  "index.html",
  "styles.css",
  "lottery_data.json",
  "data.js",
  "prediction_snapshots.json",
  "snapshots.js",
  "号码走势图.html"
];

function blobSha(file) {
  const data = fs.readFileSync(file);
  const raw = Buffer.concat([Buffer.from("blob " + data.length + "\0"), data]);
  return crypto.createHash("sha1").update(raw).digest("hex");
}

async function main() {
  const headers = { "User-Agent": "caishenye-remote-tree-audit" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = "Bearer " + process.env.GITHUB_TOKEN;
  const url = "https://api.github.com/repos/" + repo + "/git/trees/" + branch + "?recursive=1";
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) throw new Error("GitHub tree API failed: " + response.status);
  const payload = await response.json();
  const remote = new Map((payload.tree || []).map((item) => [item.path, item]));
  const errors = [];

  (payload.tree || []).forEach((item) => {
    if (/^"|"$|\\[0-7]{3}|[\r\n\t]/.test(item.path)) {
      errors.push("远端出现转义/引号伪文件名: " + JSON.stringify(item.path));
    }
  });

  criticalFiles.forEach((file) => {
    const remoteItem = remote.get(file);
    if (!remoteItem) {
      errors.push("远端缺少精确文件: " + file);
      return;
    }
    const localPath = path.join(__dirname, file);
    if (!fs.existsSync(localPath)) {
      errors.push("本地缺少精确文件: " + file);
      return;
    }
    const localSha = blobSha(localPath);
    if (remoteItem.sha !== localSha) {
      errors.push("文件哈希不一致: " + file + " remote=" + remoteItem.sha + " local=" + localSha);
    }
  });

  if (errors.length) {
    console.error("REMOTE TREE AUDIT FAILED");
    errors.forEach((error) => console.error(" - " + error));
    process.exit(1);
  }

  console.log("REMOTE TREE AUDIT PASSED: " + criticalFiles.length + " critical files exact and hash-matched");
}

main().catch((error) => {
  console.error("REMOTE TREE AUDIT FAILED");
  console.error(" - " + error.message);
  process.exit(1);
});
