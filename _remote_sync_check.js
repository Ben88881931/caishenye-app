#!/usr/bin/env node
// 护栏：本地=远端 且 跟踪文件干净（防止"数据只更新到本地、没推送"）
const { execSync, execFileSync } = require("child_process");
const fs = require("fs");
function sh(cmd) { return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
const key = fs.existsSync(".deploy_key_tmp24") ? fs.realpathSync(".deploy_key_tmp24") : null;
const ssh = "C:/Program Files/Git/usr/bin/ssh.exe";
const remoteUrl = "ssh://git@ssh.github.com:443/Ben88881931/caishenye-app.git";
const env = Object.assign({}, process.env);
env.GIT_SSH_COMMAND = key
  ? `"${ssh}" -i "${key}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o ConnectTimeout=12`
  : `"${ssh}" -o ConnectTimeout=12`;
const safeDir = process.cwd().replace(/\\/g, "/");
const fails = [];
const check = (ok, label, extra) => { console.log((ok ? "PASS: " : "FAIL: ") + label + (extra ? "  [" + extra + "]" : "")); if (!ok) fails.push(label); };

const local = sh(`git -c safe.directory=${safeDir} rev-parse HEAD`);
const dirty = sh(`git -c safe.directory=${safeDir} status --porcelain=v1`).split("\n").filter((l) => /^ ?[MADRCU]/.test(l));
check(dirty.length === 0, "跟踪文件全部已提交（没有本地改动没推）", dirty.slice(0, 5).join(" | "));
let remote = "";
try {
  remote = execFileSync("git", ["-c", "safe.directory=" + safeDir, "ls-remote", remoteUrl, "refs/heads/main"],
    { encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] }).trim().split(/\s+/)[0];
} catch (e) { console.log("读取远端失败：" + (String(e.stderr || e.message).split("\n")[0] || "unknown").slice(0, 400)); }
// 取不到远端=没验证=不算通过（不允许静默放过）
check(!!remote, "能读到远端 main（网络/权限正常）", remote ? remote.slice(0, 7) : "读不到");
if (remote) check(remote === local, "本地 HEAD = 远端 main", "本地 " + local.slice(0, 7) + " / 远端 " + remote.slice(0, 7));
console.log("RESULT: " + (fails.length ? "FAILED " + fails.length : "ALL PASS"));
process.exit(fails.length ? 1 : 0);
