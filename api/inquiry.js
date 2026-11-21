const limits = {
  name: 80,
  contact: 140,
  company: 140,
  bomText: 8000,
  message: 3000,
  source: 200,
};

const validCustomerTypes = new Set(["oem", "harness", "distributor", "manufacturer", "other"]);
const validInquiryTypes = new Set(["spot", "bom", "cross_ref", "engineering", "datasheet", "other"]);

const clean = (value, max) => String(value ?? "").trim().slice(0, max);

const escapeHtml = (value) =>
  clean(value, 10000)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function parseBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  const raw = String(request.body ?? "");
  if (!raw) return {};
  const contentType = String(request.headers?.["content-type"] || "");
  if (contentType.includes("application/json") || raw.trim().startsWith("{")) {
    return JSON.parse(raw);
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

function reply(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(payload));
}

function sameOrigin(request) {
  const origin = request.headers?.origin;
  const host = request.headers?.["x-forwarded-host"] || request.headers?.host;
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function normalizeBomItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .slice(0, 100)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const mpn = clean(item.mpn, 80);
      if (!mpn) return null;
      const qtyNum = Number.parseInt(String(item.qty ?? 1), 10);
      return {
        mpn,
        brand: clean(item.brand || item.brandName || "", 60),
        qty: Number.isFinite(qtyNum) && qtyNum > 0 ? Math.min(qtyNum, 10_000_000) : 1,
      };
    })
    .filter(Boolean);
}

async function deliverWithWebhook(inquiry) {
  const endpoint = new URL(process.env.CONTACT_WEBHOOK_URL);
  if (endpoint.protocol !== "https:") throw new Error("webhook_must_use_https");
  const headers = { "Content-Type": "application/json" };
  if (process.env.CONTACT_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${process.env.CONTACT_WEBHOOK_TOKEN}`;
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      event: "oulink.inquiry",
      submittedAt: new Date().toISOString(),
      inquiry,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("webhook_failed");
}

async function deliverWithEmail(inquiry) {
  const subject = `[Ou-Link BOM RFQ] ${inquiry.inquiryType} / ${inquiry.company || inquiry.name}`;
  const bomFormatted = inquiry.bomItems.length
    ? inquiry.bomItems.map((item) => `${item.mpn} | ${item.brand || "-"} | ${item.qty} PCS`).join("\n")
    : "—";
  const rows = [
    ["Name", inquiry.name],
    ["Company", inquiry.company || "—"],
    ["Contact", inquiry.contact],
    ["Customer Type", inquiry.customerType],
    ["Inquiry Type", inquiry.inquiryType],
    ["Selected BOM Items", bomFormatted],
    ["Pasted BOM List", inquiry.bomText || "—"],
    ["Notes / Message", inquiry.message || "—"],
    ["Locale", inquiry.locale],
  ]
    .map(([label, val]) => `<p><strong>${label}</strong><br>${escapeHtml(val).replaceAll("\n", "<br>")}</p>`)
    .join("");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL,
      to: [process.env.CONTACT_TO_EMAIL],
      subject,
      html: `<h1>New Automotive Connector RFQ</h1>${rows}`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("email_failed");
}

export default async function inquiryHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return reply(response, 405, { ok: false, code: "method_not_allowed" });
  }

  if (!sameOrigin(request)) {
    return reply(response, 403, { ok: false, code: "origin_rejected" });
  }

  const contentLength = Number(request.headers?.["content-length"] || 0);
  const rawStringLen = typeof request.body === "string" ? Buffer.byteLength(request.body, "utf8") : 0;
  if (contentLength > 32_768 || rawStringLen > 32_768) {
    return reply(response, 413, { ok: false, code: "payload_too_large" });
  }

  let body;
  try {
    body = parseBody(request);
  } catch {
    return reply(response, 400, { ok: false, code: "invalid_body" });
  }

  // Honeypot field for bot filtering
  if (clean(body.website, 200)) {
    return reply(response, 200, { ok: true });
  }

  const bomItems = normalizeBomItems(body.bomItems);
  const bomText = clean(body.bomText ?? body.partNumbers ?? "", limits.bomText);
  const message = clean(body.message ?? body.notes ?? "", limits.message);

  const inquiry = {
    name: clean(body.name, limits.name),
    contact: clean(body.contact ?? body.email ?? body.phone, limits.contact),
    company: clean(body.company ?? body.organization, limits.company),
    customerType: validCustomerTypes.has(body.customerType) ? body.customerType : "other",
    inquiryType: validInquiryTypes.has(body.inquiryType ?? body.topic) ? (body.inquiryType ?? body.topic) : "bom",
    bomItems,
    bomText,
    message,
    locale: body.locale === "en" ? "en" : "zh",
    source: clean(body.source, limits.source),
  };

  const consent = body.consent === true || body.consent === "true" || body.consent === "on";
  const hasSubstantiveContent = bomItems.length > 0 || bomText.length >= 3 || message.length >= 5;

  if (!inquiry.name || inquiry.contact.length < 5 || !hasSubstantiveContent || !consent) {
    return reply(response, 400, { ok: false, code: "validation_failed" });
  }

  try {
    if (process.env.CONTACT_WEBHOOK_URL) {
      await deliverWithWebhook(inquiry);
    } else if (
      process.env.RESEND_API_KEY &&
      process.env.CONTACT_TO_EMAIL &&
      process.env.CONTACT_FROM_EMAIL
    ) {
      await deliverWithEmail(inquiry);
    } else {
      return reply(response, 503, {
        ok: false,
        code: "receiver_unavailable",
        fallback: {
          phone: "021-64778688",
          salesPhone: "021-64809788",
          email: "service@ou-link.com",
        },
      });
    }
    return reply(response, 200, { ok: true });
  } catch {
    return reply(response, 502, { ok: false, code: "delivery_failed" });
  }
}
