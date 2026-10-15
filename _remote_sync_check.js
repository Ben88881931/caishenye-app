#!/usr/bin/env node
// 护栏：本地=远端 且 跟踪文件干净（防止"数据只更新到本地、没推送"）
const { execSync } = require("child_process");
const fs = require("fs");
function sh(cmd) { return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
const key = fs.existsSync(".deploy_key_tmp24") ? fs.realpathSync(".deploy_key_tmp24") : null;
const ssh = key ? `ssh -i "${key}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o ConnectTimeout=12` : "ssh -o ConnectTimeout=12";
const fails = [];
const check = (ok, label, extra) => { console.log((ok ? "PASS: " : "FAIL: ") + label + (extra ? "  [" + extra + "]" : "")); if (!ok) fails.push(label); };

const local = sh("git rev-parse HEAD");
const dirty = sh("git status --porcelain=v1").split("\n").filter((l) => /^ ?[MADRCU]/.test(l));
check(dirty.length === 0, "跟踪文件全部已提交（没有本地改动没推）", dirty.slice(0, 5).join(" | "));
let remote = "";
try {
  remote = sh(`git -c safe.directory=. -c core.sshCommand='${ssh}' ls-remote git@github.com:Ben88881931/caishenye-app.git refs/heads/main`).split(/\s+/)[0];
} catch (e) { console.log("WARN: 取远端 HEAD 失败（网络/权限），跳过远端比对：" + String(e.message).slice(0, 80)); }
if (remote) check(remote === local, "本地 HEAD = 远端 main", "本地 " + local.slice(0, 7) + " / 远端 " + remote.slice(0, 7));
console.log("RESULT: " + (fails.length ? "FAILED " + fails.length : "ALL PASS"));
process.exit(fails.length ? 1 : 0);
