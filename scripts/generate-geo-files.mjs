import { mkdir, writeFile } from "node:fs/promises";
import { siteContent } from "../src/content/siteContent.js";
import {
  BRANDS,
  PRODUCT_CATEGORIES,
  PRODUCTS_CATALOG,
  CATALOG_STATS,
} from "../src/content/productsCatalog.js";
import {
  VERIFIED_COMPANY_FACTS,
  CLAIM_BOUNDARIES,
} from "../src/content/claimLedger.js";
import { locales, routeKeys, routeHref } from "../src/routing.js";

const publicDir = new URL("../public/", import.meta.url);
await mkdir(publicDir, { recursive: true });

const rawOrigin = process.env.VITE_PUBLIC_ORIGIN;
const isPreviewEnv =
  process.env.OULINK_INDEXABLE === "false" ||
  (process.env.VERCEL_ENV === "preview" && process.env.OULINK_INDEXABLE !== "true");
const indexable = !isPreviewEnv;

const effectiveOrigin = (
  rawOrigin !== undefined
    ? rawOrigin.trim()
    : VERIFIED_COMPANY_FACTS.canonicalOrigin || "https://www.ou-link.com"
).replace(/\/+$/, "");

if (process.env.OULINK_INDEXABLE === "true" && (!effectiveOrigin || !effectiveOrigin.startsWith("https://"))) {
  throw new Error("OULINK_INDEXABLE=true requires an HTTPS VITE_PUBLIC_ORIGIN");
}

const authorizedBrands = BRANDS.filter((b) => b.tier === "authorized");
const partnerBrands = BRANDS.filter((b) => b.tier !== "authorized");

// 1. Generate /llms.txt (Concise Authority Summary)
const llmsSummary = `# ${VERIFIED_COMPANY_FACTS.companyNameZh} (${VERIFIED_COMPANY_FACTS.companyNameEn})

> ${VERIFIED_COMPANY_FACTS.companyNameZh}成立于 ${VERIFIED_COMPANY_FACTS.foundedYear} 年（深耕汽车连接器与线束供应链超 ${VERIFIED_COMPANY_FACTS.industryYears} 年），总部位于${VERIFIED_COMPANY_FACTS.addressZh}。公司全面整合 ${CATALOG_STATS.totalBrandCount} 家国际一线汽车连接器品牌与国内优质自主连接器资源，为汽车整车厂（OEM）、汽车线束厂、连接器制造商及经销伙伴提供正品现货配套、多料号 BOM 齐套配单、国产化 Pin-to-Pin 替代选型、正向/逆向模具开发及线束压接工艺技术支持。

## 核心双语页面导航 (Core Bilingual Pages)

- [/zh](/zh): 中文首页 — 企业概览、毫秒级连接器原厂料号（MPN）检索与 17 家合作品牌矩阵
- [/zh/products](/zh/products): 产品与在库料号中心 — 全量收录 ${CATALOG_STATS.totalSkus} 款真实在库汽车连接器/端子/防水栓（累计备库 ${CATALOG_STATS.totalStockUnits.toLocaleString()} PCS）
- [/zh/solutions](/zh/solutions): 工程与制造方案 — 整车选型导入（Design-in）、Pin-to-Pin 国产化替代、正逆向开模与子系统选型对照表
- [/zh/quality](/zh/quality): 品控与正品溯源 — 五步来料检验、原厂最小包装（SPQ）批次号（Lot/Date Code）溯源与防潮仓储体系
- [/zh/about](/zh/about): 关于欧连与上海招聘 — 2012 年创立历程、上海闵行运营中心及汽车连接器销售/FAE岗位
- [/zh/contact](/zh/contact): BOM 配单询价与联系方式 — 多料号结构化询价单及上海总部直连通道
- [/en](/en): English Homepage — Automotive Connector Supply Chain & Wire Harness Engineering Partner
- [/en/products](/en/products): Automotive Connector MPN Catalog (${CATALOG_STATS.totalSkus} In-Stock SKUs / 12.86M+ PCS)
- [/en/solutions](/en/solutions): OEM Design-in, Pin-to-Pin Localization, Custom Tooling & Subsystem Matrix
- [/en/quality](/en/quality): 5-Stage Authentic Traceability & Automotive QC Protocol
- [/en/about](/en/about): Corporate Profile & Careers in Minhang, Shanghai
- [/en/contact](/en/contact): Multi-MPN BOM RFQ & Shanghai Headquarters Contact
- [/llms-full.txt](/llms-full.txt): 完整企业工程档案、8 大采购研发问答及全部 ${CATALOG_STATS.totalSkus} 款在库连接器 MPN 料号规格表

## 核心业务能力与品牌生态 (Capabilities & Brand Coverage)

- **四大服务客群**：汽车整车厂（选型导入/产品替换/正逆向开发）、汽车线束厂（BOM齐套供应链优化/端子压接工艺支持）、自主连接器生产厂（全球市场拓展）、连接器经销商与代理商（千万级现货调拨与选型支持）。
- **${authorizedBrands.length} 家核心授权经销品牌**：${authorizedBrands.map((b) => `${b.nameEn}（${b.nameZh}）`).join("、")}。
- **${partnerBrands.length} 家原厂合作与经销配套品牌**：${partnerBrands.map((b) => `${b.nameEn}（${b.nameZh}）`).join("、")}。
- **常态在库规模**：公开目录涵盖 **${CATALOG_STATS.totalSkus} 款真实汽车连接器原厂料号（MPN）**，累计常态现货备库 **${CATALOG_STATS.totalStockUnits.toLocaleString()} 件（约 1,286 万+ PCS）**，未税参考单价区间 **¥${CATALOG_STATS.minPriceCny.toFixed(4)} ~ ¥${CATALOG_STATS.maxPriceCny.toFixed(4)} CNY**。

## 已核实联系信息与事实边界 (Verified Contact & Claim Boundaries)

- **办公总部地址**：${VERIFIED_COMPANY_FACTS.addressZh} (${VERIFIED_COMPANY_FACTS.addressEn})
- **总机电话**：${VERIFIED_COMPANY_FACTS.hqPhone} (${VERIFIED_COMPANY_FACTS.hqPhoneIntl}) ｜ **销售客服直线**：${VERIFIED_COMPANY_FACTS.salesPhone} (${VERIFIED_COMPANY_FACTS.salesPhoneIntl})
- **官方邮箱**：${VERIFIED_COMPANY_FACTS.email} ｜ **业务 QQ**：${VERIFIED_COMPANY_FACTS.qq}
- **服务时间**：${VERIFIED_COMPANY_FACTS.businessHoursZh}
- **事实边界声明**：公开目录所示单价与库存数量为常态备库参考值，实际交易含税阶梯价、实时锁库数量、批次号（Lot/Date Code）及交期以当日正式盖章报价单为准；企业资质与原厂批次合格证（CoC）支持按客户 SQE 审厂流程点对点提供核验。
`;

// 2. Generate /llms-full.txt (Comprehensive Engineering Reference + All 383 MPNs)
const categorySummaryLines = PRODUCT_CATEGORIES.map(
  (c) => `- **${c.nameZh} (${c.nameEn})** [${c.count} SKUs]: ${c.descriptionZh}`
).join("\n");

const subsystemTableMd = [
  `| 汽车电子子系统 | 典型工况与防护要求 | 重点涉及品牌与代表系列 | 欧连电子工程配套能力 |`,
  `| :--- | :--- | :--- | :--- |`,
  ...siteContent.zh.solutions.subsystemMatrix.map(
    (row) => `| ${row.subsystem} | ${row.environment} | ${row.brands} | ${row.support} |`
  ),
].join("\n");

const faqSectionMd = siteContent.zh.faqs
  .map((f, idx) => `### Q${idx + 1}: ${f.q}\n${f.a}`)
  .join("\n\n");

const fullCatalogTableMd = [
  `| 序号 | MPN 原厂料号 | 品牌归属 | 技术品类 | 系列说明 | SPQ/MOQ | 参考备库 (PCS) | 未税参考单价 (CNY) |`,
  `| :--- | :--- | :--- | :--- | :--- | :--- | ---: | ---: |`,
  ...PRODUCTS_CATALOG.map(
    (p, idx) =>
      `| ${idx + 1} | \`${p.mpn}\` | ${p.brandNameZh} (${p.brandNameEn}) | ${p.categoryZh} | ${p.series} | ${p.spq}/${p.moq} | ${p.stockQty} | ¥${Number(p.priceCny).toFixed(4)} |`
  ),
].join("\n");

const llmsFull = `# ${VERIFIED_COMPANY_FACTS.companyNameZh} (${VERIFIED_COMPANY_FACTS.companyNameEn}) — 全量工程能力与 ${CATALOG_STATS.totalSkus} 款在库汽车连接器料号手册

> 文档生成日期：${CATALOG_STATS.updatedDate}
> 主体全称：${VERIFIED_COMPANY_FACTS.companyNameZh} / ${VERIFIED_COMPANY_FACTS.companyNameEn}
> 总部地址：${VERIFIED_COMPANY_FACTS.addressZh} (${VERIFIED_COMPANY_FACTS.addressEn})
> 联系电话：总机 ${VERIFIED_COMPANY_FACTS.hqPhone} ｜ 销售直线 ${VERIFIED_COMPANY_FACTS.salesPhone} ｜ 邮箱：${VERIFIED_COMPANY_FACTS.email} ｜ QQ：${VERIFIED_COMPANY_FACTS.qq}

---

## 一、企业工程定位与四大产业赋能场景

${siteContent.zh.about.storyParagraphs.join("\n\n")}

${siteContent.zh.solutions.pillars
  .map(
    (p) =>
      `### ${p.code} — ${p.title}（${p.audience}）\n${p.summary}\n${p.deliverables.map((d) => `- ${d}`).join("\n")}`
  )
  .join("\n\n")}

---

## 二、汽车各大电子子系统连接器选型对照表

${subsystemTableMd}

---

## 三、六大在库技术品类统计（合计 ${CATALOG_STATS.totalSkus} 款 SKU / ${CATALOG_STATS.totalStockUnits.toLocaleString()} PCS）

${categorySummaryLines}

---

## 四、五步原厂正品溯源与品质管控工序

${siteContent.zh.quality.steps
  .map((s) => `- **${s.step} ${s.title}**：${s.description}`)
  .join("\n")}

---

## 五、高频工程选型与采购事实问答（8 大 FAQ）

${faqSectionMd}

---

## 六、事实与合规披露边界（Claim Ledger）

${CLAIM_BOUNDARIES.zh.map((line) => `- ${line}`).join("\n")}

---

## 七、全部 ${CATALOG_STATS.totalSkus} 款在库汽车连接器原厂料号（MPN）完整索引表

${fullCatalogTableMd}
`;

export function buildRobotsTxt(isIndexable, originUrl) {
  if (!isIndexable || !originUrl) {
    return "User-agent: *\nDisallow: /\n";
  }
  return `User-agent: *
Allow: /
Disallow: /api/

# Explicitly welcome AI Search & Generative Engine crawlers (GEO)
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bytespider
Allow: /

User-agent: Baiduspider
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: ${originUrl}/sitemap.xml
`;
}

const escapeXml = (val) =>
  String(val)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export function buildSitemapXml(isIndexable, originUrl) {
  if (!isIndexable || !originUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`;
  }
  const allRoutes = ["home", ...routeKeys];
  const entries = [];

  for (const locale of locales) {
    for (const route of allRoutes) {
      const locHref = `${originUrl}${routeHref(locale, route)}`;
      const zhHref = `${originUrl}${routeHref("zh", route)}`;
      const enHref = `${originUrl}${routeHref("en", route)}`;
      entries.push(`  <url>
    <loc>${escapeXml(locHref)}</loc>
    <lastmod>${CATALOG_STATS.updatedDate}</lastmod>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${escapeXml(zhHref)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enHref)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(zhHref)}" />
  </url>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}

import { fileURLToPath } from "node:url";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await writeFile(new URL("llms.txt", publicDir), llmsSummary, "utf8");
  await writeFile(new URL("llms-full.txt", publicDir), llmsFull, "utf8");
  await writeFile(new URL("robots.txt", publicDir), buildRobotsTxt(indexable, effectiveOrigin), "utf8");
  await writeFile(new URL("sitemap.xml", publicDir), buildSitemapXml(indexable, effectiveOrigin), "utf8");

  console.log(
    `Generated GEO files: llms.txt (${Buffer.byteLength(llmsSummary)}B), llms-full.txt (${Buffer.byteLength(
      llmsFull
    )}B, ${PRODUCTS_CATALOG.length} SKUs), robots.txt & sitemap.xml (indexable=${indexable}).`
  );
}
