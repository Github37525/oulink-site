import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

const MANDATORY_FORBIDDEN_TERMS = [
  "孙悟空",
  "北京市自主创新",
  "移动式同步架车机",
  "安全生产许可证",
  "诚信守约施工企业",
  "工作地点：广州市",
  "蓝牙耳机",
  "鼠标封面",
  "VIVO手机",
  "社交账号登录",
  "javascript:;",
  "127.0.0.1:8899",
  "noimg.png",
  "0000-00-00",
  "罗森博格",
  "赫尔斯曼",
  "赫尔思曼",
];

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".html",
  ".css",
  ".svg",
  ".txt",
  ".xml",
  ".json",
  ".md",
]);

async function walkFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

test("claimLedger module exports verified company facts, boundaries, and complete forbidden blacklist", async () => {
  const ledger = await import("../src/content/claimLedger.js");

  assert.ok(Array.isArray(ledger.FORBIDDEN_LEGACY_TERMS), "FORBIDDEN_LEGACY_TERMS must be an array");
  for (const term of MANDATORY_FORBIDDEN_TERMS) {
    assert.ok(
      ledger.FORBIDDEN_LEGACY_TERMS.includes(term),
      `claimLedger.js FORBIDDEN_LEGACY_TERMS must include "${term}"`
    );
  }

  assert.ok(ledger.VERIFIED_COMPANY_FACTS && typeof ledger.VERIFIED_COMPANY_FACTS === "object", "Missing VERIFIED_COMPANY_FACTS");
  const factsJson = JSON.stringify(ledger.VERIFIED_COMPANY_FACTS);
  assert.ok(factsJson.includes("021-64778688"), "VERIFIED_COMPANY_FACTS must contain 021-64778688");
  assert.ok(factsJson.includes("021-64809788"), "VERIFIED_COMPANY_FACTS must contain 021-64809788");
  assert.ok(factsJson.includes("service@ou-link.com"), "VERIFIED_COMPANY_FACTS must contain service@ou-link.com");
  assert.ok(factsJson.includes("春申路2525弄"), "VERIFIED_COMPANY_FACTS must contain Minhang street address");

  assert.ok(ledger.CLAIM_BOUNDARIES && typeof ledger.CLAIM_BOUNDARIES === "object", "Missing CLAIM_BOUNDARIES");
  assert.ok(Array.isArray(ledger.CLAIM_BOUNDARIES.zh) && ledger.CLAIM_BOUNDARIES.zh.length > 0, "CLAIM_BOUNDARIES.zh must be a non-empty array");
  assert.ok(Array.isArray(ledger.CLAIM_BOUNDARIES.en) && ledger.CLAIM_BOUNDARIES.en.length > 0, "CLAIM_BOUNDARIES.en must be a non-empty array");
});

test("zero forbidden legacy fabrications, dead links, or brand typos exist anywhere in src/, api/, public/, or dist/", async () => {
  const ledger = await import("../src/content/claimLedger.js");
  const allForbidden = [...new Set([...MANDATORY_FORBIDDEN_TERMS, ...(ledger.FORBIDDEN_LEGACY_TERMS || [])])];

  const excludedFile = path.normalize(path.join(rootDir, "src", "content", "claimLedger.js"));
  const scanDirs = ["src", "api", "public", "dist"].map((d) => path.join(rootDir, d));

  const violations = [];
  let scannedCount = 0;

  for (const dir of scanDirs) {
    const files = await walkFiles(dir);
    for (const filePath of files) {
      const normalized = path.normalize(filePath);
      if (normalized === excludedFile) continue;

      const relPath = path.relative(rootDir, normalized);
      const baseName = path.basename(normalized).toLowerCase();

      // Check file names too (e.g. noimg.png)
      for (const term of allForbidden) {
        if (baseName.includes(term.toLowerCase())) {
          violations.push(`${relPath} (filename contains forbidden term "${term}")`);
        }
      }

      const ext = path.extname(normalized).toLowerCase();
      if (!TEXT_EXTENSIONS.has(ext)) continue;

      scannedCount += 1;
      const content = await readFile(normalized, "utf8");
      for (const term of allForbidden) {
        const idx = content.indexOf(term);
        if (idx !== -1) {
          const snippet = content.slice(Math.max(0, idx - 25), Math.min(content.length, idx + term.length + 25)).replace(/\s+/g, " ");
          violations.push(`${relPath} -> matched "${term}" near: ...${snippet}...`);
        }
      }
    }
  }

  assert.ok(scannedCount >= 20, `Expected to scan at least 20 source/dist files, only scanned ${scannedCount}`);
  assert.deepEqual(
    violations,
    [],
    `Claim Ledger integrity violation(s) detected:\n${violations.join("\n")}`
  );
});
