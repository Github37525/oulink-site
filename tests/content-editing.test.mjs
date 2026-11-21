import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

function findAndReplaceFirstString(targetObj, predicate, getReplacement, visited = new Set()) {
  if (!targetObj || typeof targetObj !== "object" || visited.has(targetObj)) return null;
  visited.add(targetObj);

  for (const key of Object.keys(targetObj)) {
    const val = targetObj[key];
    if (typeof val === "string" && predicate(key, val)) {
      const nextVal = getReplacement(val, key);
      targetObj[key] = nextVal;
      return { obj: targetObj, key, previous: val, next: nextVal };
    }
  }

  for (const key of Object.keys(targetObj)) {
    const val = targetObj[key];
    if (val && typeof val === "object") {
      const found = findAndReplaceFirstString(val, predicate, getReplacement, visited);
      if (found) return found;
    }
  }
  return null;
}

function renderApp(App, pathname) {
  return renderToString(
    createElement(App, {
      pathname,
      url: pathname,
      initialPath: pathname,
    })
  );
}

test("no-code configuration edits in siteContent and productsCatalog propagate immediately to SSR output without layout code changes", async () => {
  const server = await createServer({
    configFile: false,
    root: rootDir,
    esbuild: { jsx: "automatic" },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null },
    appType: "custom",
  });

  try {
    const siteContentMod = await server.ssrLoadModule("/src/content/siteContent.js");
    const catalogMod = await server.ssrLoadModule("/src/content/productsCatalog.js");
    const appMod = await server.ssrLoadModule("/src/App.jsx");

    const siteContent = siteContentMod.siteContent || siteContentMod.SITE_CONTENT || siteContentMod.default;
    const App = appMod.App || appMod.default;

    assert.ok(siteContent && typeof siteContent === "object", "siteContent.js must export a configuration object");
    assert.equal(typeof App, "function", "App.jsx must export the root React component");

    // 1. Verify createCatalogApi isolated custom catalog injection (zero layout changes)
    assert.equal(typeof catalogMod.createCatalogApi, "function", "productsCatalog.js must export createCatalogApi");
    const customApi = catalogMod.createCatalogApi(
      [
        {
          id: "custom-sku-1",
          mpn: "QA-CUSTOM-9988-A",
          brandId: "custom-brand",
          brandNameZh: "测试品牌",
          brandNameEn: "QA Custom Brand",
          categoryId: "housing",
          categoryZh: "汽车护套连接器",
          categoryEn: "Automotive Housing",
          series: "QA Series",
          stockQty: 8888,
          priceCny: 1.25,
          spq: 500,
          moq: 100,
          batchYear: "2026",
          specSummaryZh: "无代码配置注入验证用连接器",
          specSummaryEn: "Config-injected test connector",
          inStock: true,
        },
      ],
      [
        {
          id: "custom-brand",
          slug: "custom-brand",
          nameZh: "测试品牌",
          nameEn: "QA Custom Brand",
          tier: "authorized",
          tierLabelZh: "授权经销",
          tierLabelEn: "Authorized Distributor",
          logoPath: "/assets/brands/lear.svg",
          aspectRatio: "3:1",
          skuCount: 1,
          seriesSummaryZh: "测试系列",
          seriesSummaryEn: "Test Series",
          featured: true,
        },
      ]
    );
    const customSearch = customApi.searchProducts("QACUSTOM9988");
    const customItems = Array.isArray(customSearch) ? customSearch : customSearch.items;
    assert.equal(customItems.length, 1, "createCatalogApi must support hyphen-insensitive search over custom SKUs");
    assert.equal(customItems[0].mpn, "QA-CUSTOM-9988-A");

    // 2. Mutate only in-memory isolated SSR module cache to test no-code content editing
    // 2a. Replace primary brand logo path if configured in siteContent
    const logoMutation = findAndReplaceFirstString(
      siteContent,
      (_key, val) => val === "/assets/brand/oulink-logo.svg",
      () => "/assets/brand/custom-replaced-logo.svg"
    );

    // 2b. Replace hero headline in both zh and en
    for (const locale of ["zh", "en"]) {
      const localeBranch = siteContent[locale];
      assert.ok(localeBranch && typeof localeBranch === "object", `siteContent.${locale} must exist`);

      const initialHomeHtml = renderApp(App, `/${locale}`);
      const heroMutation = findAndReplaceFirstString(
        localeBranch,
        (key, val) =>
          val.length >= 6 &&
          /title|heading|headline/i.test(key) &&
          initialHomeHtml.includes(val),
        (_val) => `CONFIG_EDIT_HEADLINE_${locale.toUpperCase()}_2026`
      );

      assert.ok(
        heroMutation,
        `Could not locate an editable headline field in siteContent.${locale} that renders on /${locale}`
      );

      const updatedHomeHtml = renderApp(App, `/${locale}`);
      assert.ok(
        updatedHomeHtml.includes(heroMutation.next),
        `Updated headline "${heroMutation.next}" did not propagate to /${locale} SSR HTML`
      );
      assert.ok(
        !updatedHomeHtml.includes(heroMutation.previous),
        `Previous headline "${heroMutation.previous}" still lingered in /${locale} SSR HTML`
      );

      if (logoMutation) {
        assert.ok(
          updatedHomeHtml.includes("/assets/brand/custom-replaced-logo.svg"),
          `Updated brand logo path did not propagate to /${locale} SSR HTML`
        );
      }
    }

    // 3. Edit an existing SKU record in PRODUCTS_CATALOG and verify /zh/products & /en/products SSR reflect it immediately
    if (Array.isArray(catalogMod.PRODUCTS_CATALOG) && catalogMod.PRODUCTS_CATALOG.length > 0) {
      const targetSku = catalogMod.PRODUCTS_CATALOG[0];
      const originalMpn = targetSku.mpn;
      const syntheticMpn = "NOCODE-MPN-776655-Z";
      targetSku.mpn = syntheticMpn;
      try {
        const zhProductsHtml = renderApp(App, "/zh/products");
        const enProductsHtml = renderApp(App, "/en/products");
        assert.ok(
          zhProductsHtml.includes(syntheticMpn),
          `Editing SKU MPN to ${syntheticMpn} in PRODUCTS_CATALOG must immediately appear in /zh/products SSR output`
        );
        assert.ok(
          enProductsHtml.includes(syntheticMpn),
          `Editing SKU MPN to ${syntheticMpn} in PRODUCTS_CATALOG must immediately appear in /en/products SSR output`
        );
      } finally {
        targetSku.mpn = originalMpn;
      }
    }
  } finally {
    await server.close();
  }
});
