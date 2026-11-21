import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { locales, resolveRoute, routeHref, routeKeys } from "../src/routing.js";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const distClientDir = path.join(rootDir, "dist", "client");

function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function collectSchemaTypes(node, bucket = new Set()) {
  if (!node || typeof node !== "object") return bucket;
  if (Array.isArray(node)) {
    for (const item of node) collectSchemaTypes(item, bucket);
    return bucket;
  }
  if (node["@type"]) {
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    for (const t of types) {
      if (typeof t === "string") bucket.add(t);
    }
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") {
      collectSchemaTypes(value, bucket);
    }
  }
  return bucket;
}

function extractLinkTags(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
}

function getAttr(tag, attrName) {
  const regex = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i");
  const match = tag.match(regex);
  return match ? (match[1] ?? match[2] ?? "") : null;
}

test("routing module enforces bilingual symmetry and strict notFound resolution", () => {
  assert.deepEqual(locales, ["zh", "en"]);
  assert.deepEqual(routeKeys, ["products", "solutions", "quality", "about", "contact"]);

  for (const locale of locales) {
    for (const route of ["home", ...routeKeys]) {
      const href = routeHref(locale, route);
      assert.deepEqual(resolveRoute(href), { locale, route }, `Mismatch for ${href}`);
    }
  }

  for (const unknown of ["/zh/home", "/zh/missing", "/en/missing", "/zh/products/extra", "/unknown-page"]) {
    assert.equal(resolveRoute(unknown).route, "notFound", `Expected notFound for ${unknown}`);
  }
});

test("all 12 bilingual formal pages + root index + localized 404 static HTML files exist with valid metadata and hreflang", async () => {
  await access(path.join(distClientDir, "index.html"));

  for (const locale of ["zh", "en"]) {
    const expectedLang = locale === "zh" ? "zh-CN" : "en";
    const allRoutes = ["home", ...routeKeys];

    for (const route of allRoutes) {
      const urlPath = routeHref(locale, route); // e.g. /zh or /zh/products
      const relHtmlPath = `${urlPath.slice(1)}.html`; // e.g. zh.html or zh/products.html
      const fullPath = path.join(distClientDir, relHtmlPath);
      const html = await readFile(fullPath, "utf8");

      // 1. Correct <html lang="...">
      assert.match(
        html,
        new RegExp(`<html[^>]*\\blang=["']${expectedLang}["']`, "i"),
        `${relHtmlPath} must declare lang="${expectedLang}"`
      );

      // 2. Exactly one non-empty <h1>
      const h1Matches = [...html.matchAll(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/gi)];
      assert.equal(h1Matches.length, 1, `${relHtmlPath} must contain exactly 1 <h1>, found ${h1Matches.length}`);
      const h1Text = stripTags(h1Matches[0][1]);
      assert.ok(h1Text.length >= 2, `${relHtmlPath} <h1> must not be empty`);

      // 3. Non-empty <title> and <meta name="description">
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
      assert.ok(titleMatch && stripTags(titleMatch[1]).length >= 4, `${relHtmlPath} must have a non-empty <title>`);

      const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
      const descTag = metaTags.find((tag) => (getAttr(tag, "name") || "").toLowerCase() === "description");
      assert.ok(descTag, `${relHtmlPath} must contain <meta name="description">`);
      const descContent = (getAttr(descTag, "content") || "").trim();
      assert.ok(descContent.length >= 15, `${relHtmlPath} meta description is too short or empty: "${descContent}"`);

      // 4. Canonical & bidirectional hreflang (zh-CN / en / x-default)
      const linkTags = extractLinkTags(html);
      const canonicalTag = linkTags.find((tag) => (getAttr(tag, "rel") || "").toLowerCase() === "canonical");
      assert.ok(canonicalTag, `${relHtmlPath} must include <link rel="canonical">`);
      const canonicalHref = (getAttr(canonicalTag, "href") || "").trim();
      assert.ok(
        canonicalHref.startsWith("http://") || canonicalHref.startsWith("https://"),
        `${relHtmlPath} canonical href must be an absolute URL, got "${canonicalHref}"`
      );
      assert.ok(!canonicalHref.includes("127.0.0.1"), `${relHtmlPath} canonical must not point to 127.0.0.1`);
      assert.ok(canonicalHref.endsWith(urlPath), `${relHtmlPath} canonical "${canonicalHref}" should end with "${urlPath}"`);

      const alternates = linkTags.filter((tag) => (getAttr(tag, "rel") || "").toLowerCase() === "alternate");
      const hreflangMap = new Map();
      for (const tag of alternates) {
        const hl = getAttr(tag, "hreflang");
        const href = getAttr(tag, "href");
        if (hl) hreflangMap.set(hl, href);
      }

      const zhExpectedPath = routeHref("zh", route);
      const enExpectedPath = routeHref("en", route);

      assert.ok(hreflangMap.has("zh-CN"), `${relHtmlPath} missing hreflang="zh-CN"`);
      assert.ok(hreflangMap.has("en"), `${relHtmlPath} missing hreflang="en"`);
      assert.ok(hreflangMap.has("x-default"), `${relHtmlPath} missing hreflang="x-default"`);
      assert.ok(hreflangMap.get("zh-CN").endsWith(zhExpectedPath), `${relHtmlPath} hreflang="zh-CN" must end with ${zhExpectedPath}`);
      assert.ok(hreflangMap.get("en").endsWith(enExpectedPath), `${relHtmlPath} hreflang="en" must end with ${enExpectedPath}`);
      assert.ok(hreflangMap.get("x-default").endsWith(zhExpectedPath), `${relHtmlPath} hreflang="x-default" must end with ${zhExpectedPath}`);
    }

    // Localized 404 static HTML checks
    const notFoundPath = path.join(distClientDir, locale, "404.html");
    const notFoundHtml = await readFile(notFoundPath, "utf8");
    assert.match(
      notFoundHtml,
      new RegExp(`<html[^>]*\\blang=["']${expectedLang}["']`, "i"),
      `${locale}/404.html must declare lang="${expectedLang}"`
    );
    assert.match(notFoundHtml, /noindex/i, `${locale}/404.html must include noindex robots directive`);
    const nfLinks = extractLinkTags(notFoundHtml);
    const nfCanonical = nfLinks.find((tag) => (getAttr(tag, "rel") || "").toLowerCase() === "canonical");
    assert.equal(nfCanonical, undefined, `${locale}/404.html must NOT contain rel="canonical"`);
  }
});

test("all JSON-LD blocks across the 12 formal pages parse cleanly and cover required GEO schemas", async () => {
  const globalTypes = new Set();

  for (const locale of ["zh", "en"]) {
    for (const route of ["home", ...routeKeys]) {
      const urlPath = routeHref(locale, route);
      const relHtmlPath = `${urlPath.slice(1)}.html`;
      const html = await readFile(path.join(distClientDir, relHtmlPath), "utf8");

      const scriptMatches = [
        ...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
      ];
      assert.ok(scriptMatches.length >= 1, `${relHtmlPath} must contain at least one JSON-LD script block`);

      const pageTypes = new Set();
      for (const match of scriptMatches) {
        const rawJson = match[1].trim();
        assert.ok(rawJson.length > 0, `${relHtmlPath} has an empty JSON-LD script`);
        let parsed;
        assert.doesNotThrow(() => {
          parsed = JSON.parse(rawJson);
        }, `${relHtmlPath} contains invalid JSON-LD`);
        collectSchemaTypes(parsed, pageTypes);
        collectSchemaTypes(parsed, globalTypes);
      }

      assert.ok(pageTypes.has("Organization"), `${relHtmlPath} JSON-LD must include Organization`);
      assert.ok(pageTypes.has("WebSite"), `${relHtmlPath} JSON-LD must include WebSite`);

      if (route !== "home") {
        assert.ok(pageTypes.has("BreadcrumbList"), `${relHtmlPath} subpage JSON-LD must include BreadcrumbList`);
      }
      if (route === "products") {
        assert.ok(
          pageTypes.has("ItemList") || pageTypes.has("Product"),
          `${relHtmlPath} products page JSON-LD must include ItemList / Product`
        );
      }
      if (route === "solutions" || route === "quality") {
        assert.ok(pageTypes.has("FAQPage"), `${relHtmlPath} ${route} page JSON-LD must include FAQPage`);
      }
    }
  }

  for (const requiredType of ["Organization", "WebSite", "BreadcrumbList", "FAQPage"]) {
    assert.ok(globalTypes.has(requiredType), `Global JSON-LD graph missing schema @type "${requiredType}"`);
  }
  assert.ok(
    globalTypes.has("ItemList") || globalTypes.has("Product"),
    `Global JSON-LD graph must include "ItemList" or "Product"`
  );
});

test("llms.txt, llms-full.txt, robots.txt, sitemap.xml and 383-SKU catalog meet GEO specifications", async () => {
  const { BRANDS, PRODUCTS_CATALOG, CATALOG_STATS, searchProducts } = await import("../src/content/productsCatalog.js");
  const rawAudit = JSON.parse(await readFile(path.join(rootDir, "docs", "raw-oulink-data.json"), "utf8"));
  const rawProducts = rawAudit.products || rawAudit.catalog || [];

  // Verify catalog contract
  assert.equal(BRANDS.length, 17, `Expected 17 partner brands, got ${BRANDS.length}`);
  assert.equal(BRANDS.filter((b) => b.tier === "authorized").length, 5, "Expected 5 authorized brands");
  assert.equal(BRANDS.filter((b) => b.tier === "partner").length, 12, "Expected 12 partner brands");
  assert.equal(PRODUCTS_CATALOG.length, 383, `Expected 383 cleaned SKUs, got ${PRODUCTS_CATALOG.length}`);
  assert.equal(CATALOG_STATS.totalSkus, 383, "CATALOG_STATS.totalSkus should equal 383");

  // Verify every brand SVG exists in public and dist/client
  for (const brand of BRANDS) {
    assert.ok(brand.logoPath && brand.logoPath.endsWith(".svg"), `Brand ${brand.id} must use an SVG logoPath`);
    const relAsset = brand.logoPath.replace(/^\/+/, "");
    await access(path.join(rootDir, "public", relAsset));
    await access(path.join(distClientDir, relAsset));
  }

  // Verify fuzzy/prefix search contract
  const hit368500 = searchProducts("368500");
  const items368500 = Array.isArray(hit368500) ? hit368500 : hit368500.items;
  assert.ok(
    items368500.some((item) => item.mpn === "368500-1"),
    'searchProducts("368500") must match "368500-1"'
  );

  const hitBosch = searchProducts("1928404745");
  const itemsBosch = Array.isArray(hitBosch) ? hitBosch : hitBosch.items;
  assert.ok(
    itemsBosch.some((item) => item.mpn === "1928404745"),
    'searchProducts("1928404745") must match "1928404745"'
  );

  // Verify llms.txt & llms-full.txt
  const llmsTxt = await readFile(path.join(distClientDir, "llms.txt"), "utf8");
  const llmsFullTxt = await readFile(path.join(distClientDir, "llms-full.txt"), "utf8");

  assert.ok(llmsTxt.trim().length > 200, "llms.txt must be non-empty and substantial");
  assert.ok(llmsFullTxt.trim().length > 5000, "llms-full.txt must contain comprehensive engineering & SKU tables");

  for (const [name, content] of [
    ["llms.txt", llmsTxt],
    ["llms-full.txt", llmsFullTxt],
  ]) {
    assert.ok(content.includes("021-64778688"), `${name} must include verified phone 021-64778688`);
    assert.ok(
      content.includes("春申路") || content.includes("Chunshen"),
      `${name} must include verified Minhang Chunshen Rd address`
    );
    assert.ok(
      content.includes("闵行") || content.includes("Minhang"),
      `${name} must include Minhang district reference`
    );
  }

  // Every single one of the 383 MPNs must appear in llms-full.txt
  const missingMpns = [];
  for (const sku of PRODUCTS_CATALOG) {
    if (!llmsFullTxt.includes(sku.mpn)) {
      missingMpns.push(sku.mpn);
    }
  }
  assert.equal(
    missingMpns.length,
    0,
    `llms-full.txt is missing ${missingMpns.length} of 383 MPNs (sample: ${missingMpns.slice(0, 5).join(", ")})`
  );

  if (Array.isArray(rawProducts) && rawProducts.length === 383) {
    assert.equal(PRODUCTS_CATALOG.length, rawProducts.length);
  }

  // Verify robots.txt and sitemap.xml
  const robotsTxt = await readFile(path.join(distClientDir, "robots.txt"), "utf8");
  assert.ok(robotsTxt.includes("User-agent:"), "robots.txt must declare User-agent rules");

  const sitemapXml = await readFile(path.join(distClientDir, "sitemap.xml"), "utf8");
  assert.ok(sitemapXml.includes("<urlset"), "sitemap.xml must be valid XML urlset");
  assert.ok(!sitemapXml.includes("127.0.0.1:8899"), "sitemap.xml must never contain legacy 127.0.0.1:8899");
  assert.doesNotMatch(sitemapXml, /<loc>\s*\//, "sitemap.xml <loc> must not use relative paths");
});

test("all SVG vector assets in public/ and dist/client/ are strict XML-compliant with zero unescaped ampersands", async () => {
  const { readdir } = await import("node:fs/promises");

  async function collectSvgs(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const list = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) list.push(...(await collectSvgs(full)));
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".svg")) list.push(full);
    }
    return list;
  }

  const svgFiles = [
    ...(await collectSvgs(path.join(rootDir, "public"))),
    ...(await collectSvgs(distClientDir)),
  ];
  assert.ok(svgFiles.length >= 60, `Expected >= 60 SVG files across public/ and dist/client/, found ${svgFiles.length}`);

  const xmlViolations = [];
  for (const svgPath of svgFiles) {
    const raw = await readFile(svgPath, "utf8");
    // Strip XML comments before checking entity escaping in tags/text
    const withoutComments = raw.replace(/<!--[\s\S]*?-->/g, "");
    const badAmp = withoutComments.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/);
    if (badAmp) {
      xmlViolations.push(`${path.relative(rootDir, svgPath)} (unescaped '&' breaks browser <img> XML parser)`);
    }
  }

  assert.deepEqual(
    xmlViolations,
    [],
    `Broken XML in SVG asset(s):\n${xmlViolations.join("\n")}`
  );
});

