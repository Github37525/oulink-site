import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import notFoundHandler from "../api/not-found.js";
import { routeHref, routeKeys } from "../src/routing.js";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

async function invokeNotFound(locale, method = "GET") {
  const headers = {};
  let body;
  const response = {
    statusCode: 200,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    end(value) {
      body = value;
    },
  };
  await notFoundHandler(
    {
      url: `/api/not-found?locale=${locale}`,
      query: { locale },
      method,
      headers: { host: "www.ou-link.com" },
    },
    response
  );
  return { status: response.statusCode, headers, body };
}

for (const locale of ["zh", "en"]) {
  test(`${locale} /api/not-found returns real HTTP 404, Official VI styling, static navigation, and zero external JS`, async () => {
    const expectedLang = locale === "zh" ? "zh-CN" : "en";
    const result = await invokeNotFound(locale, "GET");

    assert.equal(result.status, 404, `Expected status 404 for locale=${locale}`);
    assert.equal(result.headers["content-language"], expectedLang);
    assert.match(result.headers["content-type"] || "", /text\/html/i);
    assert.ok(typeof result.body === "string" && result.body.length > 100, "Expected non-empty HTML body on GET");

    assert.match(result.body, new RegExp(`<html[^>]*\\blang=["']${expectedLang}["']`, "i"));
    assert.match(result.body, /noindex,\s*nofollow/i, "404 response must declare noindex, nofollow");
    assert.doesNotMatch(result.body, /rel=["']canonical["']/i, "404 response must NOT output a canonical tag");
    assert.doesNotMatch(result.body, /<script\b/i, "Serverless 404 response must be zero-JS");

    // Official VI palette presence (#EFF3F7 / #092143) and zero legacy dark #080808
    assert.match(result.body, /#eff3f7|#092143/i, "404 inline styles must use Official VI palette (#EFF3F7 / #092143)");
    assert.doesNotMatch(result.body, /#080808/i, "404 must not copy aifde-site #080808 dark background");

    // Static navigation links back to valid routes
    assert.ok(result.body.includes(`href="${routeHref(locale, "home")}"`), `Missing home link for ${locale}`);
    for (const key of routeKeys) {
      assert.ok(
        result.body.includes(`href="${routeHref(locale, key)}"`),
        `Missing navigation link ${routeHref(locale, key)} on ${locale} 404 response`
      );
    }
  });

  test(`${locale} /api/not-found HEAD request returns HTTP 404 and language headers with empty body`, async () => {
    const expectedLang = locale === "zh" ? "zh-CN" : "en";
    const result = await invokeNotFound(locale, "HEAD");

    assert.equal(result.status, 404);
    assert.equal(result.headers["content-language"], expectedLang);
    assert.ok(
      result.body === undefined || result.body === "",
      `HEAD response must have no body, got: ${JSON.stringify(result.body)}`
    );
  });
}

test("vercel.json enforces cleanUrls, dist/client output, localized 404 rewrites, and UTF-8 GEO headers", async () => {
  const rawConfig = await readFile(path.join(rootDir, "vercel.json"), "utf8");
  const config = JSON.parse(rawConfig);

  assert.equal(config.cleanUrls, true);
  assert.equal(config.trailingSlash, false);
  assert.equal(config.buildCommand, "npm run build");
  assert.equal(config.outputDirectory, "dist/client");

  assert.ok(Array.isArray(config.rewrites), "vercel.json must define rewrites");
  assert.ok(
    config.rewrites.some((r) => r.source === "/en/:path*" && r.destination === "/api/not-found?locale=en"),
    "vercel.json must rewrite /en/:path* to /api/not-found?locale=en"
  );
  assert.ok(
    config.rewrites.some((r) => r.source === "/:path*" && r.destination === "/api/not-found?locale=zh"),
    "vercel.json must rewrite /:path* to /api/not-found?locale=zh"
  );

  const allHeaderEntries = (config.headers || []).flatMap((rule) =>
    (rule.headers || []).map((h) => ({ source: rule.source, key: h.key.toLowerCase(), value: h.value }))
  );
  assert.ok(
    allHeaderEntries.some((h) => h.key === "x-content-type-options" && h.value === "nosniff"),
    "vercel.json must set X-Content-Type-Options: nosniff"
  );
  assert.ok(
    allHeaderEntries.some(
      (h) => h.source.includes("llms") && h.key === "content-type" && /charset=utf-8/i.test(h.value)
    ),
    "vercel.json must declare UTF-8 charset header for llms.txt / llms-full.txt"
  );
  assert.ok(
    allHeaderEntries.some(
      (h) =>
        h.source === "/assets/models/(.*)\\.glb" &&
        h.key === "content-type" &&
        h.value === "model/gltf-binary"
    ),
    "vercel.json must declare Content-Type: model/gltf-binary for /assets/models/(.*)\\.glb"
  );
});
