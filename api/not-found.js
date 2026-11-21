import { siteContent } from "../src/content/siteContent.js";
import { routeHref, routeKeys } from "../src/routing.js";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

// Rewrites run only after Vercel's static filesystem lookup has missed.
// Returns a genuine HTTP 404 in Official Ou-Link Precision VI styling with zero external JS dependency.
export default function notFound(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    response.statusCode = 405;
    response.end();
    return;
  }

  const query = new URL(request.url || "/", "https://localhost").searchParams;
  const locale = (request.query?.locale ?? query.get("locale")) === "en" ? "en" : "zh";
  const content = siteContent[locale];
  const brand = siteContent.brand;
  const contact = siteContent.contact;
  const otherLocale = locale === "zh" ? "en" : "zh";

  const link = (href, label, cls = "") =>
    `<a${cls ? ` class="${cls}"` : ""} href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;

  const navigation = routeKeys
    .map((key) => link(routeHref(locale, key), content.nav[key]))
    .join("");

  response.statusCode = 404;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Content-Language", locale === "zh" ? "zh-CN" : "en");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Cache-Control", "public, max-age=0, must-revalidate");

  const html = `<!doctype html>
<html lang="${locale === "zh" ? "zh-CN" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(content.notFound.title)} — ${escapeHtml(locale === "zh" ? brand.fullNameZh : brand.fullNameEn)}</title>
<style>
:root{color-scheme:light;font-family:"Plus Jakarta Sans","PingFang SC","Microsoft YaHei UI",sans-serif;color:#092143;background:#EFF3F7}
*{box-sizing:border-box}
body{margin:0;background:#EFF3F7;background-image:linear-gradient(rgba(9,33,67,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(9,33,67,.03) 1px,transparent 1px);background-size:24px 24px}
a{color:inherit;text-decoration:none;display:inline-flex;align-items:center;min-height:44px}
a:focus-visible{outline:2px solid #FE6A08;outline-offset:3px}
header{background:#FFFFFF;padding:12px 5%;border-bottom:1px solid #DCE4EE;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
.brand-link img{height:38px;width:auto;display:block}
nav{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;font-weight:600;color:#092143}
nav a:hover{color:#02B0EE}
main{max-width:960px;margin:0 auto;padding:clamp(48px,10vh,112px) 5%;min-height:68svh}
.card{background:#FFFFFF;border:1px solid #DCE4EE;border-top:4px solid #FE6A08;border-radius:10px;padding:clamp(24px,5vw,48px);box-shadow:0 8px 24px rgba(9,33,67,.05)}
.code{font-family:"JetBrains Mono","Consolas",monospace;font-size:13px;font-weight:700;letter-spacing:.08em;color:#FE6A08;background:rgba(254,106,8,.1);padding:4px 10px;border-radius:4px;display:inline-block;margin-bottom:16px}
h1{font-size:clamp(26px,4.5vw,42px);line-height:1.22;margin:0 0 16px;color:#092143}
p{color:#617282;font-size:16px;line-height:1.65;margin:0 0 28px}
.actions{display:flex;gap:14px;flex-wrap:wrap}
.btn-primary{background:#FE6A08;color:#FFFFFF;padding:0 20px;border-radius:6px;font-weight:600}
.btn-secondary{background:#EFF3F7;color:#092143;border:1px solid #B8C9DC;padding:0 20px;border-radius:6px;font-weight:600}
footer{background:#092143;color:#F7FAFC;padding:28px 5%;font-size:13px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
.skip{position:absolute;top:0;left:5%;background:#FE6A08;color:#FFFFFF;padding:10px 16px;transform:translateY(-120%);z-index:20}
.skip:focus{transform:none}
</style>
</head>
<body>
<a class="skip" href="#main">${escapeHtml(content.accessibility.skip)}</a>
<header>
  <a class="brand-link" href="${escapeHtml(routeHref(locale, "home"))}">
    <img src="${escapeHtml(brand.logoPrimary)}" alt="${escapeHtml(locale === "zh" ? brand.fullNameZh : brand.fullNameEn)}" width="133" height="40">
  </a>
  <nav aria-label="${escapeHtml(content.accessibility.navigation)}">
    ${navigation}
    ${link(routeHref(otherLocale, "home"), content.localeLabel)}
  </nav>
</header>
<main id="main" data-route="notFound" tabindex="-1">
  <div class="card">
    <span class="code">HTTP 404 · ROUTE NOT FOUND</span>
    <h1>${escapeHtml(content.notFound.title)}</h1>
    <p>${escapeHtml(content.notFound.description)}</p>
    <div class="actions">
      ${link(routeHref(locale, "products"), content.notFound.catalogAction, "btn-primary")}
      ${link(routeHref(locale, "home"), content.notFound.action, "btn-secondary")}
    </div>
  </div>
</main>
<footer>
  <span>${escapeHtml(locale === "zh" ? brand.fullNameZh : brand.fullNameEn)}</span>
  <span>Tel: ${escapeHtml(contact.phone)} / ${escapeHtml(contact.salesPhone)} · ${escapeHtml(contact.email)}</span>
</footer>
</body>
</html>`;

  response.end(request.method === "HEAD" ? undefined : html);
}
