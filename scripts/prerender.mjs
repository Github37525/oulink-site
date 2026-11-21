import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";
import { siteContent } from "../src/content/siteContent.js";
import {
  BRANDS,
  PRODUCTS_CATALOG,
  createCatalogApi,
} from "../src/content/productsCatalog.js";
import { VERIFIED_COMPANY_FACTS } from "../src/content/claimLedger.js";
import { locales, routeKeys, routeHref } from "../src/routing.js";
import { buildStructuredData, serializeJsonLd } from "../src/seo/schemaBuilder.js";
import { buildRobotsTxt, buildSitemapXml } from "./generate-geo-files.mjs";

const outputDir = new URL("../dist/client/", import.meta.url);
const template = await readFile(new URL("index.html", outputDir), "utf8");

const rawOrigin = process.env.VITE_PUBLIC_ORIGIN;
const isPreviewEnv =
  process.env.OULINK_INDEXABLE === "false" ||
  (process.env.VERCEL_ENV === "preview" && process.env.OULINK_INDEXABLE !== "true");
const indexable = !isPreviewEnv;

const origin = (
  rawOrigin !== undefined
    ? rawOrigin.trim()
    : VERIFIED_COMPANY_FACTS.canonicalOrigin || "https://www.ou-link.com"
).replace(/\/+$/, "");

if (process.env.OULINK_INDEXABLE === "true" && (!origin || new URL(origin).protocol !== "https:")) {
  throw new Error("Indexable production builds require a valid HTTPS VITE_PUBLIC_ORIGIN");
}

const escapeAttr = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const catalogApi = createCatalogApi(PRODUCTS_CATALOG, BRANDS);
const homeFeaturedProducts = catalogApi.getFeaturedProducts(12);
const catalogFirstPageProducts = catalogApi.searchProducts("", { page: 1, pageSize: 24 }).items;

const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL("..", import.meta.url)),
  esbuild: { jsx: "automatic" },
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});

const renderedPaths = [];

try {
  const { App } = await server.ssrLoadModule("/src/App.jsx");

  for (const locale of locales) {
    const content = siteContent[locale];
    const brandName = locale === "zh" ? siteContent.brand.fullNameZh : siteContent.brand.fullNameEn;

    for (const route of ["home", ...routeKeys, "notFound"]) {
      const pathname = route === "notFound" ? `/${locale}/404` : routeHref(locale, route);
      const isNotFound = route === "notFound";
      const meta = isNotFound
        ? {
            title: `${content.notFound.title} — ${brandName}`,
            description: content.notFound.description,
          }
        : content.routes[route];

      const canonicalAndHreflang =
        origin && !isNotFound
          ? [
              `<link rel="canonical" href="${escapeAttr(origin + pathname)}" />`,
              `<link rel="alternate" hreflang="zh-CN" href="${escapeAttr(origin + routeHref("zh", route))}" />`,
              `<link rel="alternate" hreflang="en" href="${escapeAttr(origin + routeHref("en", route))}" />`,
              `<link rel="alternate" hreflang="x-default" href="${escapeAttr(origin + routeHref("zh", route))}" />`,
            ].join("\n    ")
          : "";

      const socialTags = !isNotFound
        ? [
            `<meta property="og:type" content="website" />`,
            `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
            `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
            `<meta property="og:locale" content="${locale === "zh" ? "zh_CN" : "en_US"}" />`,
            ...(origin ? [`<meta property="og:url" content="${escapeAttr(origin + pathname)}" />`] : []),
            `<meta name="twitter:card" content="summary" />`,
            `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
            `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
          ].join("\n    ")
        : "";

      const schemaPayload = !isNotFound
        ? buildStructuredData({
            locale,
            route,
            origin,
            content: siteContent,
            featuredProducts:
              route === "products" ? catalogFirstPageProducts : homeFeaturedProducts,
          })
        : null;

      const jsonLdScript = schemaPayload
        ? `<script type="application/ld+json">${serializeJsonLd(schemaPayload)}</script>`
        : "";

      const appHtml = renderToString(createElement(App, { pathname }));

      const extraHead = [canonicalAndHreflang, socialTags, jsonLdScript]
        .filter(Boolean)
        .join("\n    ");

      const html = template
        .replace(/<html lang="[^"]*">/, `<html lang="${locale === "zh" ? "zh-CN" : "en"}">`)
        .replace(/<title>.*?<\/title>/s, `<title>${escapeAttr(meta.title)}</title>`)
        .replace(
          /<meta name="description" content="[^"]*"\s*\/>/,
          `<meta name="description" content="${escapeAttr(meta.description)}" />`
        )
        .replace(
          /<meta name="robots" content="[^"]*"\s*\/>/,
          `<meta name="robots" content="${indexable && !isNotFound ? "index, follow" : "noindex, nofollow"}" />`
        )
        .replace(/\s*<link rel="(?:canonical|alternate)"[^>]*>/g, "")
        .replace("</head>", `    ${extraHead}\n  </head>`)
        .replace(
          '<div id="root"></div>',
          `<div id="root" data-prerendered="true" data-indexable="${indexable}" data-pathname="${pathname}">${appHtml}</div>`
        );

      const targetFile = new URL(`${pathname.slice(1)}.html`, outputDir);
      await mkdir(new URL(".", targetFile), { recursive: true });
      await writeFile(targetFile, html, "utf8");

      if (locale === "zh" && route === "home") {
        await writeFile(new URL("index.html", outputDir), html, "utf8");
      }
      if (locale === "zh" && isNotFound) {
        await writeFile(new URL("404.html", outputDir), html, "utf8");
      }
      if (!isNotFound) {
        renderedPaths.push(pathname);
      }
    }
  }
} finally {
  await server.close();
}

await writeFile(new URL("robots.txt", outputDir), buildRobotsTxt(indexable, origin), "utf8");
await writeFile(new URL("sitemap.xml", outputDir), buildSitemapXml(indexable, origin), "utf8");

console.log(
  `Prerendered ${renderedPaths.length} bilingual pages + localized 404 pages. Origin: ${
    origin || "(none)"
  }, Indexable: ${indexable}.`
);
