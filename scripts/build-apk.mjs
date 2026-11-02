// Builds the signed Android APK (a thin native shell around the deployed site).
//
// Usage:
//   npm run apk
//
// Gradle needs Java 21 (Capacitor 8) and the Android SDK. This script finds
// both automatically on Windows and fails with a clear message if either is
// missing, instead of leaving you with a cryptic Gradle error.

import { existsSync, readdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = join(import.meta.dirname, "..");
const androidDir = join(root, "android");

function findJdk21() {
  if (process.env.JAVA_HOME?.includes("21")) return process.env.JAVA_HOME;
  const adoptium = "C:\\Program Files\\Eclipse Adoptium";
  if (existsSync(adoptium)) {
    const match = readdirSync(adoptium).find((name) => name.startsWith("jdk-21"));
    if (match) return join(adoptium, match);
  }
  return null;
}

const javaHome = findJdk21();
if (!javaHome) {
  console.error(
    "Java 21 not found. Install it with:\n" +
      "  winget install --id EclipseAdoptium.Temurin.21.JDK",
  );
  process.exit(1);
}

const sdkRoot =
  process.env.ANDROID_HOME ??
  join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
if (!existsSync(sdkRoot)) {
  console.error(
    `Android SDK not found at ${sdkRoot}.\n` +
      "Install Android Studio, or the command-line tools from https://developer.android.com/tools/sdkmanager",
  );
  process.exit(1);
}

// Gradle reads the SDK location from android/local.properties (gitignored).
writeFileSync(
  join(androidDir, "local.properties"),
  `sdk.dir=${sdkRoot.replaceAll("\\", "/")}\n`,
);

console.log(`JAVA_HOME    ${javaHome}`);
console.log(`ANDROID_HOME ${sdkRoot}\n`);

const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const result = spawnSync(`"${join(androidDir, gradlew)}" assembleRelease`, {
  cwd: androidDir,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
  },
});

if (result.status !== 0) process.exit(result.status ?? 1);

// Drop a copy in the repo root so it is easy to send to a phone.
const built = join(androidDir, "app", "build", "outputs", "apk", "release", "app-release.apk");
if (existsSync(built)) {
  const out = join(root, "TindahanPOS-v1.0.apk");
  copyFileSync(built, out);
  console.log(`\nAPK ready: ${out}`);
}
