// scripts/update-version-json.js
import { execSync } from "child_process";
import fs from "fs";

const APK_URL = "https://nexovisionai.com/apk/DataCollector.apk";
const OUTPUT_FILE = "./dist/version.json";

const command =
  "npx eas build:list --platform android --limit 1 --json --non-interactive";

const builds = JSON.parse(execSync(command).toString());

if (!builds.length) {
  throw new Error("No Android builds found");
}

const latest = builds[0];

const versionData = {
  version: latest.appVersion,                 
  versionCode: Number(latest.appBuildVersion),
  apkUrl: APK_URL,
  forceUpdate: true
};

fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(versionData, null, 2));

console.log("Version.json generated:");
console.log(versionData);
