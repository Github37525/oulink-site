/**
 * 一次性/可重复运行的图片降采样与 WebP 优化脚本
 * - 保留所有原始 .jpg 与 .svg 文件（100% 兼容现有单测与外部链接）
 * - 将 public/assets/editorial/*.jpg（20 张）按全站最大显示尺寸的 2x Retina 分辨率生成同目录 .webp
 * - 将 public/assets/brand/oulink-logo.svg 与 oulink-logo-dark.svg 内嵌 Base64 大图导出为轻量化 .webp
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

// 20 张 editorial 图片的 2x Retina 目标最大宽度（按原图纵横比等比缩放，绝不放大）
const EDITORIAL_MAX_WIDTH = {
  "home-hero-connector.jpg": 960,
  "cat-housing.jpg": 640,
  "cat-terminal.jpg": 640,
  "cat-seal-lock.jpg": 640,
  "cat-heavy.jpg": 640,
  "cat-seal.jpg": 640,
  "cat-lock.jpg": 640,
  "home-harness.jpg": 1026,
  "products-hero.jpg": 1254,
  "solutions-hero.jpg": 1284,
  "solutions-bom-kit.jpg": 1338,
  "solutions-caliper.jpg": 1356,
  "solutions-system-latch.jpg": 906,
  "quality-hero-lot.jpg": 1238,
  "quality-iqc-loupe.jpg": 560,
  "quality-warehouse.jpg": 560,
  "quality-barcode-scan.jpg": 560,
  "about-workbench-wide.jpg": 1920,
  "contact-hero-connector.jpg": 1362,
  "contact-sidebar-connector.jpg": 750,
};

const BRAND_LOGOS = [
  { svg: "public/assets/brand/oulink-logo.svg", webp: "public/assets/brand/oulink-logo.webp", maxWidth: 300 },
  { svg: "public/assets/brand/oulink-logo-dark.svg", webp: "public/assets/brand/oulink-logo-dark.webp", maxWidth: 300 },
];

const pyCode = `
import base64, io, json, os, re, sys
from PIL import Image

cfg = json.loads(sys.stdin.read())
root = cfg["root"]
editorial_targets = cfg["editorial"]
brand_logos = cfg["brandLogos"]

results = {"editorial": [], "logos": []}

ed_dir = os.path.join(root, "public", "assets", "editorial")
for fname, max_w in sorted(editorial_targets.items()):
    src_path = os.path.join(ed_dir, fname)
    if not os.path.exists(src_path):
        continue
    dst_name = os.path.splitext(fname)[0] + ".webp"
    dst_path = os.path.join(ed_dir, dst_name)
    src_bytes = os.path.getsize(src_path)
    with Image.open(src_path) as im:
        orig_w, orig_h = im.size
        im = im.convert("RGB")
        if orig_w > max_w:
            new_h = max(1, round(orig_h * (max_w / orig_w)))
            im = im.resize((max_w, new_h), Image.Resampling.LANCZOS)
        new_w, new_h = im.size
        im.save(dst_path, "WEBP", quality=80, method=6)
    dst_bytes = os.path.getsize(dst_path)
    results["editorial"].append({
        "name": fname,
        "webp": dst_name,
        "srcKB": round(src_bytes / 1024, 1),
        "dstKB": round(dst_bytes / 1024, 1),
        "origDim": f"{orig_w}x{orig_h}",
        "newDim": f"{new_w}x{new_h}",
    })

for item in brand_logos:
    svg_path = os.path.join(root, item["svg"])
    webp_path = os.path.join(root, item["webp"])
    if not os.path.exists(svg_path):
        continue
    svg_text = open(svg_path, "r", encoding="utf-8").read()
    m = re.search(r"data:image/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=\\s]+)", svg_text)
    if not m:
        continue
    raw = base64.b64decode(re.sub(r"\\s+", "", m.group(1)))
    src_bytes = os.path.getsize(svg_path)
    with Image.open(io.BytesIO(raw)) as im:
        orig_w, orig_h = im.size
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA")
        max_w = item["maxWidth"]
        if orig_w > max_w:
            new_h = max(1, round(orig_h * (max_w / orig_w)))
            im = im.resize((max_w, new_h), Image.Resampling.LANCZOS)
        new_w, new_h = im.size
        im.save(webp_path, "WEBP", quality=82, method=6)
    dst_bytes = os.path.getsize(webp_path)
    results["logos"].append({
        "name": os.path.basename(svg_path),
        "webp": os.path.basename(webp_path),
        "srcKB": round(src_bytes / 1024, 1),
        "dstKB": round(dst_bytes / 1024, 1),
        "origDim": f"{orig_w}x{orig_h}",
        "newDim": f"{new_w}x{new_h}",
    })

print(json.dumps(results, ensure_ascii=False))
`;

const stdout = execFileSync("python", ["-c", pyCode], {
  input: JSON.stringify({
    root: rootDir,
    editorial: EDITORIAL_MAX_WIDTH,
    brandLogos: BRAND_LOGOS,
  }),
  encoding: "utf8",
});

const report = JSON.parse(stdout);

let edSrcSum = 0;
let edDstSum = 0;
console.log("=== Editorial Images (20 JPG -> 2x Retina WebP) ===");
for (const row of report.editorial) {
  edSrcSum += row.srcKB;
  edDstSum += row.dstKB;
  const pct = (((row.srcKB - row.dstKB) / row.srcKB) * 100).toFixed(1);
  console.log(
    `${row.name.padEnd(32)} ${String(row.srcKB).padStart(6)} KB (${row.origDim.padEnd(9)}) -> ${String(row.dstKB).padStart(5)} KB (${row.newDim.padEnd(9)}) | -${pct}%`
  );
}
console.log(
  `EDITORIAL TOTAL: ${edSrcSum.toFixed(1)} KB -> ${edDstSum.toFixed(1)} KB (-${(((edSrcSum - edDstSum) / edSrcSum) * 100).toFixed(1)}%)`
);

let logoSrcSum = 0;
let logoDstSum = 0;
console.log("\n=== Brand Logos (Base64 SVG -> WebP) ===");
for (const row of report.logos) {
  logoSrcSum += row.srcKB;
  logoDstSum += row.dstKB;
  const pct = (((row.srcKB - row.dstKB) / row.srcKB) * 100).toFixed(1);
  console.log(
    `${row.name.padEnd(24)} ${String(row.srcKB).padStart(6)} KB (${row.origDim.padEnd(9)}) -> ${String(row.dstKB).padStart(5)} KB (${row.newDim.padEnd(9)}) | -${pct}%`
  );
}
console.log(
  `LOGO TOTAL: ${logoSrcSum.toFixed(1)} KB -> ${logoDstSum.toFixed(1)} KB (-${(((logoSrcSum - logoDstSum) / logoSrcSum) * 100).toFixed(1)}%)`
);
