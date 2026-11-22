import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { locales, routeHref, routeKeys } from "../src/routing.js";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const distClientDir = path.join(rootDir, "dist", "client");
const qaDir = path.join(rootDir, "qa");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
};

async function loadChromium() {
  try {
    const pw = await import("playwright");
    return pw.chromium;
  } catch {
    const pwTest = await import("@playwright/test");
    return pwTest.chromium;
  }
}

function resolveWindowsBrowserCandidates() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH && existsSync(process.env.PLAYWRIGHT_EXECUTABLE_PATH)) {
    candidates.push(process.env.PLAYWRIGHT_EXECUTABLE_PATH);
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const msPlaywrightDir = path.join(localAppData, "ms-playwright");
    if (existsSync(msPlaywrightDir)) {
      const chromiumDirs = readdirSync(msPlaywrightDir)
        .filter((d) => d.startsWith("chromium-"))
        .sort()
        .reverse();
      for (const dir of chromiumDirs) {
        for (const sub of ["chrome-win64", "chrome-win"]) {
          const exe = path.join(msPlaywrightDir, dir, sub, "chrome.exe");
          if (existsSync(exe)) candidates.push(exe);
        }
      }
    }
  }

  for (const sysExe of [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ]) {
    if (existsSync(sysExe)) candidates.push(sysExe);
  }

  return [...new Set(candidates)];
}

async function launchBrowser(chromium) {
  const launchArgs = [
    "--disable-gpu-sandbox",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--no-default-browser-check",
  ];
  try {
    const browser = await chromium.launch({ headless: true, args: launchArgs });
    return { browser, executable: "playwright-bundled-chromium" };
  } catch (defaultErr) {
    const candidates = resolveWindowsBrowserCandidates();
    for (const executablePath of candidates) {
      try {
        const browser = await chromium.launch({
          headless: true,
          executablePath,
          args: launchArgs,
        });
        return { browser, executable: executablePath };
      } catch {
        // try next candidate
      }
    }
    throw defaultErr;
  }
}

async function startLocalStaticServer() {
  const inquiryMod = await import("../api/inquiry.js");
  const notFoundMod = await import("../api/not-found.js");
  const inquiryHandler = inquiryMod.default;
  const notFoundHandler = notFoundMod.default;

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
      const pathname = decodeURIComponent(parsedUrl.pathname);

      // Serverless API routes
      if (pathname === "/api/inquiry") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const rawBody = Buffer.concat(chunks).toString("utf8");
        req.body = rawBody;
        await inquiryHandler(req, res);
        return;
      }

      if (pathname === "/api/not-found") {
        await notFoundHandler(req, res);
        return;
      }

      // Resolve static file under dist/client (with cleanUrls: true)
      const normalizedRel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      const candidatePaths = [
        path.join(distClientDir, normalizedRel),
        path.join(distClientDir, `${normalizedRel}.html`),
        path.join(distClientDir, normalizedRel, "index.html"),
      ];

      for (const filePath of candidatePaths) {
        const resolved = path.resolve(filePath);
        if (!resolved.startsWith(path.resolve(distClientDir))) continue;
        try {
          const info = await stat(resolved);
          if (info.isFile()) {
            const ext = path.extname(resolved).toLowerCase();
            const contentType = MIME_TYPES[ext] || "application/octet-stream";
            res.statusCode = 200;
            res.setHeader("Content-Type", contentType);
            res.setHeader("X-Content-Type-Options", "nosniff");
            if (req.method === "HEAD") {
              res.end();
            } else {
              const data = await readFile(resolved);
              res.end(data);
            }
            return;
          }
        } catch {
          // continue searching
        }
      }

      // Fallback to localized 404 handler (matching vercel.json rewrites)
      const fallbackLocale = pathname.startsWith("/en/") || pathname === "/en" ? "en" : "zh";
      req.url = `/api/not-found?locale=${fallbackLocale}`;
      req.query = { locale: fallbackLocale };
      await notFoundHandler(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(String(err?.stack || err));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const addr = server.address();
  return {
    server,
    baseURL: `http://127.0.0.1:${addr.port}`,
  };
}

/**
 * Capture compositor screenshot of a WebGL <canvas> locator and compute pixel density & signature
 * to strictly prove non-blank 3D rendering and real visual updates across modes.
 */
async function analyzeCanvasScreenshot(page, canvasLocator) {
  await canvasLocator.waitFor({ state: "visible", timeout: 8000 });
  const pngBuf = await canvasLocator.screenshot({ type: "png" });
  const base64Png = pngBuf.toString("base64");

  return page.evaluate(async (b64) => {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = `data:image/png;base64,${b64}`;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);

    // Sample corner background color (avoiding 4px corner fiducials)
    const sampleIdx = (Math.min(10, h - 1) * w + Math.min(10, w - 1)) * 4;
    const bgR = data[sampleIdx];
    const bgG = data[sampleIdx + 1];
    const bgB = data[sampleIdx + 2];

    let nonBgPixels = 0;
    let hash = 2166136261;
    const totalPixels = w * h;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      if (a > 10 && diff > 20) {
        nonBgPixels += 1;
      }
      // Sample every 13th pixel into FNV-1a checksum
      if ((i & 52) === 0) {
        hash ^= (r << 16) ^ (g << 8) ^ b;
        hash = Math.imul(hash, 16777619) >>> 0;
      }
    }

    return {
      width: w,
      height: h,
      nonBgPixels,
      nonBgRatio: totalPixels > 0 ? Number((nonBgPixels / totalPixels).toFixed(4)) : 0,
      signature: hash.toString(16).padStart(8, "0"),
    };
  }, base64Png);
}

async function main() {
  await mkdir(qaDir, { recursive: true });

  let localServer = null;
  let baseURL = process.env.QA_BASE_URL || "";
  if (!baseURL) {
    localServer = await startLocalStaticServer();
    baseURL = localServer.baseURL;
  }

  const chromium = await loadChromium();
  const { browser, executable } = await launchBrowser(chromium);

  const viewportMatrix = [];
  const interactionChecks = {};
  const noJsChecks = [];
  const failures = [];

  const viewports = [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ];

  try {
    // =========================================================================
    // 1. Multi-Viewport Matrix (1440px / 768px / 390px / 320px) across 12 pages
    // =========================================================================
    for (const vp of viewports) {
      const context = await browser.newContext({ viewport: vp });
      const page = await context.newPage();

      const runtimeErrors = [];
      const failedAssets = [];

      page.on("pageerror", (err) => runtimeErrors.push(`pageerror: ${err.message}`));
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          runtimeErrors.push(`console.error: ${msg.text()}`);
        }
      });
      page.on("response", (res) => {
        const url = res.url();
        if (url.startsWith(baseURL) && !url.includes("/api/") && res.status() >= 400) {
          failedAssets.push(`${res.status()} ${url.replace(baseURL, "")}`);
        }
      });

      for (const locale of locales) {
        const expectedLang = locale === "zh" ? "zh-CN" : "en";
        for (const route of ["home", ...routeKeys]) {
          const routePath = routeHref(locale, route);
          runtimeErrors.length = 0;
          failedAssets.length = 0;

          const response = await page.goto(`${baseURL}${routePath}`, { waitUntil: "networkidle" });
          await page.waitForSelector("main h1, h1", { timeout: 5000 });
          if (route === "home" || route === "products") {
            await page
              .locator(".cad-static-fallback.is-ready-hidden")
              .first()
              .waitFor({ state: "attached", timeout: 8000 });
            await page.waitForTimeout(180);
          }

          const audit = await page.evaluate(() => {
            const docEl = document.documentElement;
            const bodyStyle = getComputedStyle(document.body);
            const htmlStyle = getComputedStyle(docEl);
            const shellEl = document.querySelector(".site-shell, #root > div");
            const shellBg = shellEl ? getComputedStyle(shellEl).backgroundColor : "";

            // Image & SVG completeness check
            const imgs = [...document.images];
            const brokenImages = imgs
              .filter((img) => !img.complete || img.naturalWidth <= 0)
              .map((img) => img.getAttribute("src") || "(empty src)");

            // Image 2.6 /assets/editorial/ real industrial photography completeness check
            const editorialImgs = imgs.filter((img) => (img.getAttribute("src") || "").includes("/assets/editorial/"));
            const brokenEditorialImages = editorialImgs
              .filter((img) => !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0)
              .map((img) => img.getAttribute("src") || "(empty src)");
            const editorialPaths = editorialImgs.map((img) => img.getAttribute("src") || "");

            // Legacy flat SVG illustration & cyber/navy palette leak check
            const legacyFlatIllustrations = imgs
              .filter((img) => (img.getAttribute("src") || "").includes("/assets/quality/"))
              .map((img) => img.getAttribute("src") || "");

            const forbiddenRgb = new Set([
              "rgb(2, 176, 238)",   // legacy cyber blue #02B0EE
              "rgb(9, 33, 67)",     // legacy navy #092143
              "rgb(254, 106, 8)",   // legacy electric orange #FE6A08
              "rgb(239, 243, 247)", // legacy cold canvas #EFF3F7
            ]);
            const legacyPaletteLeaks = [];
            for (const [label, el] of [
              ["html", docEl],
              ["body", document.body],
              ["shell", shellEl],
              ["header", document.querySelector("header")],
              ["footer", document.querySelector("footer")],
            ]) {
              if (!el) continue;
              const cs = getComputedStyle(el);
              for (const prop of ["backgroundColor", "color", "borderTopColor", "borderBottomColor"]) {
                const val = cs[prop];
                if (forbiddenRgb.has(val)) {
                  legacyPaletteLeaks.push(`${label}.${prop}=${val}`);
                }
              }
            }

            // Partner brand SVGs distortion check
            const brandImgs = imgs.filter((img) => (img.getAttribute("src") || "").includes("/assets/brands/"));
            const distortedBrands = [];
            for (const img of brandImgs) {
              const rect = img.getBoundingClientRect();
              if (rect.width <= 0 || rect.height <= 0) continue;
              const style = getComputedStyle(img);
              const naturalRatio = img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 3;
              const renderedRatio = rect.width / rect.height;
              // If object-fit is neither 'contain' nor 'scale-down', rendered aspect ratio must closely match naturalRatio (3:1)
              if (
                style.objectFit !== "contain" &&
                style.objectFit !== "scale-down" &&
                Math.abs(renderedRatio - naturalRatio) > 0.45
              ) {
                distortedBrands.push(
                  `${img.getAttribute("src")} rendered ${rect.width.toFixed(1)}x${rect.height.toFixed(1)} (objectFit=${style.objectFit})`
                );
              }
            }

            // Card text clipping check (detect accidental overflow:hidden cutting off bottom text)
            const cardSelectors =
              "[class*='card'], [class*='brand-item'], [class*='brand-card'], [class*='stat'], [class*='pillar'], [class*='step']";
            const clippedCards = [];
            for (const card of document.querySelectorAll(cardSelectors)) {
              const cs = getComputedStyle(card);
              if (cs.display === "none" || cs.visibility === "hidden") continue;
              const rect = card.getBoundingClientRect();
              if (rect.height <= 0 || rect.width <= 0) continue;
              if (
                (cs.overflowY === "hidden" || cs.overflow === "hidden") &&
                card.scrollHeight > card.clientHeight + 4
              ) {
                clippedCards.push(
                  `${card.tagName.toLowerCase()}.${(card.className || "").toString().split(" ")[0]} (scrollH=${card.scrollHeight} > clientH=${card.clientHeight})`
                );
              }
            }

            const jsDeadLinks = [...document.querySelectorAll("a[href]")].filter((a) =>
              (a.getAttribute("href") || "").trim().toLowerCase().startsWith("javascript:")
            ).length;

            return {
              title: document.title,
              lang: docEl.lang,
              h1Count: document.querySelectorAll("h1").length,
              h1Text: document.querySelector("h1")?.textContent?.trim() || "",
              scrollWidth: docEl.scrollWidth,
              innerWidth: window.innerWidth,
              horizontalOverflow: docEl.scrollWidth > window.innerWidth,
              bodyBg: bodyStyle.backgroundColor,
              htmlBg: htmlStyle.backgroundColor,
              shellBg,
              totalImages: imgs.length,
              brokenImages,
              editorialImgCount: editorialImgs.length,
              editorialPaths,
              brokenEditorialImages,
              legacyFlatIllustrations,
              legacyPaletteLeaks,
              brandSvgCount: brandImgs.length,
              distortedBrands,
              clippedCards,
              jsDeadLinks,
            };
          });

          const record = {
            width: vp.width,
            path: routePath,
            status: response?.status() ?? 0,
            ...audit,
            runtimeErrors: [...runtimeErrors],
            failedAssets: [...failedAssets],
          };
          viewportMatrix.push(record);

          try {
            assert.equal(record.status, 200, `Expected HTTP 200, got ${record.status}`);
            assert.equal(record.lang, expectedLang, `Expected lang="${expectedLang}", got "${record.lang}"`);
            assert.equal(record.h1Count, 1, `Expected exactly 1 <h1>, got ${record.h1Count}`);
            assert.ok(record.h1Text.length >= 2, "<h1> text is empty");
            assert.equal(
              record.horizontalOverflow,
              false,
              `Horizontal overflow detected: scrollWidth(${record.scrollWidth}) > innerWidth(${record.innerWidth})`
            );
            assert.deepEqual(record.brokenImages, [], `Broken images: ${record.brokenImages.join(", ")}`);
            assert.ok(
              record.editorialImgCount >= 1,
              `Page ${routePath} must display at least 1 /assets/editorial/*.jpg photograph, found ${record.editorialImgCount}`
            );
            assert.deepEqual(
              record.brokenEditorialImages,
              [],
              `Broken /assets/editorial/ images: ${record.brokenEditorialImages.join(", ")}`
            );
            assert.deepEqual(
              record.legacyFlatIllustrations,
              [],
              `Legacy flat SVG illustrations still referenced: ${record.legacyFlatIllustrations.join(", ")}`
            );
            assert.deepEqual(
              record.legacyPaletteLeaks,
              [],
              `Legacy cyber-blue / navy palette leaked: ${record.legacyPaletteLeaks.join(", ")}`
            );
            assert.deepEqual(record.distortedBrands, [], `Distorted brand SVGs: ${record.distortedBrands.join("; ")}`);
            assert.deepEqual(record.clippedCards, [], `Clipped card containers: ${record.clippedCards.join("; ")}`);
            assert.equal(record.jsDeadLinks, 0, `Found ${record.jsDeadLinks} javascript: dead link(s)`);
            assert.deepEqual(record.runtimeErrors, [], `Runtime errors: ${record.runtimeErrors.join(" | ")}`);
            assert.deepEqual(record.failedAssets, [], `Failed assets: ${record.failedAssets.join(", ")}`);

            const canvasMatchesVi = [record.bodyBg, record.htmlBg, record.shellBg].includes("rgb(246, 245, 241)");
            assert.equal(
              canvasMatchesVi,
              true,
              `Main canvas background must match Image 2.6 warm paper #F6F5F1 rgb(246, 245, 241), got body=${record.bodyBg}, html=${record.htmlBg}, shell=${record.shellBg}`
            );

            if (route === "home") {
              assert.ok(
                record.brandSvgCount >= 17,
                `Home page ${routePath} should display all 17 partner brand SVGs, found ${record.brandSvgCount}`
              );
            }
          } catch (err) {
            failures.push(`[Viewport ${vp.width}px ${routePath}] ${err.message}`);
          }

          // Capture key desktop & mobile screenshots to qa/
          if (vp.width === 1440 && ["home", "products", "solutions", "quality", "about", "contact"].includes(route)) {
            if (locale === "zh" || route === "home" || route === "products" || route === "contact") {
              await page.screenshot({
                path: path.join(qaDir, `${locale}-${route}-1440.png`),
                fullPage: true,
              });
            }
          }
          if (vp.width === 390 && (route === "home" || (locale === "zh" && route === "products"))) {
            await page.screenshot({
              path: path.join(qaDir, `${locale}-${route}-390.png`),
              fullPage: true,
            });
          }
        }
      }

      // =======================================================================
      // 2. Mobile 390px Hamburger Menu Open / Navigate / Close Verification
      // =======================================================================
      if (vp.width === 390) {
        try {
          await page.goto(`${baseURL}/zh`, { waitUntil: "networkidle" });
          const menuBtn = page
            .locator(
              "header button[aria-expanded], header .menu-button, header .mobile-menu-toggle, header button[aria-label*='菜单'], header button[aria-label*='导航'], header button[aria-label*='Menu']"
            )
            .first();
          await menuBtn.waitFor({ state: "visible", timeout: 5000 });

          const beforeExpanded = await menuBtn.getAttribute("aria-expanded");
          await menuBtn.click();
          await page.waitForTimeout(200);

          const afterExpanded = await menuBtn.getAttribute("aria-expanded");
          if (beforeExpanded !== null) {
            assert.equal(afterExpanded, "true", "Mobile menu button aria-expanded should become 'true' when opened");
          }

          await page.screenshot({ path: path.join(qaDir, "zh-mobile-menu-390.png") });

          // Click navigation link inside mobile menu to go to /zh/products
          const productsNavLink = page.locator("a[href='/zh/products']:visible").first();
          await productsNavLink.click();
          await page.waitForURL("**/zh/products", { timeout: 5000 });

          // Re-open and close via Escape or toggle button
          await menuBtn.click();
          await page.waitForTimeout(150);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(150);
          let closedExpanded = await menuBtn.getAttribute("aria-expanded");
          if (closedExpanded === "true") {
            await menuBtn.click();
            await page.waitForTimeout(150);
            closedExpanded = await menuBtn.getAttribute("aria-expanded");
          }
          if (closedExpanded !== null) {
            assert.equal(closedExpanded, "false", "Mobile menu button aria-expanded should return to 'false' after close");
          }

          interactionChecks.mobileMenu390 = { passed: true };
        } catch (err) {
          interactionChecks.mobileMenu390 = { passed: false, error: err.message };
          failures.push(`[Mobile Menu 390px] ${err.message}`);
        }
      }

      // =======================================================================
      // 3. Fuzzy MPN Search (368500 -> 368500-1) & BOM Cart -> /zh/contact Flow
      // =======================================================================
      if (vp.width === 1440) {
        try {
          // Step 0: Verify homepage (/zh) hero search inline dropdown fuzzy matches "368500" -> "368500-1"
          await page.goto(`${baseURL}/zh`, { waitUntil: "networkidle" });
          const heroSearchInput = page.locator("main input[type='search'], main .mpn-search-input").first();
          await heroSearchInput.waitFor({ state: "visible", timeout: 5000 });
          await heroSearchInput.fill("368500");
          await page.waitForFunction(
            () => document.body.innerText.includes("368500-1"),
            { timeout: 5000 }
          );

          await page.goto(`${baseURL}/zh/products`, { waitUntil: "networkidle" });

          const searchInput = page
            .locator(
              "main input[type='search'], main input[type='text'], input[placeholder*='368500'], input[placeholder*='192840'], input[placeholder*='型号'], input[placeholder*='料号'], input[placeholder*='MPN']"
            )
            .first();
          await searchInput.waitFor({ state: "visible", timeout: 5000 });

          // Step A: Fuzzy search "368500" -> must match "368500-1"
          await searchInput.fill("368500");
          await page.waitForFunction(
            () => document.body.innerText.includes("368500-1"),
            { timeout: 5000 }
          );
          const matchedFuzzy = await page.locator("main").innerText();
          assert.ok(
            matchedFuzzy.includes("368500-1"),
            'Searching "368500" must fuzzy-match and display "368500-1"'
          );

          // Step B: Search "1928404745", click "+ BOM", navigate to /zh/contact and verify auto-fill
          await searchInput.fill("1928404745");
          await page.waitForFunction(
            () => document.body.innerText.includes("1928404745"),
            { timeout: 5000 }
          );

          const addBomBtn = page
            .locator("main button")
            .filter({ hasText: /\+\s*BOM|加入.*BOM|加入配单|加入询价|Add.*BOM/i })
            .first();
          await addBomBtn.waitFor({ state: "visible", timeout: 5000 });
          await addBomBtn.click();
          await page.waitForTimeout(250);

          // Navigate to /zh/contact via BOM CTA link/button if visible, else standard header link
          const bomProceedLink = page
            .locator("a[href*='/zh/contact'], button")
            .filter({ hasText: /带入.*询价|前往.*询价|提交.*询价|立即询价|配单询价|Proceed|Inquir/i })
            .first();

          if ((await bomProceedLink.count()) > 0 && (await bomProceedLink.isVisible())) {
            await bomProceedLink.click();
          } else {
            await page.locator("a[href='/zh/contact']").first().click();
          }
          await page.waitForURL("**/zh/contact*", { timeout: 5000 });
          await page.waitForTimeout(300);

          const contactBomState = await page.evaluate(() => {
            const form = document.querySelector("main form") || document.querySelector("main");
            const fieldValues = [...document.querySelectorAll("input, textarea")].map((el) => el.value || "");
            const formText = form ? form.innerText : "";
            return {
              hasInInputValues: fieldValues.some((v) => v.includes("1928404745")),
              hasInFormText: formText.includes("1928404745"),
              sampleValues: fieldValues.filter(Boolean),
            };
          });

          assert.equal(
            contactBomState.hasInInputValues || contactBomState.hasInFormText,
            true,
            `MPN 1928404745 added to BOM was NOT carried into /zh/contact form (inputs=${JSON.stringify(contactBomState.sampleValues)})`
          );

          await page.screenshot({
            path: path.join(qaDir, "zh-contact-bom-1440.png"),
            fullPage: true,
          });

          // Step C: Verify honest 503 fallback UI when submitting RFQ without backend email/webhook keys
          const nameField = page.locator("main form input[name='name'], main form input[type='text']").first();
          const contactField = page
            .locator("main form input[name='contact'], main form input[type='tel'], main form input[type='email']")
            .first();
          if ((await nameField.count()) > 0 && (await contactField.count()) > 0) {
            await nameField.fill("张工");
            await contactField.fill("13800138000");
            const submitBtn = page.locator("main form button[type='submit']").first();
            await submitBtn.click();
            await page.waitForTimeout(400);
            const fallbackVisible = await page.evaluate(() => {
              const txt = document.querySelector("main")?.innerText || "";
              return txt.includes("service@ou-link.com") && txt.includes("021-64778688");
            });
            assert.equal(fallbackVisible, true, "503 honest fallback must guide user to service@ou-link.com & 021-64778688");
          }

          // Verify real HTTP 404 on unknown route
          const res404Zh = await page.goto(`${baseURL}/zh/non-existent-connector-route`);
          assert.equal(res404Zh?.status(), 404, "Unknown /zh/* route must return HTTP 404");
          const res404En = await page.goto(`${baseURL}/en/non-existent-connector-route`);
          assert.equal(res404En?.status(), 404, "Unknown /en/* route must return HTTP 404");

          // Step D: Verify all 20 /assets/editorial/*.jpg photographs decode cleanly with naturalWidth > 0
          await page.goto(`${baseURL}/zh`, { waitUntil: "domcontentloaded" });
          const specJson = JSON.parse(await readFile(path.join(rootDir, "docs", "image26-design-spec.json"), "utf8"));
          const expectedEditorialPaths = (specJson.editorialAssets || []).map((a) => a.publicPath);
          assert.ok(
            expectedEditorialPaths.length >= 20,
            `Expected >= 20 editorial assets in docs/image26-design-spec.json, got ${expectedEditorialPaths.length}`
          );
          const editorialDecodeCheck = await page.evaluate(async (paths) => {
            const results = [];
            for (const src of paths) {
              const probe = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ src, ok: img.naturalWidth > 0 && img.naturalHeight > 0, w: img.naturalWidth, h: img.naturalHeight });
                img.onerror = () => resolve({ src, ok: false, w: 0, h: 0 });
                img.src = src;
              });
              results.push(probe);
            }
            return results;
          }, expectedEditorialPaths);
          const failedEditorialProbes = editorialDecodeCheck.filter((r) => !r.ok).map((r) => r.src);
          assert.deepEqual(
            failedEditorialProbes,
            [],
            `Editorial photographs failed browser decode: ${failedEditorialProbes.join(", ")}`
          );
          const lowResEditorialProbes = editorialDecodeCheck
            .filter((r) => {
              const minW = r.src.includes("/cat-") ? 1000 : 1400;
              return r.w < minW;
            })
            .map((r) => `${r.src} (${r.w}x${r.h})`);
          assert.deepEqual(
            lowResEditorialProbes,
            [],
            `Low-resolution editorial photos remained: ${lowResEditorialProbes.join(", ")}`
          );

          interactionChecks.searchAndBomFlow = {
            passed: true,
            heroFuzzySearch368500Matched: true,
            fuzzySearch368500Matched: true,
            bomAutoFilled1928404745: true,
            hasInInputValues: contactBomState.hasInInputValues,
            contactBomScreenshot: "qa/zh-contact-bom-1440.png",
            honest503FallbackVerified: true,
            real404Verified: true,
            editorialAssetsDecodedCount: editorialDecodeCheck.length,
            editorialMinWidthPx: Math.min(...editorialDecodeCheck.map((r) => r.w)),
            editorialMaxWidthPx: Math.max(...editorialDecodeCheck.map((r) => r.w)),
          };
        } catch (err) {
          interactionChecks.searchAndBomFlow = { passed: false, error: err.message };
          failures.push(`[Search & BOM Flow] ${err.message}`);
        }

        // =====================================================================
        // 3B. Three.js 3D CAD Workbench & Linked Product Catalog Flow (1440px)
        // =====================================================================
        try {
          runtimeErrors.length = 0;
          failedAssets.length = 0;

          // --- Part 1: /zh Home 3D CAD Wireframe, Exploded View, X-Ray & Solid ---
          await page.setViewportSize({ width: 1440, height: 1020 });
          await page.goto(`${baseURL}/zh`, { waitUntil: "networkidle" });
          await page
            .locator("#cad-workbench .cad-static-fallback.is-ready-hidden")
            .waitFor({ state: "attached", timeout: 8000 });

          const homeWorkbench = page.locator("#cad-workbench");
          await homeWorkbench.scrollIntoViewIfNeeded();
          await page.evaluate(() => {
            const el = document.getElementById("cad-workbench");
            if (el) {
              const top = el.getBoundingClientRect().top + window.scrollY - 52;
              window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
            }
          });
          await page.waitForTimeout(300);

          const homeCanvas = page.locator("#cad-workbench .cad-canvas-mount canvas").first();
          const wireframeStats = await analyzeCanvasScreenshot(page, homeCanvas);
          assert.ok(
            wireframeStats.width >= 300 && wireframeStats.height >= 220,
            `Home 3D <canvas> too small: ${wireframeStats.width}x${wireframeStats.height}`
          );
          assert.ok(
            wireframeStats.nonBgRatio >= 0.02,
            `Home 3D Wireframe <canvas> appears blank (nonBgRatio=${wireframeStats.nonBgRatio})`
          );

          const hudWireframeText = (await page.locator("#cad-workbench .cad-hud-dwg-code").innerText()).trim();
          assert.match(hudWireframeText, /CAD-CH-16P\s*·\s*WIREFRAME/i);

          // Save required HD showcase screenshot 1: qa/zh-home-3d-wireframe-1440.png
          await page.screenshot({
            path: path.join(qaDir, "zh-home-3d-wireframe-1440.png"),
            fullPage: false,
          });

          // Trigger Exploded Assembly View (0% -> 100%)
          const explodeBtn = page.locator("#cad-workbench .cad-tool-btn").first();
          await explodeBtn.click();
          await page.waitForFunction(
            () => document.querySelector("#cad-workbench .cad-explode-pct")?.textContent?.trim() === "100%",
            { timeout: 5000 }
          );
          // Wait for smooth interpolation of all sub-meshes & gold leader lines to settle
          await page.waitForTimeout(850);

          const explodedStats = await analyzeCanvasScreenshot(page, homeCanvas);
          assert.ok(
            explodedStats.nonBgRatio >= 0.02,
            `Home 3D Exploded <canvas> appears blank (nonBgRatio=${explodedStats.nonBgRatio})`
          );
          assert.notEqual(
            explodedStats.signature,
            wireframeStats.signature,
            "Exploded view must visibly update 3D <canvas> geometry positions"
          );

          // Save required HD showcase screenshot 2: qa/zh-home-3d-exploded-1440.png
          await page.screenshot({
            path: path.join(qaDir, "zh-home-3d-exploded-1440.png"),
            fullPage: false,
          });

          // Collapse back and switch across X-Ray Cutaway & Studio Solid modes
          await explodeBtn.click();
          await page.waitForTimeout(550);

          const modeButtons = page.locator("#cad-workbench .cad-mode-btn");
          await modeButtons.nth(1).click(); // X-Ray
          await page.waitForFunction(
            () => (document.querySelector("#cad-workbench .cad-hud-dwg-code")?.textContent || "").includes("XRAY"),
            { timeout: 4000 }
          );
          await page.waitForTimeout(220);
          const xrayStats = await analyzeCanvasScreenshot(page, homeCanvas);
          assert.ok(xrayStats.nonBgRatio >= 0.02, "X-Ray 3D mode must render non-blank geometry");

          await modeButtons.nth(2).click(); // Solid
          await page.waitForFunction(
            () => (document.querySelector("#cad-workbench .cad-hud-dwg-code")?.textContent || "").includes("SOLID"),
            { timeout: 4000 }
          );
          await page.waitForTimeout(220);
          const solidStats = await analyzeCanvasScreenshot(page, homeCanvas);
          assert.ok(solidStats.nonBgRatio >= 0.03, "Studio Solid 3D mode must render shaded PBR surfaces");
          assert.notEqual(solidStats.signature, xrayStats.signature, "Solid mode must differ visually from X-Ray mode");

          await modeButtons.nth(0).click(); // Return to CAD Wireframe
          await page.waitForTimeout(180);

          // Switch Home 3D Category Tab to IP6K9K Sealed Heavy-Duty Connector
          const homeTabs = page.locator("#cad-workbench .cad-model-tab-btn");
          await homeTabs.nth(1).click();
          await page.waitForFunction(
            () => {
              const code = document.querySelector("#cad-workbench .cad-hud-dwg-code")?.textContent || "";
              const hiddenFallback = document.querySelector("#cad-workbench .cad-static-fallback.is-ready-hidden");
              return code.includes("CAD-HD-IP6K9K") && Boolean(hiddenFallback);
            },
            { timeout: 8000 }
          );
          await page.waitForTimeout(220);
          const heavyTabCanvasStats = await analyzeCanvasScreenshot(page, homeCanvas);
          assert.ok(heavyTabCanvasStats.nonBgRatio >= 0.02, "Switched IP6K9K GLB tab must render non-blank canvas");

          // --- Part 2: /zh/products Category Switching + Row "3D 检视" Link + "+ 加入 BOM 清单" ---
          await page.goto(`${baseURL}/zh/products`, { waitUntil: "networkidle" });
          await page
            .locator(".cad-workbench-sheet.is-catalog-mode .cad-static-fallback.is-ready-hidden")
            .waitFor({ state: "attached", timeout: 8000 });
          await page.waitForTimeout(250);

          const catalogCanvas = page.locator(".cad-workbench-sheet.is-catalog-mode .cad-canvas-mount canvas").first();
          const initialCatalogCanvas = await analyzeCanvasScreenshot(page, catalogCanvas);
          assert.ok(initialCatalogCanvas.nonBgRatio >= 0.02, "/zh/products 3D canvas must render non-blank");

          const initialLinkedMpn = (await page.locator(".cad-sku-mpn-heading").innerText()).trim();
          assert.ok(initialLinkedMpn.length >= 3, "Initial linked MPN heading must be populated");

          // Switch product category in sidebar -> Heavy-Duty & Sealed (index 2), verify 3D CAD updates to CAD-HD-IP6K9K
          const categoryButtons = page.locator(".sidebar-filter-group").nth(1).locator(".sidebar-filter-item");
          await categoryButtons.nth(2).click();
          await page.waitForFunction(
            () => {
              const dwg = document.querySelector(".cad-hud-dwg-code")?.textContent || "";
              const ready = document.querySelector(".cad-static-fallback.is-ready-hidden");
              return dwg.includes("CAD-HD-IP6K9K") && Boolean(ready);
            },
            { timeout: 8000 }
          );

          // Switch to Automotive Crimp Terminals (index 3) -> verify CAD-TM-MQS
          await categoryButtons.nth(3).click();
          await page.waitForFunction(
            () => {
              const dwg = document.querySelector(".cad-hud-dwg-code")?.textContent || "";
              const ready = document.querySelector(".cad-static-fallback.is-ready-hidden");
              return dwg.includes("CAD-TM-MQS") && Boolean(ready);
            },
            null,
            { timeout: 8000 }
          );

          // Switch to OEM Cross-Reference (index 6) -> verify CAD-OEM-XREF Pin-to-Pin tolerance view
          await categoryButtons.nth(6).click();
          await page.waitForFunction(
            () => (document.querySelector(".cad-hud-dwg-code")?.textContent || "").includes("CAD-OEM-XREF"),
            { timeout: 8000 }
          );

          // Switch back to All Categories (index 0) and click "3D 检视" on 2nd row SKU
          await categoryButtons.nth(0).click();
          await page.waitForFunction(
            () => Boolean(document.querySelector(".cad-static-fallback.is-ready-hidden")),
            { timeout: 8000 }
          );
          await page.waitForTimeout(250);

          const secondRow = page.locator("table.spec-table tbody tr").nth(1);
          const secondRowMpn = (await secondRow.locator(".spec-mpn-primary").first().innerText()).trim();
          const secondRowInspectBtn = secondRow.locator(".inspect-3d-btn");
          await secondRowInspectBtn.click();
          await page.waitForFunction(
            (expectedMpn) => document.querySelector(".cad-sku-mpn-heading")?.textContent?.trim() === expectedMpn,
            secondRowMpn,
            { timeout: 5000 }
          );
          await page.waitForTimeout(300);

          const pressedState = await secondRowInspectBtn.getAttribute("aria-pressed");
          assert.equal(pressedState, "true", "Clicked row '3D 检视' button must become aria-pressed='true'");

          // Click "+ 加入 BOM 清单" inside the 3D linked SKU inspector panel
          const linkedAddBomBtn = page.locator(".cad-linked-sku-panel .cad-sku-actions-row button.btn-primary").first();
          await linkedAddBomBtn.click();
          await page.waitForTimeout(220);
          const linkedAddBomText = (await linkedAddBomBtn.innerText()).trim();
          assert.match(linkedAddBomText, /已加入|Added/i, "3D inspector '+ 加入 BOM 清单' must toggle to added state");

          // Align viewport so both the 3D Linked Inspector AND the active highlighted table rows are framed cleanly
          await page.setViewportSize({ width: 1440, height: 1060 });
          await page.evaluate(() => {
            const sheet = document.querySelector(".cad-workbench-sheet.is-catalog-mode");
            if (sheet) {
              const top = sheet.getBoundingClientRect().top + window.scrollY - 76;
              window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
            }
          });
          await page.waitForTimeout(320);

          // Save required HD showcase screenshot 3: qa/zh-products-3d-linked-1440.png
          await page.screenshot({
            path: path.join(qaDir, "zh-products-3d-linked-1440.png"),
            fullPage: false,
          });

          // --- Part 3: Verify /en & /en/products English 3D CAD Stages ---
          for (const enPath of ["/en", "/en/products"]) {
            await page.goto(`${baseURL}${enPath}`, { waitUntil: "networkidle" });
            await page
              .locator(".cad-static-fallback.is-ready-hidden")
              .first()
              .waitFor({ state: "attached", timeout: 8000 });
            const enCanvas = page.locator(".cad-canvas-mount canvas").first();
            const enStats = await analyzeCanvasScreenshot(page, enCanvas);
            assert.ok(enStats.nonBgRatio >= 0.02, `${enPath} 3D WebGL canvas must render non-blank`);
          }

          assert.deepEqual(runtimeErrors, [], `3D CAD flow runtime errors: ${runtimeErrors.join(" | ")}`);
          assert.deepEqual(failedAssets, [], `3D CAD flow failed assets: ${failedAssets.join(", ")}`);

          await page.setViewportSize({ width: 1440, height: 900 });

          interactionChecks.threeCadWorkbenchFlow = {
            passed: true,
            wireframeCanvas: wireframeStats,
            explodedCanvas: explodedStats,
            xrayCanvas: xrayStats,
            solidCanvas: solidStats,
            heavyTabCanvas: heavyTabCanvasStats,
            catalogInitialMpn: initialLinkedMpn,
            catalogInspectedSecondRowMpn: secondRowMpn,
            addedToBomFrom3dPanel: true,
            englishPagesVerified: ["/en", "/en/products"],
            showcaseScreenshots: [
              "qa/zh-home-3d-wireframe-1440.png",
              "qa/zh-home-3d-exploded-1440.png",
              "qa/zh-products-3d-linked-1440.png",
            ],
            consoleErrorCount: runtimeErrors.length,
          };
        } catch (err) {
          interactionChecks.threeCadWorkbenchFlow = { passed: false, error: err.message };
          failures.push(`[Three.js 3D CAD Flow] ${err.message}`);
        }
      }

      await context.close();
    }

    // =========================================================================
    // 4. Crawler Mode (javaScriptEnabled: false) 100% Content Visibility Check
    // =========================================================================
    const noJsContext = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
    });
    const staticPage = await noJsContext.newPage();

    for (const locale of locales) {
      for (const route of ["home", ...routeKeys]) {
        const routePath = routeHref(locale, route);
        const res = await staticPage.goto(`${baseURL}${routePath}`, { waitUntil: "domcontentloaded" });

        const staticState = await staticPage.evaluate((currentRoute) => {
          const main = document.querySelector("main");
          const mainRect = main ? main.getBoundingClientRect() : { height: 0 };
          const bodyText = document.body.innerText || "";
          const visibleBrandImgs = [...document.images].filter(
            (img) =>
              (img.getAttribute("src") || "").includes("/assets/brands/") &&
              img.getBoundingClientRect().width > 0
          ).length;
          const visibleTableRows = [...document.querySelectorAll("main table tbody tr")].filter(
            (tr) => tr.getBoundingClientRect().height > 0
          ).length;
          const faqVisibleCount = [...document.querySelectorAll("details, [class*='faq']")].filter(
            (el) => el.getBoundingClientRect().height > 0
          ).length;
          // Ensure <details> answers are visible if <details> is used without JS
          const closedDetailsCount = [...document.querySelectorAll("main details:not([open])")].length;
          const cadFallbackImg = document.querySelector(".cad-static-fallback img");
          const cadFallbackVisible = cadFallbackImg
            ? cadFallbackImg.getBoundingClientRect().width > 80 && cadFallbackImg.getBoundingClientRect().height > 50
            : false;

          return {
            h1Count: document.querySelectorAll("h1").length,
            h1Visible: (document.querySelector("h1")?.getBoundingClientRect().height ?? 0) > 0,
            mainHeight: mainRect.height,
            bodyTextLength: bodyText.trim().length,
            hasVerifiedPhone: bodyText.includes("021-64778688"),
            visibleBrandImgs,
            visibleTableRows,
            faqVisibleCount,
            closedDetailsCount,
            cadFallbackVisible,
            route: currentRoute,
          };
        }, route);

        noJsChecks.push({ path: routePath, status: res?.status() ?? 0, ...staticState });

        try {
          assert.equal(res?.status(), 200, `[No-JS ${routePath}] Expected 200`);
          assert.equal(staticState.h1Count, 1, `[No-JS ${routePath}] Expected 1 <h1>`);
          assert.equal(staticState.h1Visible, true, `[No-JS ${routePath}] <h1> is not visible without JS`);
          assert.ok(staticState.mainHeight > 200, `[No-JS ${routePath}] <main> height too small (${staticState.mainHeight})`);
          assert.ok(staticState.bodyTextLength > 250, `[No-JS ${routePath}] Visible text too short without JS`);
          assert.equal(staticState.hasVerifiedPhone, true, `[No-JS ${routePath}] Verified phone 021-64778688 not visible`);

          if (route === "home" || route === "products") {
            assert.equal(
              staticState.cadFallbackVisible,
              true,
              `[No-JS ${routePath}] 3D CAD workbench static fallback blueprint image must be visible without JS`
            );
          }
          if (route === "home") {
            assert.ok(
              staticState.visibleBrandImgs >= 17,
              `[No-JS ${routePath}] All 17 partner brand SVGs must be visible without JS, got ${staticState.visibleBrandImgs}`
            );
          }
          if (route === "products") {
            assert.ok(
              staticState.visibleTableRows >= 10,
              `[No-JS ${routePath}] Spec table must render visible SKU rows without JS, got ${staticState.visibleTableRows}`
            );
          }
          if (route === "solutions") {
            assert.ok(
              staticState.visibleTableRows >= 4,
              `[No-JS ${routePath}] Solutions comparison table must be visible without JS, got ${staticState.visibleTableRows} rows`
            );
          }
          if (route === "solutions" || route === "quality") {
            assert.equal(
              staticState.closedDetailsCount,
              0,
              `[No-JS ${routePath}] Found ${staticState.closedDetailsCount} collapsed <details> without [open] hiding FAQ answers in No-JS mode`
            );
          }
        } catch (err) {
          failures.push(err.message);
        }
      }
    }

    await noJsContext.close();
  } finally {
    await browser.close();
    if (localServer) {
      await new Promise((resolve) => localServer.server.close(resolve));
    }
  }

  const summary = {
    checkedAt: new Date().toISOString(),
    browserExecutable: executable,
    baseURL,
    totalViewportPageChecks: viewportMatrix.length,
    totalNoJsPageChecks: noJsChecks.length,
    interactionChecks,
    failureCount: failures.length,
    failures,
    viewportMatrix,
    noJsChecks,
  };

  await writeFile(path.join(qaDir, "verification-results.json"), JSON.stringify(summary, null, 2), "utf8");

  console.log(
    `[QA Browser Verifier] Engine=${executable} | ViewportChecks=${viewportMatrix.length} | NoJSChecks=${noJsChecks.length} | Failures=${failures.length}`
  );
  if (failures.length > 0) {
    console.error("QA Browser Verification Failures:\n" + failures.map((f) => `  - ${f}`).join("\n"));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Fatal error in verify-browser.mjs:", err);
  process.exitCode = 1;
});
