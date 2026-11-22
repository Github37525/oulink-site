import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";
import { verifyEditorialPhotosAndCadModels } from "../scripts/verify-assets-and-models.mjs";
import { CAD_MODELS_BY_CATEGORY, getCadModelForCategory } from "../src/content/cadModelsMeta.js";
import { locales, routeHref, routeKeys } from "../src/routing.js";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const distClientDir = path.join(rootDir, "dist", "client");

test("all 20 HD editorial .jpg photos and 5 Blender .glb CAD models pass binary & resolution checks", async () => {
  const report = await verifyEditorialPhotosAndCadModels({ checkDist: true });
  assert.equal(report.editorialCount, 20);
  assert.equal(report.glbModelCount, 5);

  const totalSubMeshes = report.modelReport.reduce((sum, m) => sum + m.subMeshes.length, 0);
  assert.equal(totalSubMeshes, 23, `Expected 23 total named sub-meshes across 5 GLB models, got ${totalSubMeshes}`);
});

test("cadModelsMeta exports all 6 product categories with Pin-to-Pin OEM cross-reference metadata", () => {
  const expectedCategories = [
    "connector-housings",
    "sealed-heavy-duty",
    "terminals-contacts",
    "seals-accessories",
    "power-distribution",
    "oem-cross-reference",
  ];
  assert.deepEqual(Object.keys(CAD_MODELS_BY_CATEGORY), expectedCategories);

  const oemMeta = getCadModelForCategory("oem-cross-reference");
  assert.equal(oemMeta.glbPath, "/assets/models/connector-housings.glb");
  assert.match(oemMeta.dimensions, /±0\.05\s*mm/);
  assert.match(oemMeta.ipRating, /Pin-to-Pin/i);
});

test("all 14 SSR prerendered route HTMLs exist and ConnectorCadViewer + ProductSpecTable export cleanly", async () => {
  // Verify all 14 prerendered route HTMLs (12 formal bilingual pages + zh/404.html + en/404.html) + root index/404
  const expectedHtmlRelPaths = [
    "index.html",
    "404.html",
    "zh/404.html",
    "en/404.html",
  ];
  for (const locale of locales) {
    for (const route of ["home", ...routeKeys]) {
      expectedHtmlRelPaths.push(`${routeHref(locale, route).slice(1)}.html`);
    }
  }
  assert.equal(
    expectedHtmlRelPaths.length,
    16,
    "Expected 14 localized route/404 HTMLs + root index.html + 404.html"
  );

  for (const rel of expectedHtmlRelPaths) {
    await access(path.join(distClientDir, rel));
  }

  // Verify prerendered home and products HTML include CAD workbench and 3D inspect buttons
  const zhHomeHtml = await readFile(path.join(distClientDir, "zh.html"), "utf8");
  const enHomeHtml = await readFile(path.join(distClientDir, "en.html"), "utf8");
  const zhProductsHtml = await readFile(path.join(distClientDir, "zh", "products.html"), "utf8");
  const enProductsHtml = await readFile(path.join(distClientDir, "en", "products.html"), "utf8");

  assert.ok(zhHomeHtml.includes("id=\"cad-workbench\""), "zh.html must prerender #cad-workbench section");
  assert.ok(enHomeHtml.includes("id=\"cad-workbench\""), "en.html must prerender #cad-workbench section");
  assert.ok(zhProductsHtml.includes("cad-workbench-sheet is-catalog-mode"), "zh/products.html must prerender linked catalog 3D inspector");
  assert.ok(zhProductsHtml.includes("inspect-3d-btn"), "zh/products.html must prerender per-SKU 3D inspect buttons");
  assert.ok(enProductsHtml.includes("inspect-3d-btn"), "en/products.html must prerender per-SKU 3D inspect buttons");

  // Verify SSR component exports via Vite module loader
  const server = await createServer({
    configFile: false,
    root: rootDir,
    esbuild: { jsx: "automatic" },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: "custom",
  });

  try {
    const cadViewerMod = await server.ssrLoadModule("/src/components/ConnectorCadViewer.jsx");
    const specTableMod = await server.ssrLoadModule("/src/components/ProductSpecTable.jsx");
    assert.equal(typeof cadViewerMod.ConnectorCadViewer, "function");
    assert.equal(typeof cadViewerMod.FALLBACK_CAD_MODELS_BY_CATEGORY, "object");
    assert.equal(typeof specTableMod.ProductSpecTable, "function");

    const ssrViewerHtml = renderToString(
      createElement(cadViewerMod.ConnectorCadViewer, {
        locale: "zh",
        variant: "home",
        categoryId: "sealed-heavy-duty",
        cadModelsMap: CAD_MODELS_BY_CATEGORY,
      })
    );
    assert.ok(ssrViewerHtml.includes("CAD-HD-IP6K9K"), "ConnectorCadViewer SSR must output active DWG code");
    assert.ok(ssrViewerHtml.includes("cad-static-fallback"), "ConnectorCadViewer SSR must output graceful static fallback");
  } finally {
    await server.close();
  }
});
