import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] || "dist");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const tarballs = fs.readdirSync(dist).filter((file) => file.endsWith(".tgz"));
if (tarballs.length !== 1) {
  console.error(`expected exactly one tarball in ${dist}, found ${tarballs.length}`);
  process.exit(1);
}

const tarball = tarballs[0];
const tarballPath = path.join(dist, tarball);
const sha256 = createHash("sha256").update(fs.readFileSync(tarballPath)).digest("hex");
const npmVersion = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
const binEntrypoints = Object.keys(pkg.bin || {}).length;
const commandCount = Object.keys(pkg.bin || {}).filter((name) => name !== "zhulong").length;
const metadata = {
  package: `${pkg.name}@${pkg.version}`,
  tarball,
  sha256,
  node: process.version,
  npm: npmVersion,
  commandCount,
  binEntrypoints,
  commit: process.env.GITHUB_SHA || "local",
  repository: pkg.repository?.url || null,
};

fs.writeFileSync(path.join(dist, "release-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
fs.writeFileSync(path.join(dist, "release-metadata.md"), [
  "## Zhulong 发布元数据",
  "",
  `- 包：\`${metadata.package}\``,
  `- 制品：\`${tarball}\``,
  `- SHA-256：\`${sha256}\``,
  `- Node.js：\`${metadata.node}\``,
  `- npm：\`${npmVersion}\``,
  `- 命令面：\`${commandCount}\` 条（${binEntrypoints} 个 npm bin 入口）`,
  `- Commit：\`${metadata.commit}\``,
  "",
].join("\n"));
console.log(`release metadata PASS tarball=${tarball} sha256=${sha256}`);
